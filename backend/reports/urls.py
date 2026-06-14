from django.urls import path

from . import views

urlpatterns = [
    path("daily/", views.DailyReportView.as_view(), name="report-daily"),
    path("weekly/", views.WeeklyReportView.as_view(), name="report-weekly"),
    path("monthly/", views.MonthlyReportView.as_view(), name="report-monthly"),
    path(
        "projects/<int:project_id>/",
        views.ProjectReportView.as_view(),
        name="report-project",
    ),
    path(
        "detailed/",
        views.DetailedReportView.as_view(),
        name="report-detailed",
    ),
]
