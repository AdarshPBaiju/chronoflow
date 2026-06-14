from rest_framework import serializers

from .models import Task, TaskMovement


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

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "column",
            "column_name",
            "title",
            "description",
            "priority",
            "estimated_seconds",
            "is_archived",
            "today_time",
            "total_time",
            "movements",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_today_time(self, obj):
        from datetime import date

        from django.db.models import Sum

        today = date.today()
        total = obj.sessions.filter(
            start_time__date=today
        ).aggregate(total=Sum("duration_seconds"))["total"]
        return total or 0

    def get_total_time(self, obj):
        from django.db.models import Sum

        total = obj.sessions.aggregate(total=Sum("duration_seconds"))["total"]
        return total or 0
