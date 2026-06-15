import random
from datetime import datetime, timedelta, date, time as dt_time
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from projects.models import Project
from workflows.models import WorkflowColumn
from tasks.models import Task
from sessions.models import Session
from notes.models import Note

User = get_user_model()

TZ = ZoneInfo("UTC")

PROJECT_TEMPLATES = [
    {"name": "Website Redesign", "code": "WEB", "color": "#0051d5"},
    {"name": "Mobile App", "code": "MOB", "color": "#16a34a"},
    {"name": "API Gateway", "code": "API", "color": "#d97706"},
    {"name": "Data Pipeline", "code": "DATA", "color": "#7c3aed"},
    {"name": "DevOps Setup", "code": "DEVOPS", "color": "#0d9488"},
    {"name": "Customer Portal", "code": "PORTAL", "color": "#dc2626"},
    {"name": "Internal Tools", "code": "TOOLS", "color": "#0891b2"},
    {"name": "Marketing Site", "code": "MKTG", "color": "#d946ef"},
]

HEAVY_PROJECTS = [
    {"name": "Analytics Dashboard", "code": "ANL", "color": "#ef4444"},
    {"name": "Chat System", "code": "CHAT", "color": "#14b8a6"},
    {"name": "Payment Gateway", "code": "PAY", "color": "#f97316"},
    {"name": "Notification Service", "code": "NOTIF", "color": "#8b5cf6"},
]

COLUMN_TEMPLATES = [
    {"name": "Backlog", "position": 0, "color": "#9ca3af", "is_completed": False},
    {"name": "To Do", "position": 1, "color": "#3b82f6", "is_completed": False},
    {"name": "In Progress", "position": 2, "color": "#f59e0b", "is_completed": False},
    {"name": "Review", "position": 3, "color": "#8b5cf6", "is_completed": False},
    {"name": "Done", "position": 4, "color": "#22c55e", "is_completed": True},
]

TASK_TITLES = [
    "Set up project structure",
    "Design database schema",
    "Implement authentication",
    "Build user profile page",
    "Create API endpoints",
    "Write unit tests",
    "Integration testing",
    "Performance optimization",
    "Code review fixes",
    "Deploy to staging",
    "Documentation",
    "UI polish",
    "Error handling",
    "Logging setup",
    "Add search functionality",
    "Pagination support",
    "File upload feature",
    "Email notifications",
    "Export to CSV",
    "Dashboard widgets",
    "Real-time updates",
    "Dark mode support",
    "Accessibility fixes",
    "Mobile responsive",
    "Caching layer",
    "Rate limiting",
    "Webhook integration",
    "Audit logging",
    "Backup strategy",
    "Monitoring setup",
    "Refactor legacy module",
    "SSO integration",
    "API versioning",
    "Notification preferences",
    "Drag-and-drop reorder",
    "Bulk import",
    "Data migration script",
    "Soft delete support",
    "Activity feed",
    "Role-based access control",
]

PRIORITIES = ["low", "medium", "high", "critical"]

NOTE_TEMPLATES = [
    "Initial implementation complete.",
    "Need to revisit this after feedback.",
    "Works locally, waiting for QA.",
    "Blocked on API team's changes.",
    "Refactored to use the new pattern.",
    "Added error handling for edge cases.",
    "Performance looks good in profiling.",
    "Documented in the project wiki.",
    "Ready for code review.",
    "Fixed the reported bug.",
    "Updated dependencies.",
    "Need to add more tests.",
    "UI looks clean on mobile.",
    "Requires design sign-off.",
    "Deployed to production.",
    "Rolled back due to regression.",
]

random.seed(42)


def random_day_offset(past_max: int = 365, future_max: int = 90) -> int:
    """Return a day offset biased toward past, occasionally present or future."""
    r = random.random()
    if r < 0.70:
        return -random.randint(1, past_max)
    elif r < 0.90:
        return 0
    else:
        return random.randint(1, future_max)


def random_datetime_in_range(past_max: int = 365, future_max: int = 90) -> datetime:
    offset = random_day_offset(past_max, future_max)
    d = date.today() + timedelta(days=offset)
    h = random.randint(6, 23)
    m = random.randint(0, 59)
    return datetime.combine(d, dt_time(h, m), tzinfo=TZ)


def random_session_duration() -> int:
    return random.randint(60, 7200)


