from rest_framework import serializers

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    total_time = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "code",
            "name",
            "description",
            "color",
            "status",
            "task_count",
            "total_time",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "created_at", "updated_at"]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_total_time(self, obj):
        from django.db.models import Sum
        from django.utils import timezone
        from sessions.models import Session

        completed = Session.objects.filter(
            task__project=obj, end_time__isnull=False
        ).aggregate(total=Sum("duration_seconds"))["total"] or 0

        active = Session.objects.filter(
            task__project=obj, end_time__isnull=True
        ).first()
        active_seconds = 0
        if active:
            delta = timezone.now() - active.start_time
            active_seconds = int(delta.total_seconds())

        return completed + active_seconds
