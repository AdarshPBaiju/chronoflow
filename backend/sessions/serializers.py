from rest_framework import serializers
from django.utils import timezone

from .models import Session


class SessionSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source="task.title", read_only=True)
    project_name = serializers.CharField(
        source="task.project.name", read_only=True
    )
    project_color = serializers.CharField(
        source="task.project.color", read_only=True
    )
    project_id = serializers.IntegerField(source="task.project.id", read_only=True)

    class Meta:
        model = Session
        fields = [
            "id",
            "task",
            "task_title",
            "project_id",
            "project_name",
            "project_color",
            "start_time",
            "end_time",
            "duration_seconds",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "duration_seconds"]

    def validate(self, data):
        user = self.context["request"].user
        task = data.get("task")

        if task and task.project.user != user:
            raise serializers.ValidationError("Task does not belong to user.")

        if not data.get("end_time"):
            existing_active = Session.objects.filter(user=user, end_time__isnull=True)
            if self.instance:
                existing_active = existing_active.exclude(pk=self.instance.pk)
            if existing_active.exists():
                raise serializers.ValidationError(
                    "An active session already exists. Stop it first."
                )

        start = data.get("start_time")
        end = data.get("end_time")
        if start and end and start >= end:
            raise serializers.ValidationError("Start time must be before end time.")

        if task and start and end:
            overlapping = Session.objects.filter(
                user=user,
                start_time__lt=end,
                end_time__gt=start,
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    "Session overlaps with an existing session."
                )

        return data


class StartTimerSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()

    def validate_task_id(self, value):
        from tasks.models import Task

        user = self.context["request"].user
        try:
            task = Task.objects.get(pk=value, project__user=user)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task not found.")
        return task
