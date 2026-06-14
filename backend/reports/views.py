from datetime import date, timedelta

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response

from sessions.models import Session
from projects.models import Project


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
