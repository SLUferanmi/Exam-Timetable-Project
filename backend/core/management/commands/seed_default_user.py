from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create a default test user (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="testadmin", help="Username for the test account")
        parser.add_argument("--password", default="testadmin12345", help="Password for the test account")
        parser.add_argument("--email", default="testadmin@example.com", help="Email for the test account")
        parser.add_argument("--superuser", action="store_true", default=True, help="Create as superuser")
        parser.add_argument("--staff", action="store_true", default=True, help="Create as staff")

    def handle(self, *args, **options):
        User = get_user_model()

        username = options["username"]
        password = options["password"]
        email = options["email"]
        is_superuser = options["superuser"]
        is_staff = options["staff"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_superuser": is_superuser,
                "is_staff": is_staff,
                "is_active": True,
            },
        )

        # If the user already exists, we do not overwrite the password unless you explicitly want it.
        # For this project, keeping it idempotent avoids accidentally breaking your login.
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"Created default user: {username}"))
        else:
            self.stdout.write(self.style.WARNING(f"User already exists: {username} (password not changed)"))

