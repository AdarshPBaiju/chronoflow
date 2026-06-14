from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WorkflowColumn
from .serializers import WorkflowColumnSerializer


class WorkflowColumnViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkflowColumn.objects.filter(
            project__user=self.request.user
        ).select_related("project")

    @action(detail=False, methods=["get"])
    def by_project(self, request):
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"error": "project_id required"}, status=400)
        columns = self.get_queryset().filter(project_id=project_id)
        serializer = self.get_serializer(columns, many=True)
        return Response(serializer.data)
