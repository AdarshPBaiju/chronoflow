from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import Session
from .serializers import SessionSerializer, StartTimerSerializer


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Session.objects.filter(user=self.request.user).select_related(
            "task", "task__project"
        )
        task_id = self.request.query_params.get("task_id")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def start(self, request):
        ser = StartTimerSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        task = ser.validated_data["task_id"]

        existing = Session.objects.filter(
            user=request.user, end_time__isnull=True
        ).first()
        if existing:
            return Response(
                {"error": "An active session already exists. Stop it first."},
                status=status.HTTP_409_CONFLICT,
            )

        session = Session.objects.create(
            user=request.user,
            task=task,
            start_time=timezone.now(),
        )
        out = SessionSerializer(session, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def stop(self, request):
        session = Session.objects.filter(
            user=request.user, end_time__isnull=True
        ).first()
        if not session:
            return Response(
                {"error": "No active session found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()
        session.end_time = now
        delta = now - session.start_time
        session.duration_seconds = int(delta.total_seconds())
        session.save(update_fields=["end_time", "duration_seconds"])
        session.refresh_from_db()

        out = SessionSerializer(session, context={"request": request})
        return Response(out.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        session = (
            Session.objects.filter(user=request.user, end_time__isnull=True)
            .select_related("task", "task__project")
            .first()
        )
        if not session:
            return Response({"active": False, "session": None})
        out = SessionSerializer(session, context={"request": request})
        return Response({"active": True, "session": out.data})
