"""
Import department data into the database.
Run with: python manage.py shell < import_departments.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import Department

# Clear existing departments
Department.objects.all().delete()

# Department data from user
departments = [
    ("BIO", "Biology"),
    ("MCB", "Microbiology"),
    ("CHM", "Chemistry"),
    ("PHY", "Physics"),
    ("MTH", "Mathematics"),
    ("ECN", "Economics"),
    ("ENG", "English"),
    ("GNE", "General Engineering"),
    ("ACC", "Accounting"),
    ("NSC", "Nursing Science"),
    ("POL", "Political Science"),
    ("AGY", "Applied Geology"),
    ("MEE", "Mechanical Engineering"),
    ("HID", "History & Diplomatic Studies"),
    ("CSC", "Computer Science"),
    ("MAC", "Mass Communication"),
    ("PFA", "Performing & Film Arts"),
    ("THM", "Tourism & Hospitality Management"),
    ("EEE", "Electrical/Electronics Engineering"),
    ("EMT", "Environmental Management & Toxicology"),
    ("BTH", "Biotechnology"),
    ("CVE", "Civil Engineering"),
    ("ATE", "Automotive Engineering"),
    ("MLS", "Medical & Laboratory Science"),
    ("CYB", "Cyber Security"),
    ("AGP", "Applied Geophysics"),
    ("BUS", "Business Administration"),
    ("MSS", "Mathematics for Social Sciences"),
    ("HRM", "Human Resource Management"),
    ("IRD", "International Relations"),
    ("BFN", "Banking & Finance"),
    ("SOC", "Sociology"),
    ("ARC", "Architecture"),
]

# Import departments
count = 0
for code, name in departments:
    Department.objects.create(code=code, name=name)
    count += 1
    print(f"Imported: {code} - {name}")

print(f"\n✅ Successfully imported {count} departments!")
