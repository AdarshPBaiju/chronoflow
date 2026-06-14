from django.contrib import admin

from .models import WorkflowColumn


@admin.register(WorkflowColumn)
class WorkflowColumnAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "position", "is_completed"]
    list_filter = ["project"]
