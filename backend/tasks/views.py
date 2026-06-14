from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from .models import Task, TaskMovement
from .serializers import TaskSerializer, TaskMovementSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Task.objects.filter(
            project__user=self.request.user
        ).select_related("column", "project").prefetch_related(
            "movements", "movements__from_column", "movements__to_column",
            "sessions", "sessions__task", "sessions__task__project",
        )
        project_id = self.request.query_params.get("project_id")
        column_id = self.request.query_params.get("column_id")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if column_id:
            qs = qs.filter(column_id=column_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        old_column_id = None
        if self.get_object().column_id != serializer.validated_data.get("column"):
            old_column_id = self.get_object().column_id
        instance = serializer.save()
        new_column_id = instance.column_id
        if old_column_id and old_column_id != new_column_id:
            TaskMovement.objects.create(
                task=instance,
                from_column_id=old_column_id,
                to_column_id=new_column_id,
            )

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        task = self.get_object()
        column_id = request.data.get("column_id")
        if not column_id:
            return Response({"error": "column_id required"}, status=400)
        old_column_id = task.column_id
        task.column_id = column_id
        task.save(update_fields=["column_id"])
        TaskMovement.objects.create(
            task=task,
            from_column_id=old_column_id,
            to_column_id=column_id,
        )
        return Response(self.get_serializer(task).data)
