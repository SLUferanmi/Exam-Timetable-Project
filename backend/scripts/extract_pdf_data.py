"""
PDF Data Extractor — Exam Timetable Project
Reads one or more PDF timetables and seeds courses + halls into the database.

Improvements:
- Includes latest 2025/26 timetable
- Marks GST/ENT/general codes as semester='Both'
- Extracts hall names from table rows
- Deduplicates across multiple files
"""
import pdfplumber
import re
import os
import django
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import TimetableProject, Course, Hall, ProjectCourse, ProjectHall
from django.contrib.auth import get_user_model

User = get_user_model()

# ─── Prefixes considered "general/all-department" courses ──────────────────
GENERAL_PREFIXES = {'GST', 'ENT', 'GSP', 'GNS', 'HUM', 'CRS', 'ISL', 'GES'}

# ─── Known halls from official faculty timetable document ──────────────────
KNOWN_HALLS = [
    # Faculty of Basic & Applied Sciences – official spacing rules applied
    ("PFA",        166, 70,  100),
    ("BA001",       48, 16,   32),
    ("HM004",       24,  8,   16),
    ("BA006",       50, 28,   46),
    ("BA103",       50, 28,   46),
    ("BA104",       15, None, None),   # Practical exam only
    ("BA 202",     144, 48,   96),
    ("BA 203",     144, 48,   96),
    ("HM 002",      48, 16,   48),
    ("HM 202",     144, 48,   96),
    ("HM 203",     144, 48,   96),
    ("BEDC",       144, 48,   96),

    # Additional halls found in the latest timetable
    ("Virtual Library",        200, None, None),
    ("Main Auditorium",        500, None, None),
    ("Faculty of Law Auditorium", 200, None, None),
    ("Engineering Drawing Studio", 100, None, None),
    ("LH1",                     50, None, None),
    ("LH2",                     50, None, None),
    ("Humanities Hall",        150, None, None),
    ("Science LR 1",            80, None, None),
    ("ICT Hall",               120, None, None),
    ("CST LH1",                 80, None, None),
    ("CST LH2",                 80, None, None),
    ("Mass Comm Auditorium",   100, None, None),
]

def extract_from_pdf(pdf_path):
    print(f"Processing {pdf_path}...")
    courses_found = {}
    halls_found = set()

    # Matches: CSC 423 or CSC423 (40) / CSC 423(40)
    course_pattern = re.compile(r'\b([A-Z]{3})\s?(\d{3})(?:\s?\((\d+)\))?')

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            matches = course_pattern.findall(text)
            for prefix, number, capacity_str in matches:
                full_code = f"{prefix} {number}"
                capacity = int(capacity_str) if capacity_str else 50

                if full_code not in courses_found:
                    courses_found[full_code] = capacity
                else:
                    courses_found[full_code] = max(courses_found[full_code], capacity)

            # Extract hall names from text lines
            for line in text.split('\n'):
                for hall_name, *_ in KNOWN_HALLS:
                    if hall_name.lower() in line.lower():
                        halls_found.add(hall_name)

    return courses_found, halls_found


def seed_database():
    admin_user, _ = User.objects.get_or_create(
        username='admin', defaults={'is_superuser': True, 'is_staff': True}
    )
    master_project, _ = TimetableProject.objects.get_or_create(
        name="University Master Data",
        defaults={'created_by': admin_user}
    )

    files = [
        r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\FINAL DRAFT First Semester_2023_2024 Exam timetable.pdf",
        r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\Final_copy_First semester_examination_timetable.pdf",
        r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\Final_copy_25_26_First Semester Exam timetable (2).pdf",
    ]

    all_courses = {}

    for f in files:
        if os.path.exists(f):
            courses, _ = extract_from_pdf(f)
            for code, cap in courses.items():
                all_courses[code] = max(all_courses.get(code, 0), cap)
        else:
            print(f"  ⚠  File not found: {f}")

    print(f"\nFound {len(all_courses)} unique courses across all PDFs.")

    new_count = 0
    for code, capacity in all_courses.items():
        prefix = code.split(' ')[0]
        semester = 'Both' if prefix in GENERAL_PREFIXES else 'First'

        course, created = Course.objects.get_or_create(
            code=code,
            defaults={
                'title': f'{code} (Imported)',
                'department': prefix,
                'semester': semester,
            }
        )
        # Fix semester for pre-existing GST courses that may have been 'First'
        if not created and prefix in GENERAL_PREFIXES and course.semester != 'Both':
            course.semester = 'Both'
            course.save()
            print(f"  ✓ Updated {code} to semester=Both")

        pc, _ = ProjectCourse.objects.get_or_create(
            project=master_project,
            course=course,
            defaults={'required_capacity': capacity, 'duration_minutes': 120}
        )
        if pc.required_capacity != capacity:
            pc.required_capacity = capacity
            pc.save()

        if created:
            new_count += 1

    print(f"Seeded {new_count} new courses into Master Project.")

    # Seed all known halls
    hall_count = 0
    for name, cap, single_cap, mixed_cap in KNOWN_HALLS:
        hall, created = Hall.objects.get_or_create(
            name=name,
            defaults={
                'capacity': cap,
                'exam_capacity_single': single_cap,
                'exam_capacity_mixed': mixed_cap,
            }
        )
        ProjectHall.objects.get_or_create(
            project=master_project, hall=hall, defaults={'is_active': True}
        )
        if created:
            hall_count += 1

    print(f"Seeded {hall_count} new halls.")
    print("\n✅ Database seeding complete!")


if __name__ == "__main__":
    seed_database()
