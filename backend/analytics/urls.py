from django.urls import path

from . import views

urlpatterns = [
    path("by-stage/", views.TimeByStageView.as_view(), name="analytics-by-stage"),
    path("by-task/", views.TimeByTaskView.as_view(), name="analytics-by-task"),
    path("by-project/", views.TimeByProjectView.as_view(), name="analytics-by-project"),
    path("dashboard/", views.DashboardTotalsView.as_view(), name="analytics-dashboard"),
]
