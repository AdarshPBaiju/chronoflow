from rest_framework import serializers

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    total_time = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "color",
            "status",
            "task_count",
            "total_time",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_total_time(self, obj):
        from django.db.models import Sum

        from tasks.models import Task

        total = (
            Task.objects.filter(project=obj, sessions__isnull=False)
            .distinct()
            .aggregate(total=Sum("sessions__duration_seconds"))["total"]
        )
        return total or 0
