from django.contrib import admin

from .models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ["task", "start_time", "end_time", "duration_seconds"]
    list_filter = ["task__project"]