class Command(BaseCommand):
    help = "Generate dummy data across past, present, and future for all users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--heavy",
            action="store_true",
            help="Extra-heavy data: 12 projects, 50+ tasks/project, 500+ sessions/project",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seedable data for all users before generating",
        )
        parser.add_argument(
            "--user",
            type=str,
            help="Only seed data for a specific username",
        )

    def handle(self, *args, **options):
        heavy = options["heavy"]
        reset = options["reset"]
        username = options.get("user")

        if reset:
            self._clear_all()
            self.stdout.write("Cleared all seedable data across all users.")

        users = User.objects.filter(username=username) if username else User.objects.all()
        users = list(users)
        if not users:
            self.stdout.write("No matching users found.")
            return

        task_mult = 3 if heavy else 1
        sessions_per_project = 500 if heavy else 150
        active_per_project = 5 if heavy else 2
        future_task_pct = 0.25 if heavy else 0.15

        for user in users:
            self.stdout.write(f"── {user.username} ──")

            projects = self._create_projects(user, heavy)
            for proj in projects:
                columns = self._create_columns(proj)
                col_done = [c for c in columns if c.is_completed]
                col_active = [c for c in columns if not c.is_completed]

                tasks = self._create_tasks(proj, columns, task_mult, future_task_pct)
                self._create_sessions_past(user, tasks, col_done, col_active, sessions_per_project)
                self._create_sessions_present(user, tasks, col_active, active_per_project)
                self._create_notes(tasks)

            p_count = len(projects)
            t_count = Task.objects.filter(project__user=user).count()
            s_count = Session.objects.filter(user=user).count()
            active_sessions = Session.objects.filter(user=user, end_time__isnull=True).count()
            self.stdout.write(
                self.style.SUCCESS(
                    f"  {p_count} projects, {t_count} tasks, {s_count} sessions "
                    f"({active_sessions} active)"
                )
            )

    def _clear_all(self):
        Note.objects.all().delete()
        Session.objects.all().delete()
        Task.objects.all().delete()
        WorkflowColumn.objects.all().delete()
        Project.objects.all().delete()

    def _create_projects(self, user, heavy: bool):
        templates = PROJECT_TEMPLATES + (HEAVY_PROJECTS if heavy else [])
        projects = []
        for t in templates:
            proj, _ = Project.objects.get_or_create(
                user=user,
                name=t["name"],
                defaults={
                    "color": t["color"],
                    "description": f"{t['name']} — {user.username}",
                },
            )
            projects.append(proj)
        return projects

    def _create_columns(self, project):
        cols = []
        for ct in COLUMN_TEMPLATES:
            col, _ = WorkflowColumn.objects.update_or_create(
                project=project,
                position=ct["position"],
                defaults={
                    "name": ct["name"],
                    "color": ct["color"],
                    "is_completed": ct["is_completed"],
                },
            )
            cols.append(col)
        return cols

    def _create_tasks(self, project, columns, mult: int, future_pct: float):
        num = 12 * mult + random.randint(0, 6 * mult)
        titles = random.choices(TASK_TITLES, k=num)
        # Bias: place future tasks in Backlog / To Do
        cols_future = [c for c in columns if c.position <= 1]
        cols_other = [c for c in columns if c.position > 1]
        tasks = []
        for title in titles:
            is_future = random.random() < future_pct
            col = random.choice(cols_future) if is_future else random.choice(cols_other or columns)
            tasks.append(Task.objects.create(
                project=project,
                column=col,
                title=f"{title} ({project.code})",
                priority=random.choice(PRIORITIES),
                estimated_seconds=random.randint(1800, 86400),
            ))
        return tasks

    def _create_sessions_past(self, user, tasks, col_done, col_active, count: int):
        """Completed sessions spread over the past year, plus some future."""
        done_task_ids = [t.id for t in tasks if t.column and t.column in col_done]
        active_task_ids = [t.id for t in tasks if t.column and t.column in col_active]

        for _ in range(count):
            start = random_datetime_in_range(past_max=365, future_max=30)
            dur = random_session_duration()
            end = start + timedelta(seconds=dur)

            # Completed tasks get more session weight
            if done_task_ids and random.random() < 0.6:
                task_id = random.choice(done_task_ids)
            elif active_task_ids:
                task_id = random.choice(active_task_ids)
            else:
                task_id = random.choice(tasks).id

            if start > timezone.now():
                continue

            Session.objects.create(
                user=user, task_id=task_id,
                start_time=start, end_time=end,
                duration_seconds=dur,
            )

    def _create_sessions_present(self, user, tasks, col_active, count: int):
        """Active (running) sessions and very-recent sessions for live feel."""
        candidates = [t for t in tasks if t.column in col_active] if col_active else tasks
        if not candidates:
            return

        now = timezone.now()

        # At most one active (running) session per user (DB constraint)
        has_active = Session.objects.filter(user=user, end_time__isnull=True).exists()

        for _ in range(count):
            task = random.choice(candidates)
            if not has_active and random.random() < 0.6:
                start = now - timedelta(minutes=random.randint(5, 180))
                Session.objects.create(
                    user=user, task=task,
                    start_time=start, end_time=None, duration_seconds=None,
                )
                has_active = True
            else:
                start = now - timedelta(minutes=random.randint(1, 120))
                dur = random.randint(60, 3600)
                Session.objects.create(
                    user=user, task=task,
                    start_time=start, end_time=start + timedelta(seconds=dur),
                    duration_seconds=dur,
                )

    def _create_notes(self, tasks):
        if not tasks:
            return
        sample_size = max(1, len(tasks) // 3)
        sample_size = min(sample_size, len(tasks))
        sample = random.sample(tasks, sample_size)
        for task in sample:
            if random.random() < 0.3:
                continue
            if not task.column:
                continue
            Note.objects.create(
                task=task,
                user=task.project.user,
                content=random.choice(NOTE_TEMPLATES),
            )
