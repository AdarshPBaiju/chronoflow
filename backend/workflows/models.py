from django.db import models


class WorkflowColumn(models.Model):
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="workflow_columns",
    )
    name = models.CharField(max_length=255)
    position = models.IntegerField()
    color = models.CharField(max_length=7, default="#6366f1")
    is_completed = models.BooleanField(default=False)
    wip_limit = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position"]
        unique_together = ["project", "position"]

    def __str__(self):
        return f"{self.project.name} - {self.name}"
