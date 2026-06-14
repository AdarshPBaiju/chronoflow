from rest_framework import viewsets, permissions

from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Note.objects.filter(
            task__project__user=self.request.user
        ).select_related("task")
        task_id = self.request.query_params.get("task_id")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()
