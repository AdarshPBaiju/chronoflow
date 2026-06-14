from datetime import date, timedelta

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response

from sessions.models import Session
from projects.models import Project
from workflows.models import WorkflowColumn


class DailyReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        day = request.query_params.get("date", date.today().isoformat())
        sessions = Session.objects.filter(
            task__project__user=request.user,
            start_time__date=day,
            end_time__isnull=False,
        ).select_related("task", "task__project")

        projects_data = {}
        total = 0
        for s in sessions:
            pname = s.task.project.name
            if pname not in projects_data:
                projects_data[pname] = 0
            projects_data[pname] += s.duration_seconds or 0
            total += s.duration_seconds or 0

        return Response({
            "date": day,
            "projects": [
                {"name": k, "duration_seconds": v}
                for k, v in projects_data.items()
            ],
            "total_seconds": total,
        })


class WeeklyReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        sessions = Session.objects.filter(
            task__project__user=request.user,
            start_time__date__gte=start_of_week,
            start_time__date__lte=today,
            end_time__isnull=False,
        )

        days = []
        for i in range(7):
            d = start_of_week + timedelta(days=i)
            day_total = sessions.filter(start_time__date=d).aggregate(
                total=Sum("duration_seconds")
            )["total"] or 0
            days.append({"date": d.isoformat(), "duration_seconds": day_total})

        total = sessions.aggregate(total=Sum("duration_seconds"))["total"] or 0

        return Response({
            "start_date": start_of_week.isoformat(),
            "end_date": today.isoformat(),
            "days": days,
            "total_seconds": total,
        })


class MonthlyReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get("year", date.today().year))
        month = int(request.query_params.get("month", date.today().month))

        sessions = Session.objects.filter(
            task__project__user=request.user,
            start_time__year=year,
            start_time__month=month,
            end_time__isnull=False,
        ).select_related("task", "task__project")

        projects_data = {}
        total = 0
        for s in sessions:
            pname = s.task.project.name
            if pname not in projects_data:
                projects_data[pname] = 0
            projects_data[pname] += s.duration_seconds or 0
            total += s.duration_seconds or 0

        return Response({
            "year": year,
            "month": month,
            "projects": [
                {"name": k, "duration_seconds": v}
                for k, v in projects_data.items()
            ],
            "total_seconds": total,
        })


class ProjectReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = generics.get_object_or_404(
            Project,
            id=project_id,
            user=request.user,
        )
        sessions = Session.objects.filter(
            task__project=project,
            end_time__isnull=False,
        ).select_related("task", "task__column")
        total = sessions.aggregate(total=Sum("duration_seconds"))["total"] or 0

        columns = WorkflowColumn.objects.filter(project=project)
        stages = []
        for column in columns:
            stage_total = sessions.filter(task__column=column).aggregate(
                total=Sum("duration_seconds")
            )["total"] or 0
            stages.append({
                "column_id": column.id,
                "name": column.name,
                "color": column.color,
                "duration_seconds": stage_total,
            })

        tasks = []
        for task in project.tasks.filter(is_archived=False):
            task_total = sessions.filter(task=task).aggregate(
                total=Sum("duration_seconds")
            )["total"] or 0
            tasks.append({
                "task_id": task.id,
                "title": task.title,
                "column_id": task.column_id,
                "column_name": task.column.name if task.column else "",
                "duration_seconds": task_total,
                "session_count": sessions.filter(task=task).count(),
            })
        tasks.sort(key=lambda item: item["duration_seconds"], reverse=True)

        days = (
            sessions.values("start_time__date")
            .annotate(
                duration_seconds=Sum("duration_seconds"),
                session_count=Count("id"),
            )
            .order_by("-start_time__date")
        )

        return Response({
            "project": {
                "id": project.id,
                "name": project.name,
                "color": project.color,
                "status": project.status,
            },
            "total_seconds": total,
            "stage_totals": stages,
            "task_totals": tasks,
            "daily_totals": [
                {
                    "date": item["start_time__date"].isoformat(),
                    "duration_seconds": item["duration_seconds"] or 0,
                    "session_count": item["session_count"],
                }
                for item in days
            ],
        })
