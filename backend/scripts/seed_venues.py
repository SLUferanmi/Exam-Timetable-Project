import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import Hall

venue_data = [
    {"name": "PFA", "capacity": 166, "exam_capacity_single": 70, "exam_capacity_mixed": 100},
    {"name": "BA001", "capacity": 48, "exam_capacity_single": 16, "exam_capacity_mixed": 32},
    {"name": "HM004", "capacity": 24, "exam_capacity_single": 8, "exam_capacity_mixed": 16},
    {"name": "BA006", "capacity": 50, "exam_capacity_single": 28, "exam_capacity_mixed": 46},
    {"name": "BA103", "capacity": 50, "exam_capacity_single": 28, "exam_capacity_mixed": 46},
    {"name": "BA104", "capacity": 15, "exam_capacity_single": 15, "exam_capacity_mixed": 15},
    {"name": "BA 202", "capacity": 144, "exam_capacity_single": 48, "exam_capacity_mixed": 96},
    {"name": "BA 203", "capacity": 144, "exam_capacity_single": 48, "exam_capacity_mixed": 96},
    {"name": "HM 002", "capacity": 48, "exam_capacity_single": 16, "exam_capacity_mixed": 48},
    {"name": "HM 202", "capacity": 144, "exam_capacity_single": 48, "exam_capacity_mixed": 96},
    {"name": "HM 203", "capacity": 144, "exam_capacity_single": 48, "exam_capacity_mixed": 96},
    {"name": "BEDC", "capacity": 144, "exam_capacity_single": 48, "exam_capacity_mixed": 96},
]

def seed_venues():
    print("Starting venue seeding process...")
    for item in venue_data:
        # Try to find existing hall to update, otherwise create it
        hall, created = Hall.objects.get_or_create(
            name=item["name"],
            defaults={
                "capacity": item["capacity"],
                "exam_capacity_single": item["exam_capacity_single"],
                "exam_capacity_mixed": item["exam_capacity_mixed"]
            }
        )
        if not created:
            # Update existing
            hall.capacity = item["capacity"]
            hall.exam_capacity_single = item["exam_capacity_single"]
            hall.exam_capacity_mixed = item["exam_capacity_mixed"]
            hall.save()
            print(f"Updated existing mapping for '{item['name']}'")
        else:
            print(f"Created new mapping for '{item['name']}'")

    print("\nVenue seeding completed successfully!")

if __name__ == '__main__':
    seed_venues()
