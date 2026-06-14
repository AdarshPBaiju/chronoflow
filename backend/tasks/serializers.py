from rest_framework import serializers

from .models import Task, TaskMovement
from sessions.serializers import SessionSerializer


class TaskMovementSerializer(serializers.ModelSerializer):
    from_column_name = serializers.CharField(
        source="from_column.name", read_only=True
    )
    to_column_name = serializers.CharField(source="to_column.name", read_only=True)

    class Meta:
        model = TaskMovement
        fields = ["id", "from_column", "from_column_name", "to_column", "to_column_name", "moved_at"]


class TaskSerializer(serializers.ModelSerializer):
    today_time = serializers.SerializerMethodField()
    total_time = serializers.SerializerMethodField()
    movements = TaskMovementSerializer(many=True, read_only=True)
    column_name = serializers.CharField(source="column.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    sessions = SessionSerializer(many=True, read_only=True)
    task_start = serializers.SerializerMethodField()
    task_end = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    project_code = serializers.CharField(source="project.code", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "code",
            "project",
            "project_name",
            "project_code",
            "column",
            "column_name",
            "title",
            "description",
            "priority",
            "estimated_seconds",
            "is_archived",
            "today_time",
            "total_time",
            "task_start",
            "task_end",
            "is_active",
            "sessions",
            "movements",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "project_code", "created_at", "updated_at"]

    def get_today_time(self, obj):
        from datetime import date
        from django.utils import timezone
        from django.db.models import Sum

        today = date.today()
        completed = obj.sessions.filter(
            start_time__date=today, end_time__isnull=False
        ).aggregate(total=Sum("duration_seconds"))["total"] or 0

        active = obj.sessions.filter(
            start_time__date=today, end_time__isnull=True
        ).first()
        active_seconds = 0
        if active:
            delta = timezone.now() - active.start_time
            active_seconds = int(delta.total_seconds())

        return completed + active_seconds

    def get_total_time(self, obj):
        from django.db.models import Sum
        from django.utils import timezone

        completed = obj.sessions.filter(
            end_time__isnull=False
        ).aggregate(total=Sum("duration_seconds"))["total"] or 0

        active = obj.sessions.filter(end_time__isnull=True).first()
        active_seconds = 0
        if active:
            delta = timezone.now() - active.start_time
            active_seconds = int(delta.total_seconds())

        return completed + active_seconds

    def get_task_start(self, obj):
        first = obj.sessions.order_by("start_time").first()
        return first.start_time.isoformat() if first else None

    def get_task_end(self, obj):
        last = obj.sessions.filter(end_time__isnull=False).order_by("-end_time").first()
        return last.end_time.isoformat() if last else None

    def get_is_active(self, obj):
        return obj.sessions.filter(end_time__isnull=True).exists()
