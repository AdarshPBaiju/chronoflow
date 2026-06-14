from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/workflow-columns/", include("workflows.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/sessions/", include("sessions.urls")),
    path("api/notes/", include("notes.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/analytics/", include("analytics.urls")),
]
