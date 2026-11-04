from django.contrib import admin

from core.models import Guardian, Observation, PickupLog, ProgressSummary, Student

admin.site.register(Student)
admin.site.register(Guardian)
admin.site.register(Observation)
admin.site.register(ProgressSummary)
admin.site.register(PickupLog)
