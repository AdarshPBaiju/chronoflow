from django.contrib import admin

from .models import Task, TaskMovement


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "column", "priority", "is_archived"]
    list_filter = ["priority", "is_archived", "project"]


@admin.register(TaskMovement)
class TaskMovementAdmin(admin.ModelAdmin):
    list_display = ["task", "from_column", "to_column", "moved_at"]
