from django.conf import settings
from django.db import models
from django.db.models import Q


class ActiveSessionManager(models.Manager):
    def get_active(self, user):
        return self.filter(user=user, end_time__isnull=True).first()


class Session(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ActiveSessionManager()

    class Meta:
        ordering = ["-start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(end_time__isnull=True),
                name="unique_active_session_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.task.title} @ {self.start_time}"
