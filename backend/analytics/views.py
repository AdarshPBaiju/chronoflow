from django.db.models import Sum
from rest_framework import generics, permissions
from rest_framework.response import Response

from sessions.models import Session
from projects.models import Project
from workflows.models import WorkflowColumn


class TimeByStageView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"error": "project_id required"}, status=400)

        columns = WorkflowColumn.objects.filter(
            project_id=project_id, project__user=request.user
        )

        data = []
        for col in columns:
            total = Session.objects.filter(
                task__column=col, end_time__isnull=False
            ).aggregate(total=Sum("duration_seconds"))["total"] or 0
            data.append({
                "column_id": col.id,
                "name": col.name,
                "color": col.color,
                "duration_seconds": total,
            })

        return Response(data)


class TimeByTaskView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get("project_id")
        tasks_qs = Project.objects.get(
            id=project_id, user=request.user
        ).tasks.all() if project_id else Project.objects.filter(
            user=request.user
        ).first().tasks.all()

        data = []
        for task in tasks_qs:
            total = Session.objects.filter(
                task=task, end_time__isnull=False
            ).aggregate(total=Sum("duration_seconds"))["total"] or 0
            data.append({
                "task_id": task.id,
                "title": task.title,
                "duration_seconds": total,
            })

        data.sort(key=lambda x: x["duration_seconds"], reverse=True)
        return Response(data)


class TimeByProjectView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        projects = Project.objects.filter(user=request.user)
        data = []
        for proj in projects:
            total = Session.objects.filter(
                task__project=proj, end_time__isnull=False
            ).aggregate(total=Sum("duration_seconds"))["total"] or 0
            data.append({
                "project_id": proj.id,
                "name": proj.name,
                "color": proj.color,
                "duration_seconds": total,
            })
        data.sort(key=lambda x: x["duration_seconds"], reverse=True)
        return Response(data)


class DashboardTotalsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta
        from django.db.models import Count

        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())

        sessions_qs = Session.objects.filter(
            task__project__user=request.user,
            end_time__isnull=False,
        )

        today_seconds = sessions_qs.filter(start_time__date=today).aggregate(
            total=Sum("duration_seconds")
        )["total"] or 0

        week_seconds = sessions_qs.filter(start_time__date__gte=start_of_week).aggregate(
            total=Sum("duration_seconds")
        )["total"] or 0

        month_seconds = sessions_qs.filter(
            start_time__year=today.year,
            start_time__month=today.month,
        ).aggregate(total=Sum("duration_seconds"))["total"] or 0

        year_seconds = sessions_qs.filter(
            start_time__year=today.year,
        ).aggregate(total=Sum("duration_seconds"))["total"] or 0

        projects = Project.objects.filter(user=request.user)
        projects_data = []
        for proj in projects:
            ps = sessions_qs.filter(task__project=proj)
            p_today = ps.filter(start_time__date=today).aggregate(t=Sum("duration_seconds"))["t"] or 0
            p_week = ps.filter(start_time__date__gte=start_of_week).aggregate(t=Sum("duration_seconds"))["t"] or 0
            p_month = ps.filter(start_time__year=today.year, start_time__month=today.month).aggregate(t=Sum("duration_seconds"))["t"] or 0
            p_year = ps.filter(start_time__year=today.year).aggregate(t=Sum("duration_seconds"))["t"] or 0
            projects_data.append({
                "id": proj.id,
                "name": proj.name,
                "color": proj.color,
                "today": p_today,
                "week": p_week,
                "month": p_month,
                "year": p_year,
            })

        days_param = request.query_params.get("days", "14")
        try:
            num_days = max(1, min(int(days_param), 365))
        except ValueError:
            num_days = 14

        start_date = today - timedelta(days=num_days - 1)
        raw = (
            sessions_qs
            .filter(start_time__date__gte=start_date)
            .values("start_time__date")
            .annotate(
                duration_seconds=Sum("duration_seconds"),
                session_count=Count("id"),
            )
            .order_by("start_time__date")
        )

        daily_map = {}
        for row in raw:
            daily_map[str(row["start_time__date"])] = {
                "duration_seconds": row["duration_seconds"],
                "session_count": row["session_count"],
            }

        daily_totals = []
        for i in range(num_days):
            d = start_date + timedelta(days=i)
            ds = str(d)
            if ds in daily_map:
                daily_totals.append({
                    "date": ds,
                    "duration_seconds": daily_map[ds]["duration_seconds"],
                    "session_count": daily_map[ds]["session_count"],
                })
            else:
                daily_totals.append({
                    "date": ds,
                    "duration_seconds": 0,
                    "session_count": 0,
                })

        return Response({
            "today_seconds": today_seconds,
            "week_seconds": week_seconds,
            "month_seconds": month_seconds,
            "year_seconds": year_seconds,
            "projects": projects_data,
            "daily_totals": daily_totals,
        })
