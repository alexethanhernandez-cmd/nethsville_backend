import secrets

from django.db import models
from django.utils import timezone


def new_nonce():
    return secrets.token_hex(8)


class Student(models.Model):
    name = models.CharField(max_length=100)
    grade_section = models.CharField(max_length=60)

    def __str__(self):
        return self.name

    @property
    def first_name(self):
        return self.name.split()[0]


class Guardian(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='guardians')
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    # Kapag pinalitan ito, invalid na ang lumang QR (para sa nawala o ninakaw na QR)
    qr_nonce = models.CharField(max_length=32, default=new_nonce)

    def __str__(self):
        return f'{self.name} ({self.relationship}) - {self.student.name}'

    def rotate_qr(self):
        self.qr_nonce = new_nonce()
        self.save(update_fields=['qr_nonce'])


class Observation(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='observations')
    note = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.name}: {self.note[:40]}'


class ProgressSummary(models.Model):
    STATUS = [('draft', 'Draft'), ('approved', 'Approved')]
    SOURCE = [('anthropic', 'AI (Anthropic)'), ('offline', 'Offline rule-based (no AI)')]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='summaries')
    draft_text = models.TextField()
    final_text = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=SOURCE)
    model_name = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default='draft')
    created_at = models.DateTimeField(default=timezone.now)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class PickupLog(models.Model):
    RESULT = [('verified', 'Verified'), ('denied', 'Denied')]

    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    guardian = models.ForeignKey(Guardian, null=True, blank=True, on_delete=models.SET_NULL)
    result = models.CharField(max_length=10, choices=RESULT)
    reason = models.CharField(max_length=120, blank=True)
    scanned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-scanned_at']
