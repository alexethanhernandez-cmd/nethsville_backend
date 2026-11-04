from django.core import signing
from django.test import TestCase, override_settings

from core.models import Guardian, PickupLog, Student
from core.services import qr


@override_settings(ANTHROPIC_API_KEY='')
class AiSummaryTests(TestCase):
    def setUp(self):
        self.student = Student.objects.create(name='Juan Dela Cruz', grade_section='K1')

    def test_requires_observations(self):
        r = self.client.post(f'/api/students/{self.student.id}/summary/generate/', content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_offline_fallback_is_labeled_and_needs_approval(self):
        self.client.post(f'/api/students/{self.student.id}/observations/', {'note': 'Reads well.'}, content_type='application/json')
        self.client.post(f'/api/students/{self.student.id}/observations/', {'note': 'Needs encouragement to share.'}, content_type='application/json')
        r = self.client.post(f'/api/students/{self.student.id}/summary/generate/', {}, content_type='application/json')
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body['source'], 'offline')  # hindi AI, naka-label
        self.assertEqual(body['status'], 'draft')
        self.assertIn('Juan', body['draft_text'])
        self.assertNotIn('Dela Cruz', body['draft_text'])  # first name lang

        # Hindi pa makikita ng parent
        parent = self.client.get(f'/api/students/{self.student.id}/parent-view/').json()
        self.assertEqual(parent['summaries'], [])

        # Approve (may edit)
        a = self.client.post(f'/api/summaries/{body["id"]}/approve/', {'final_text': 'Edited by teacher.'}, content_type='application/json')
        self.assertEqual(a.json()['status'], 'approved')
        parent = self.client.get(f'/api/students/{self.student.id}/parent-view/').json()
        self.assertEqual(parent['summaries'][0]['final_text'], 'Edited by teacher.')


class QrTests(TestCase):
    def setUp(self):
        self.student = Student.objects.create(name='Juan Dela Cruz', grade_section='K1')
        self.guardian = Guardian.objects.create(student=self.student, name='Rosa', relationship='Mother')

    def _verify(self, token):
        return self.client.post('/api/pickup/verify/', {'token': token}, content_type='application/json')

    def test_valid_qr_verified_and_logged(self):
        r = self._verify(qr.make_token(self.guardian))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['result'], 'verified')
        self.assertEqual(PickupLog.objects.filter(result='verified').count(), 1)

    def test_fake_token_denied(self):
        r = self._verify('hindi-totoong-token')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['reason'], 'QR not recognized')
        self.assertEqual(PickupLog.objects.filter(result='denied').count(), 1)

    def test_tampered_token_denied(self):
        forged = signing.dumps({'g': self.guardian.pk, 'n': self.guardian.qr_nonce}, salt='iba-ang-salt')
        self.assertEqual(self._verify(forged).status_code, 403)

    def test_revoked_qr_denied(self):
        token = qr.make_token(self.guardian)
        self.client.post(f'/api/guardians/{self.guardian.id}/revoke-qr/')
        r = self._verify(token)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['reason'], 'QR was revoked or replaced')
        # ang bagong QR ay valid
        self.guardian.refresh_from_db()
        self.assertEqual(self._verify(qr.make_token(self.guardian)).status_code, 200)

    def test_deactivated_guardian_denied(self):
        token = qr.make_token(self.guardian)
        self.guardian.is_active = False
        self.guardian.save()
        r = self._verify(token)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['reason'], 'Guardian is deactivated')

    @override_settings(QR_MAX_AGE_SECONDS=-1)
    def test_expired_qr_denied(self):
        r = self._verify(qr.make_token(self.guardian))
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['reason'], 'QR expired')

    def test_qr_png_endpoint(self):
        r = self.client.get(f'/api/guardians/{self.guardian.id}/qr.png')
        self.assertEqual(r['Content-Type'], 'image/png')
        self.assertTrue(r.content.startswith(b'\x89PNG'))


class CorsTests(TestCase):
    def test_live_server_origin_allowed(self):
        r = self.client.get('/api/students/', headers={'Origin': 'http://127.0.0.1:5500'})
        self.assertEqual(r['Access-Control-Allow-Origin'], 'http://127.0.0.1:5500')

    def test_other_origin_not_allowed(self):
        r = self.client.get('/api/students/', headers={'Origin': 'http://evil.example'})
        self.assertNotIn('Access-Control-Allow-Origin', r)
