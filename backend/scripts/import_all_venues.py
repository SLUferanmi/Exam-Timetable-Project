"""
Import all venue data from the project into the database
Run with: python manage.py shell < import_all_venues.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import TimetableProject, Hall, ProjectHall
from django.contrib.auth import get_user_model

User = get_user_model()
# Make sure an admin user exists for master project
admin_user, _ = User.objects.get_or_create(username='admin', defaults={'is_superuser': True})

project, _ = TimetableProject.objects.get_or_create(
    name="University Master Data",
    defaults={'created_by': admin_user}
)

basic_applied_venues = [
    ("PFA", 166), ("BA001", 48), ("BA002", 50), ("HM004", 24),
    ("BA006", 50), ("BA103", 50), ("BA104", 15), ("BA202", 144),
    ("BA203", 144), ("HM002", 48), ("HM202", 144), ("HM203", 144),
    ("BEDC", 100),
]
law_venues = [("LR1", 70), ("LR2", 70), ("LR3", 70), ("LR4", 70), ("LR5", 70)]
engineering_venues = [
    ("LH002", 50), ("GF020", 32), ("LH004", 50), ("LIB001", 40),
    ("LH005", 48), ("LH006", 42), ("LH007", 42), ("LIB103", 40),
    ("LH101", 64), ("LH102", 42), ("LH103", 48), ("LH104", 60),
    ("LH105", 42), ("LH106", 42), ("LH107", 64), ("EEE LH II", 36),
    ("EEE Conf. Room", 32), ("LIB201", 40), ("LH201", 48),
    ("LH202", 60), ("LH203", 48), ("LH204", 44), ("LH205", 78),
    ("Drawing Studio", 26),
]

all_venues = basic_applied_venues + law_venues + engineering_venues

count = 0
for name, capacity in all_venues:
    hall, _ = Hall.objects.get_or_create(name=name, defaults={'capacity': capacity})
    ProjectHall.objects.get_or_create(project=project, hall=hall, defaults={'is_active': True})
    count += 1
    print(f"Imported: {name} (Capacity: {capacity})")

print(f"\n✅ Successfully imported {count} venues!")
