from django.conf import settings
from django.db import models


class Profile(models.Model):
    TIME_DISPLAY_CHOICES = [
        ("A", "01:35:27"),
        ("B", "1h 35m"),
        ("C", "1.59h"),
        ("D", "All three"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    timezone = models.CharField(max_length=64, default="UTC")
    theme = models.CharField(max_length=32, default="light")
    time_display_mode = models.CharField(
        max_length=1, choices=TIME_DISPLAY_CHOICES, default="D"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} profile"
