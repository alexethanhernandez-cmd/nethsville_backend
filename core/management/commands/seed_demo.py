from django.core.management.base import BaseCommand

from core.models import Guardian, Observation, PickupLog, ProgressSummary, Student


class Command(BaseCommand):
    help = 'Gumagawa ng sample na estudyante, guardians, at observations para sa demo.'

    def handle(self, *args, **options):
        PickupLog.objects.all().delete()
        ProgressSummary.objects.all().delete()
        Observation.objects.all().delete()
        Guardian.objects.all().delete()
        Student.objects.all().delete()

        juan = Student.objects.create(name='Juan Dela Cruz', grade_section='Kinder 1 - Masaya')
        mia = Student.objects.create(name='Mia Ramos', grade_section='Kinder 1 - Masaya')

        Guardian.objects.create(student=juan, name='Rosa Dela Cruz', relationship='Mother')
        Guardian.objects.create(student=juan, name='Maria Dela Cruz', relationship='Grandmother')
        Guardian.objects.create(student=juan, name='Lita Reyes', relationship='Yaya', is_active=False)
        Guardian.objects.create(student=mia, name='Carlo Ramos', relationship='Father')

        for note in [
            'Showed strong participation during group reading; identified 8 of 10 sight words.',
            'Needs encouragement to share materials during group activities.',
            'Completed fine-motor tracing exercise independently.',
        ]:
            Observation.objects.create(student=juan, note=note)
        Observation.objects.create(student=mia, note='Sings along confidently during circle time.')

        self.stdout.write(self.style.SUCCESS('Done: 2 students, 4 guardians (1 deactivated), 4 observations.'))
