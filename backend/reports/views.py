from datetime import date, timedelta, datetime, timezone

from django.db.models import Sum, Count
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
            project = s.task.project
            p_id = project.id
            if p_id not in projects_data:
                projects_data[p_id] = {
                    "name": project.name,
                    "code": project.code,
                    "duration_seconds": 0,
                }
            projects_data[p_id]["duration_seconds"] += s.duration_seconds or 0
            total += s.duration_seconds or 0

        return Response(
            {
                "date": day,
                "projects": list(projects_data.values()),
                "total_seconds": total,
            }
        )


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
            day_total = (
                sessions.filter(start_time__date=d).aggregate(
                    total=Sum("duration_seconds")
                )["total"]
                or 0
            )
            days.append({"date": d.isoformat(), "duration_seconds": day_total})

        total = sessions.aggregate(total=Sum("duration_seconds"))["total"] or 0

        return Response(
            {
                "start_date": start_of_week.isoformat(),
                "end_date": today.isoformat(),
                "days": days,
                "total_seconds": total,
            }
        )


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
            project = s.task.project
            p_id = project.id
            if p_id not in projects_data:
                projects_data[p_id] = {
                    "name": project.name,
                    "code": project.code,
                    "duration_seconds": 0,
                }
            projects_data[p_id]["duration_seconds"] += s.duration_seconds or 0
            total += s.duration_seconds or 0

        return Response(
            {
                "year": year,
                "month": month,
                "projects": list(projects_data.values()),
                "total_seconds": total,
            }
        )


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
            stage_total = (
                sessions.filter(task__column=column).aggregate(
                    total=Sum("duration_seconds")
                )["total"]
                or 0
            )
            stages.append(
                {
                    "column_id": column.id,
                    "name": column.name,
                    "color": column.color,
                    "duration_seconds": stage_total,
                }
            )

        tasks = []
        for task in project.tasks.filter(is_archived=False):
            task_total = (
                sessions.filter(task=task).aggregate(total=Sum("duration_seconds"))[
                    "total"
                ]
                or 0
            )
            tasks.append(
                {
                    "task_id": task.id,
                    "task_code": task.code,
                    "title": task.title,
                    "column_id": task.column_id,
                    "column_name": task.column.name if task.column else "",
                    "duration_seconds": task_total,
                    "session_count": sessions.filter(task=task).count(),
                }
            )
        tasks.sort(key=lambda item: item["duration_seconds"], reverse=True)

        days = (
            sessions.values("start_time__date")
            .annotate(
                duration_seconds=Sum("duration_seconds"),
                session_count=Count("id"),
            )
            .order_by("-start_time__date")
        )

        return Response(
            {
                "project": {
                    "id": project.id,
                    "code": project.code,
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
            }
        )


class DetailedReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        project_id = request.query_params.get("project_id")

        sessions = Session.objects.filter(
            task__project__user=request.user,
            end_time__isnull=False,
        ).select_related("task", "task__project", "task__column")

        if start_date:
            sessions = sessions.filter(start_time__date__gte=start_date)
        if end_date:
            sessions = sessions.filter(start_time__date__lte=end_date)
        if project_id:
            sessions = sessions.filter(task__project_id=project_id)

        total_seconds = sessions.aggregate(total=Sum("duration_seconds"))["total"] or 0
        total_sessions = sessions.count()

        projects_dict = {}
        for s in sessions.select_related("task__column"):
            p = s.task.project
            if p.id not in projects_dict:
                projects_dict[p.id] = {
                    "id": p.id,
                    "name": p.name,
                    "code": p.code,
                    "color": p.color,
                    "total_seconds": 0,
                    "stages": {},
                    "tasks": {},
                }
            pd = projects_dict[p.id]
            pd["total_seconds"] += s.duration_seconds or 0

            stage_name = s.task.column.name if s.task.column else "No Stage"
            stage_color = s.task.column.color if s.task.column else "#c6c6cd"
            if stage_name not in pd["stages"]:
                pd["stages"][stage_name] = {
                    "name": stage_name,
                    "color": stage_color,
                    "duration_seconds": 0,
                }
            pd["stages"][stage_name]["duration_seconds"] += s.duration_seconds or 0

            t = s.task
            if t.id not in pd["tasks"]:
                pd["tasks"][t.id] = {
                    "task_id": t.id,
                    "task_code": t.code,
                    "title": t.title,
                    "stage": stage_name,
                    "duration_seconds": 0,
                    "session_count": 0,
                    "sessions": [],
                }
            td = pd["tasks"][t.id]
            td["duration_seconds"] += s.duration_seconds or 0
            td["session_count"] += 1
            td["sessions"].append({
                "id": s.id,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat(),
                "duration_seconds": s.duration_seconds,
                "note": s.note,
            })

        projects_list = []
        for pd in projects_dict.values():
            stages_list = sorted(
                pd["stages"].values(), key=lambda x: x["duration_seconds"], reverse=True
            )
            tasks_list = sorted(
                pd["tasks"].values(), key=lambda x: x["duration_seconds"], reverse=True
            )
            projects_list.append({
                "id": pd["id"],
                "name": pd["name"],
                "code": pd["code"],
                "color": pd["color"],
                "total_seconds": pd["total_seconds"],
                "task_count": len(tasks_list),
                "stages": stages_list,
                "tasks": tasks_list,
            })
        projects_list.sort(key=lambda x: x["total_seconds"], reverse=True)

        daily = (
            sessions.values("start_time__date")
            .annotate(
                duration_seconds=Sum("duration_seconds"),
                session_count=Count("id"),
            )
            .order_by("start_time__date")
        )

        return Response({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period": {
                "start_date": start_date or "all",
                "end_date": end_date or "all",
            },
            "summary": {
                "total_seconds": total_seconds,
                "total_sessions": total_sessions,
                "total_projects": len(projects_list),
                "total_tasks": sum(p["task_count"] for p in projects_list),
            },
            "projects": projects_list,
            "daily_totals": [
                {
                    "date": item["start_time__date"].isoformat(),
                    "duration_seconds": item["duration_seconds"],
                    "session_count": item["session_count"],
                }
                for item in daily
            ],
        })
