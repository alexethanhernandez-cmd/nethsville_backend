"""QR guardian verification.

Ang laman ng QR ay isang **signed token** (hindi basta ID). Hindi ito mapepeke
nang walang SECRET_KEY, may expiry, at pwedeng i-revoke sa pamamagitan ng
pag-rotate ng nonce ng guardian.
"""
import io

import qrcode
from django.conf import settings
from django.core import signing

from core.models import Guardian


def make_token(guardian):
    return signing.dumps({'g': guardian.pk, 'n': guardian.qr_nonce}, salt=settings.QR_SIGNING_SALT)


def make_qr_png(guardian):
    img = qrcode.make(make_token(guardian), box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def verify_token(token):
    """Returns (guardian, None) kung valid, o (guardian_or_None, reason) kung denied."""
    try:
        data = signing.loads(token, salt=settings.QR_SIGNING_SALT, max_age=settings.QR_MAX_AGE_SECONDS)
    except signing.SignatureExpired:
        return None, 'QR expired'
    except signing.BadSignature:
        return None, 'QR not recognized'
    try:
        guardian = Guardian.objects.select_related('student').get(pk=data.get('g'))
    except Guardian.DoesNotExist:
        return None, 'Guardian not found'
    if not guardian.is_active:
        return guardian, 'Guardian is deactivated'
    if guardian.qr_nonce != data.get('n'):
        return guardian, 'QR was revoked or replaced'
    return guardian, None
