import json

from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from core.models import Guardian, Observation, PickupLog, ProgressSummary, Student
from core.services import ai_summary, qr

# NOTE (demo): walang login/auth pa at csrf_exempt ang POST endpoints.
# Idadagdag ang authentication sa susunod na phase (Progress 1).


def _body(request):
    try:
        return json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return {}


def _summary_json(s):
    return {
        'id': s.id,
        'student_id': s.student_id,
        'draft_text': s.draft_text,
        'final_text': s.final_text,
        'status': s.status,
        'source': s.source,
        'source_label': s.get_source_display(),
        'model': s.model_name,
        'created_at': s.created_at.isoformat(),
        'approved_at': s.approved_at.isoformat() if s.approved_at else None,
    }


def _log_json(log):
    return {
        'id': log.id,
        'student': log.student.name if log.student else None,
        'guardian': log.guardian.name if log.guardian else None,
        'result': log.result,
        'reason': log.reason,
        'scanned_at': log.scanned_at.isoformat(),
    }


# ---------- Pages ----------
def index(request):
    return render(request, 'core/index.html')


def demo_summary(request):
    return render(request, 'core/summary.html')


def demo_kiosk(request):
    return render(request, 'core/kiosk.html')


# ---------- Students / observations ----------
@require_GET
def students(request):
    data = [{'id': s.id, 'name': s.name, 'grade_section': s.grade_section} for s in Student.objects.all()]
    return JsonResponse({'students': data})


@csrf_exempt
def observations(request, student_id):
    student = get_object_or_404(Student, pk=student_id)
    if request.method == 'POST':
        note = (_body(request).get('note') or '').strip()
        if not note:
            return JsonResponse({'error': 'Walang laman ang observation.'}, status=400)
        obs = Observation.objects.create(student=student, note=note)
        return JsonResponse({'id': obs.id, 'note': obs.note, 'created_at': obs.created_at.isoformat()}, status=201)
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    items = [{'id': o.id, 'note': o.note, 'created_at': o.created_at.isoformat()} for o in student.observations.all()]
    return JsonResponse({'observations': items})


# ---------- AI progress summary ----------
@csrf_exempt
@require_POST
def generate_summary(request, student_id):
    student = get_object_or_404(Student, pk=student_id)
    lang = 'tl' if _body(request).get('lang') == 'tl' else 'en'
    notes = [o.note for o in student.observations.all()[:10]]
    notes.reverse()  # pinakaluma muna
    if not notes:
        return JsonResponse({'error': 'Walang observations. Magdagdag muna ng observation.'}, status=400)
    result = ai_summary.generate(student, notes, lang)
    summary = ProgressSummary.objects.create(
        student=student,
        draft_text=result['text'],
        source=result['source'],
        model_name=result['model'],
    )
    data = _summary_json(summary)
    data['warning'] = result['warning']
    return JsonResponse(data, status=201)


@require_GET
def student_summaries(request, student_id):
    student = get_object_or_404(Student, pk=student_id)
    return JsonResponse({'summaries': [_summary_json(s) for s in student.summaries.all()]})


@csrf_exempt
@require_POST
def approve_summary(request, summary_id):
    """Teacher approval: walang napapadala sa parent hangga't hindi ito na-approve."""
    summary = get_object_or_404(ProgressSummary, pk=summary_id)
    edited = (_body(request).get('final_text') or '').strip()
    summary.final_text = edited or summary.draft_text
    summary.status = 'approved'
    summary.approved_at = timezone.now()
    summary.save()
    return JsonResponse(_summary_json(summary))


@require_GET
def parent_view(request, student_id):
    """Ang makikita ng parent: approved summaries LANG."""
    student = get_object_or_404(Student, pk=student_id)
    approved = student.summaries.filter(status='approved')
    return JsonResponse({'student': student.name, 'summaries': [_summary_json(s) for s in approved]})


# ---------- QR guardian pickup ----------
@require_GET
def guardians(request):
    data = [
        {
            'id': g.id, 'name': g.name, 'relationship': g.relationship,
            'student': g.student.name, 'is_active': g.is_active,
            'qr_url': f'/api/guardians/{g.id}/qr.png',
        }
        for g in Guardian.objects.select_related('student')
    ]
    return JsonResponse({'guardians': data})


@require_GET
def guardian_qr(request, guardian_id):
    guardian = get_object_or_404(Guardian, pk=guardian_id)
    return HttpResponse(qr.make_qr_png(guardian), content_type='image/png')


@csrf_exempt
@require_POST
def revoke_qr(request, guardian_id):
    guardian = get_object_or_404(Guardian, pk=guardian_id)
    guardian.rotate_qr()
    return JsonResponse({'ok': True, 'message': 'Invalid na ang lumang QR. Mag-generate ng bago.'})


@csrf_exempt
@require_POST
def verify_pickup(request):
    token = (_body(request).get('token') or '').strip()
    guardian, reason = qr.verify_token(token)
    if reason is None:
        PickupLog.objects.create(student=guardian.student, guardian=guardian, result='verified')
        return JsonResponse({
            'result': 'verified',
            'guardian': {'name': guardian.name, 'relationship': guardian.relationship},
            'student': {'name': guardian.student.name, 'grade_section': guardian.student.grade_section},
            'scanned_at': timezone.now().isoformat(),
        })
    PickupLog.objects.create(
        student=guardian.student if guardian else None,
        guardian=guardian,
        result='denied',
        reason=reason,
    )
    return JsonResponse({'result': 'denied', 'reason': reason}, status=403)


@require_GET
def pickup_log(request):
    logs = PickupLog.objects.select_related('student', 'guardian')[:20]
    return JsonResponse({'log': [_log_json(l) for l in logs]})
