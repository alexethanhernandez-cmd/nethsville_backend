from django.urls import path

from core import views

urlpatterns = [
    # Demo pages
    path('', views.index, name='index'),
    path('demo/summary/', views.demo_summary, name='demo_summary'),
    path('demo/kiosk/', views.demo_kiosk, name='demo_kiosk'),

    # Students, observations, AI summary
    path('api/students/', views.students),
    path('api/students/<int:student_id>/observations/', views.observations),
    path('api/students/<int:student_id>/summary/generate/', views.generate_summary),
    path('api/students/<int:student_id>/summaries/', views.student_summaries),
    path('api/students/<int:student_id>/parent-view/', views.parent_view),
    path('api/summaries/<int:summary_id>/approve/', views.approve_summary),

    # QR guardian pickup
    path('api/guardians/', views.guardians),
    path('api/guardians/<int:guardian_id>/qr.png', views.guardian_qr),
    path('api/guardians/<int:guardian_id>/revoke-qr/', views.revoke_qr),
    path('api/pickup/verify/', views.verify_pickup),
    path('api/pickup/log/', views.pickup_log),
]
