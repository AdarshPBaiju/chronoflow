from django.db import models


class Task(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    column = models.ForeignKey(
        "workflows.WorkflowColumn",
        on_delete=models.SET_NULL,
        null=True,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=16, choices=PRIORITY_CHOICES, default="medium"
    )
    estimated_seconds = models.IntegerField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class TaskMovement(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="movements"
    )
    from_column = models.ForeignKey(
        "workflows.WorkflowColumn",
        on_delete=models.SET_NULL,
        null=True,
        related_name="movements_from",
    )
    to_column = models.ForeignKey(
        "workflows.WorkflowColumn",
        on_delete=models.SET_NULL,
        null=True,
        related_name="movements_to",
    )
    moved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-moved_at"]

    def __str__(self):
        return f"{self.task.title}: {self.from_column} -> {self.to_column}"
