from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Reset a user's password by email"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="The email of the user")
        parser.add_argument("password", type=str, help="The new password")

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        if not password:
            self.stdout.write(self.style.ERROR("Password cannot be empty."))
            return

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"User with email '{email}' does not exist."))
            return

        try:
            validate_password(password, user=user)
        except ValidationError as e:
            self.stdout.write(self.style.ERROR("Password validation failed:"))
            for error in e.messages:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
            return

        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS(f"Successfully reset password for '{email}'."))
