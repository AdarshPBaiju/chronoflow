from django.conf import settings
from django.db import models


class Project(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("archived", "Archived")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=16, unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366f1")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            import random
            ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            while True:
                rand_part = ''.join(random.choices(ALPHABET, k=6))
                code = f"PRJ-{rand_part}"
                if not Project.objects.filter(code=code).exists():
                    self.code = code
                    break
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
