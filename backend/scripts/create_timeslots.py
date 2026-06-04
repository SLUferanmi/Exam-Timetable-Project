"""
Script to create a 2-week exam period with appropriate timeslots.
Run with: python manage.py shell < create_timeslots.py
"""
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import TimetableProject, TimeSlot

# Get the master project
try:
    project = TimetableProject.objects.get(name="University Master Data")
except TimetableProject.DoesNotExist:
    print("Error: University Master Data project not found!")
    print("Please run import_all_venues.py first.")
    exit(1)

# Clear existing timeslots
TimeSlot.objects.filter(project=project).delete()

# Create 2-week exam period
# Typically: Monday-Saturday, 2 sessions per day (Morning & Afternoon)
start_date = datetime(2024, 6, 3)  # Example: June 3, 2024 (Monday)

sessions = [
    ("Morning", "08:15", "10:15"),
    ("Midday", "11:00", "13:00"),
    ("Afternoon", "14:00", "17:00"),
]

days_of_week = [0, 1, 2, 3, 4, 5]  # Monday to Saturday (0=Monday, 6=Sunday)
total_days = 14  # 2 weeks

count = 0
current_date = start_date

for day in range(total_days):
    # Skip Sundays
    if current_date.weekday() == 6:
        current_date += timedelta(days=1)
        continue
    
    for session_name, start_time, end_time in sessions:
        TimeSlot.objects.create(
            project=project,
            date=current_date.date(),
            start_time=start_time,
            end_time=end_time
        )
        count += 1
        print(f"Created: {current_date.strftime('%A, %B %d, %Y')} - {session_name} ({start_time}-{end_time})")
    
    current_date += timedelta(days=1)

print(f"\n✅ Successfully created {count} timeslots over 2 weeks!")
print(f"Exam period: {start_date.strftime('%B %d')} - {(start_date + timedelta(days=13)).strftime('%B %d, %Y')}")
