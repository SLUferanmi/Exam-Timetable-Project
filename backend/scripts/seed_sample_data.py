"""
seed_sample_data.py
====================
Seeds a controlled, algorithm-testable sample project into the database.

Sample size rationale:
  - 6 real departments from the university catalog
  - 5 courses per department (mix of 100L–400L), 30 courses total
  - 5 halls with proper single/mixed capacities set on ALL of them
  - Required capacities deliberately spread: tiny (8), small (20), medium (40),
    large (70), oversized (110) — the last one MUST split across halls
  - No student/enrollment records — the algorithm uses required_capacity only.
    Department conflict guard is the primary protection mechanism.

To run:
    venv/Scripts/python.exe seed_sample_data.py
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import (
    TimetableProject, Course, Hall,
    ProjectCourse, ProjectHall, Constraint,
    Student, Enrollment,
)
from django.contrib.auth import get_user_model

User = get_user_model()

# ─────────────────────────────────────────────────────────────────────────────
# 1. SAMPLE COURSES
#    6 departments × 5 courses = 30 courses
#    required_capacity is set at ProjectCourse level (not on Course model itself)
# ─────────────────────────────────────────────────────────────────────────────
#
# Departments chosen: Computer Science, Mass Communication, Mechanical Engineering,
#   Nursing Science, Economics, Political Science
# These are among the highest-course-count departments in the real catalog and
# represent a good mix of faculty types.
#
# Format: (code, title, department_string, semester, required_capacity)
#   - department_string MUST be consistent — it is the key the dept-conflict guard uses
#   - semester: 'First', 'Second', or 'Both'
#   - required_capacity: number of exam seats needed

SAMPLE_COURSES = [
    # ── Computer Science (6 courses) ──────────────────────────────────────────
    # Large 100L (will share or split), regular 200L/300L, tiny 400L electives
    ("CSC 101", "Introduction to Computing",          "Computer Science", "First",  110),  # forces split
    ("CSC 201", "Data Structures",                    "Computer Science", "First",   70),  # needs large hall
    ("CSC 211", "Discrete Mathematics",               "Computer Science", "First",   40),  # medium
    ("CSC 301", "Algorithms",                         "Computer Science", "First",   35),  # medium
    ("CSC 401", "Software Engineering",               "Computer Science", "First",   20),  # small
    ("CSC 411", "Compiler Design",                    "Computer Science", "First",    8),  # tiny → triggers pairing

    # ── Mass Communication (5 courses) ────────────────────────────────────────
    ("MAC 101", "Intro to Mass Communication",        "Mass Communication", "First", 85),  # large
    ("MAC 201", "Broadcast Journalism",               "Mass Communication", "First", 45),  # medium
    ("MAC 211", "Media Law",                          "Mass Communication", "First", 30),  # medium-small
    ("MAC 301", "Public Relations",                   "Mass Communication", "First", 22),  # small
    ("MAC 401", "Media Management",                   "Mass Communication", "First", 12),  # tiny

    # ── Mechanical Engineering (5 courses) ────────────────────────────────────
    ("MEE 101", "Engineering Mechanics",              "Mechanical Engineering", "First", 95),  # large
    ("MEE 201", "Thermodynamics",                     "Mechanical Engineering", "First", 55),  # medium-large
    ("MEE 211", "Fluid Mechanics",                    "Mechanical Engineering", "First", 40),  # medium
    ("MEE 301", "Machine Design",                     "Mechanical Engineering", "First", 28),  # small
    ("MEE 401", "Manufacturing Technology",           "Mechanical Engineering", "First", 15),  # tiny

    # ── Nursing Science (5 courses) ───────────────────────────────────────────
    ("NSC 101", "Anatomy & Physiology",               "Nursing Science", "First", 80),  # large
    ("NSC 201", "Medical-Surgical Nursing",           "Nursing Science", "First", 50),  # medium
    ("NSC 211", "Pharmacology",                       "Nursing Science", "First", 38),  # medium
    ("NSC 301", "Community Health Nursing",           "Nursing Science", "First", 25),  # small
    ("NSC 401", "Nursing Research",                   "Nursing Science", "First", 10),  # tiny

    # ── Economics (5 courses) ─────────────────────────────────────────────────
    ("ECN 101", "Principles of Economics",            "Economics", "First", 100),  # large
    ("ECN 201", "Microeconomics",                     "Economics", "First",  60),  # medium-large
    ("ECN 211", "Statistics for Economics",           "Economics", "First",  42),  # medium
    ("ECN 301", "Econometrics",                       "Economics", "First",  30),  # small
    ("ECN 401", "Development Economics",              "Economics", "First",  14),  # tiny

    # ── Political Science (5 courses) ─────────────────────────────────────────
    ("POL 101", "Intro to Political Science",         "Political Science", "First", 90),  # large
    ("POL 201", "Comparative Politics",               "Political Science", "First", 55),  # medium-large
    ("POL 211", "Political Theory",                   "Political Science", "First", 35),  # medium
    ("POL 301", "International Relations",            "Political Science", "First", 20),  # small
    ("POL 401", "Public Administration",              "Political Science", "First",  9),  # tiny → triggers pairing

    # ── General Studies (cross-department, semester='Both') ───────────────────
    # GST courses do NOT belong to one dept — give them their own dept string.
    # These test the case where a course appears across many students.
    ("GST 111", "Logic, Philosophy & Human Existence","General Studies", "Both",  200),  # very large → must split
    ("GST 112", "Communication in English",           "General Studies", "Both",  180),  # large → likely split
]


# ─────────────────────────────────────────────────────────────────────────────
# 2. SAMPLE HALLS
#    5 real halls from your database — with ALL capacities properly filled in.
#    Chosen to create a realistic but stress-testing venue pool.
#
#    Total single-mode capacity per slot: 70+48+48+100+70 = 336
#    Total mixed-mode capacity per slot:  100+96+96+166+70 = 528 (with PFA using its real limits)
#    This is tight enough to require sharing and splitting.
# ─────────────────────────────────────────────────────────────────────────────
#
# Format: (name, physical_cap, exam_capacity_single, exam_capacity_mixed)

SAMPLE_HALLS = [
    # Small halls — will be forced to share courses
    ("BA006",           50,   28,  46),   # ~28 single, 46 mixed
    ("BA001",           48,   16,  32),   # tiny in single mode

    # Medium halls
    ("BA 202",         144,   48,  96),   # workhorse hall
    ("BA 203",         144,   48,  96),   # same size twin

    # Large halls
    ("PFA",            166,   70, 100),   # biggest with real single/mixed limits
]


# ─────────────────────────────────────────────────────────────────────────────
# 3. SEED
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_NAME = "Algorithm Test — Sample 32 Courses"


def run():
    admin, _ = User.objects.get_or_create(
        username='admin',
        defaults={'is_superuser': True, 'is_staff': True}
    )

    # Create or reset the sample project
    project, created = TimetableProject.objects.get_or_create(
        name=PROJECT_NAME,
        defaults={
            'created_by': admin,
            'academic_session': '2024/2025',
            'semester': 'First',
        }
    )
    if created:
        print(f"[OK] Created project: '{PROJECT_NAME}'")
    else:
        # Wipe existing project courses and halls so we start clean
        ProjectCourse.objects.filter(project=project).delete()
        ProjectHall.objects.filter(project=project).delete()
        print(f"[RESET] Reset existing project: '{PROJECT_NAME}'")

    # -- Seed courses ──────────────────────────────────────────────────────────
    course_count = 0
    for code, title, department, semester, capacity in SAMPLE_COURSES:
        course, _ = Course.objects.get_or_create(
            code=code,
            defaults={
                'title': title,
                'department': department,
                'semester': semester,
            }
        )
        # Always update title, department, semester to match our sample definition
        course.title = title
        course.department = department
        course.semester = semester
        course.save()

        ProjectCourse.objects.create(
            project=project,
            course=course,
            required_capacity=capacity,
            duration_minutes=120,
        )
        course_count += 1

    print(f"[OK] Seeded {course_count} courses into project")

    # -- Seed halls ────────────────────────────────────────────────────────────
    hall_count = 0
    for name, cap, single_cap, mixed_cap in SAMPLE_HALLS:
        hall, _ = Hall.objects.get_or_create(
            name=name,
            defaults={
                'capacity': cap,
                'exam_capacity_single': single_cap,
                'exam_capacity_mixed': mixed_cap,
            }
        )
        # Always update capacities to match our sample definition
        hall.capacity = cap
        hall.exam_capacity_single = single_cap
        hall.exam_capacity_mixed = mixed_cap
        hall.save()

        ProjectHall.objects.create(
            project=project,
            hall=hall,
            is_active=True,
        )
        hall_count += 1

    print(f"[OK] Seeded {hall_count} halls into project")

    # -- Seed constraints ──────────────────────────────────────────────────────
    for constraint_type, _ in [
        ('student_conflict',    'No student has two exams at the same time'),
        ('department_conflict', 'No department has two exams at the same time'),
        ('venue_capacity',      'Venue capacity must accommodate all students'),
    ]:
        Constraint.objects.get_or_create(
            project=project,
            constraint_type=constraint_type,
            defaults={'enabled': True}
        )

    print(f"[OK] Constraints initialized")

    # -- Seed Demo Students & Enrollments ──────────────────────────────────────
    # Clear existing demo data
    Enrollment.objects.filter(project=project).delete()
    Student.objects.filter(matric_no__startswith='DEMO-').delete()
    print(f"[OK] Cleared old demo students and enrollments")

    dept_prefixes = {
        "Computer Science": "CSC",
        "Mass Communication": "MAC",
        "Mechanical Engineering": "MEE",
        "Nursing Science": "NSC",
        "Economics": "ECN",
        "Political Science": "POL"
    }

    project_courses = {pc.course.code: pc for pc in ProjectCourse.objects.filter(project=project)}
    student_count_seeded = 0
    enrollment_count_seeded = 0

    for dept_name, prefix in dept_prefixes.items():
        # Create 100L students (4 students)
        for i in range(1, 5):
            matric = f"DEMO-24-{prefix}-{i:03d}"
            student = Student.objects.create(
                matric_no=matric,
                department=dept_name,
                level=100
            )
            student_count_seeded += 1
            
            # Enroll in 100L core course (e.g. prefix + " 101")
            core_code = f"{prefix} 101"
            if core_code in project_courses:
                Enrollment.objects.create(
                    project=project,
                    student=student,
                    project_course=project_courses[core_code],
                    is_carryover=False
                )
                enrollment_count_seeded += 1
            
            # Enroll in general courses: GST 111, GST 112
            for gst in ["GST 111", "GST 112"]:
                if gst in project_courses:
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=project_courses[gst],
                        is_carryover=False
                    )
                    enrollment_count_seeded += 1

        # Create 200L students (3 students)
        for i in range(1, 4):
            matric = f"DEMO-23-{prefix}-{i:03d}"
            student = Student.objects.create(
                matric_no=matric,
                department=dept_name,
                level=200
            )
            student_count_seeded += 1

            # Enroll in 200L core courses (e.g. prefix + " 201", prefix + " 211")
            for suffix in ["201", "211"]:
                core_code = f"{prefix} {suffix}"
                if core_code in project_courses:
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=project_courses[core_code],
                        is_carryover=False
                    )
                    enrollment_count_seeded += 1

            # Carryover triggers:
            # Student 1 gets core 101 as carryover
            if i == 1:
                core_101 = f"{prefix} 101"
                if core_101 in project_courses:
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=project_courses[core_101],
                        is_carryover=True
                    )
                    enrollment_count_seeded += 1

            # Student 2 gets GST 111 as carryover
            if i == 2:
                gst_111 = "GST 111"
                if gst_111 in project_courses:
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=project_courses[gst_111],
                        is_carryover=True
                    )
                    enrollment_count_seeded += 1

        # Create 300L students (3 students)
        for i in range(1, 4):
            matric = f"DEMO-22-{prefix}-{i:03d}"
            student = Student.objects.create(
                matric_no=matric,
                department=dept_name,
                level=300
            )
            student_count_seeded += 1

            # Enroll in 300L core course (e.g. prefix + " 301")
            core_code = f"{prefix} 301"
            if core_code in project_courses:
                Enrollment.objects.create(
                    project=project,
                    student=student,
                    project_course=project_courses[core_code],
                    is_carryover=False
                )
                enrollment_count_seeded += 1

            # Carryover triggers:
            # Student 1 gets core 201 as carryover
            if i == 1:
                core_201 = f"{prefix} 201"
                if core_201 in project_courses:
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=project_courses[core_201],
                        is_carryover=True
                    )
                    enrollment_count_seeded += 1

    print(f"[OK] Seeded {student_count_seeded} students and {enrollment_count_seeded} enrollments with carryovers.")

    # -- Summary ---------------------------------------------------------------
    print()
    print("=" * 60)
    print(f"PROJECT: {PROJECT_NAME}  (id={project.id})")
    print("=" * 60)

    total_single = sum(h[2] for h in SAMPLE_HALLS)
    total_mixed  = sum(h[3] for h in SAMPLE_HALLS)
    print(f"  Courses:                {course_count}")
    print(f"  Halls:                  {hall_count}")
    print(f"  Total single capacity:  {total_single} seats/slot")
    print(f"  Total mixed capacity:   {total_mixed} seats/slot")
    print()
    print("  -- What each course triggers --")
    for code, _, dept, _, cap in SAMPLE_COURSES:
        flag = ""
        if cap > total_single:
            flag = "! MUST SPLIT (exceeds all-single capacity)"
        elif cap > max(h[2] for h in SAMPLE_HALLS):
            flag = "-> needs largest hall OR split"
        elif cap <= 10:
            flag = "-> tiny: triggers pairing post-pass"
        print(f"  {code:<10} cap={cap:>4}  dept={dept[:22]:<22}  {flag}")

    print()
    print("  -- Next step --")
    print(f"  1. Go to the frontend and open project id={project.id}")
    print(f"  2. Generate timeslots (e.g. 5 days Mon-Fri)")
    print(f"  3. Click Generate Timetable")
    print(f"  4. Verify the output against the expected behaviours in the deep dive doc")
    print()


if __name__ == '__main__':
    run()
