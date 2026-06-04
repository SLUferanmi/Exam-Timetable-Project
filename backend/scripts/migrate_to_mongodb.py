"""
Migrate data from MySQL to MongoDB.
Uses raw SQL queries for MySQL to bypass Django ORM field naming conflicts,
and Django ORM bulk_create to write to MongoDB Atlas rapidly.
"""
import os
import sys
import django
import json
import datetime
import MySQLdb
import MySQLdb.cursors

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import (
    TimetableProject, Department, Student, Course, Hall,
    ProjectCourse, ProjectHall, TimeSlot, Enrollment,
    Constraint, ExamSchedule, HistoricalEntry, CoursePreference
)

User = get_user_model()

def clean_time(val):
    if val is None:
        return None
    if isinstance(val, datetime.time):
        return val
    if isinstance(val, datetime.timedelta):
        total_seconds = int(val.total_seconds())
        hours = (total_seconds // 3600) % 24
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return datetime.time(hours, minutes, seconds)
    if isinstance(val, str):
        try:
            return datetime.time.fromisoformat(val)
        except Exception:
            return val
    return val

def main():
    print("=" * 80)
    print("STARTING BULK DATA MIGRATION: MYSQL -> MONGODB")
    print("=" * 80)

    # Connect to MySQL database
    try:
        mysql_conn = MySQLdb.connect(
            host='localhost',
            user='root',
            passwd='Feranmi123',
            db='scheduling exam',
            port=3306,
            charset='utf8mb4'
        )
        mysql_cur = mysql_conn.cursor(MySQLdb.cursors.DictCursor)
        print("Connected to MySQL successfully.")
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return

    try:
        # Clear existing MongoDB collections (except User, we keep or update Users)
        print("\nClearing target MongoDB collections to ensure clean migration...")
        ProjectCourse.objects.using('default').all().delete()
        ProjectHall.objects.using('default').all().delete()
        TimeSlot.objects.using('default').all().delete()
        Enrollment.objects.using('default').all().delete()
        Constraint.objects.using('default').all().delete()
        ExamSchedule.objects.using('default').all().delete()
        HistoricalEntry.objects.using('default').all().delete()
        CoursePreference.objects.using('default').all().delete()
        TimetableProject.objects.using('default').all().delete()
        Department.objects.using('default').all().delete()
        Student.objects.using('default').all().delete()
        Course.objects.using('default').all().delete()
        Hall.objects.using('default').all().delete()
        print("Collections cleared.")

        # 1. Migrate Users
        print("\n[Users] Migrating Users...")
        user_map = {}
        mysql_cur.execute("SELECT * FROM core_user")
        mysql_users = mysql_cur.fetchall()
        for row in mysql_users:
            new_user, created = User.objects.using('default').get_or_create(
                username=row['username'],
                defaults={
                    'email': row['email'],
                    'password': row['password'],
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'is_staff': row['is_staff'],
                    'is_active': row['is_active'],
                    'is_superuser': row['is_superuser'],
                    'is_email_verified': bool(row.get('is_email_verified', False)),
                    'date_joined': row['date_joined'],
                    'last_login': row['last_login'],
                }
            )
            user_map[row['id']] = new_user
            print(f"   Mapped User: {new_user.username}")

        # 2. Migrate Departments
        print("\n[Departments] Migrating Departments...")
        mysql_cur.execute("SELECT * FROM scheduling_department")
        mysql_depts = mysql_cur.fetchall()
        depts_to_create = [Department(name=row['name']) for row in mysql_depts]
        created_depts = Department.objects.using('default').bulk_create(depts_to_create)
        dept_map = {old_row['id']: new_obj for old_row, new_obj in zip(mysql_depts, created_depts)}
        print(f"   Migrated {len(created_depts)} departments.")

        # 3. Migrate Students
        print("\n[Students] Migrating Students...")
        mysql_cur.execute("SELECT * FROM scheduling_student")
        mysql_students = mysql_cur.fetchall()
        students_to_create = [
            Student(matric_no=row['matric_no'], department=row['department'], level=row['level'])
            for row in mysql_students
        ]
        created_students = Student.objects.using('default').bulk_create(students_to_create)
        student_map = {old_row['id']: new_obj for old_row, new_obj in zip(mysql_students, created_students)}
        print(f"   Migrated {len(created_students)} students.")

        # 4. Migrate Courses
        print("\n[Courses] Migrating Courses...")
        mysql_cur.execute("SELECT * FROM scheduling_course")
        mysql_courses = mysql_cur.fetchall()
        courses_to_create = [
            Course(code=row['code'], title=row['title'], department=row['department'], semester=row['semester'])
            for row in mysql_courses
        ]
        created_courses = Course.objects.using('default').bulk_create(courses_to_create)
        course_map = {old_row['id']: new_obj for old_row, new_obj in zip(mysql_courses, created_courses)}
        print(f"   Migrated {len(created_courses)} courses.")

        # 5. Migrate Halls
        print("\n[Halls] Migrating Halls...")
        mysql_cur.execute("SELECT * FROM scheduling_hall")
        mysql_halls = mysql_cur.fetchall()
        halls_to_create = [
            Hall(
                name=row['name'],
                capacity=row['capacity'],
                exam_capacity_single=row['exam_capacity_single'],
                exam_capacity_mixed=row['exam_capacity_mixed']
            ) for row in mysql_halls
        ]
        created_halls = Hall.objects.using('default').bulk_create(halls_to_create)
        hall_map = {old_row['id']: new_obj for old_row, new_obj in zip(mysql_halls, created_halls)}
        print(f"   Migrated {len(created_halls)} halls.")

        # 6. Migrate TimetableProjects
        print("\n[Projects] Migrating Projects...")
        mysql_cur.execute("SELECT * FROM scheduling_timetableproject")
        mysql_projects = mysql_cur.fetchall()
        projects_to_create = []
        valid_mysql_projects = []
        for row in mysql_projects:
            creator = user_map.get(row['created_by_id'])
            if not creator:
                continue
            proj = TimetableProject(
                name=row['name'],
                academic_session=row['academic_session'],
                semester=row['semester'],
                created_by=creator,
                exam_start_date=row['exam_start_date'],
                exam_end_date=row['exam_end_date'],
                is_sample_mode=bool(row['is_sample_mode'])
            )
            projects_to_create.append(proj)
            valid_mysql_projects.append(row)
        created_projects = TimetableProject.objects.using('default').bulk_create(projects_to_create)
        project_map = {old_row['id']: new_obj for old_row, new_obj in zip(valid_mysql_projects, created_projects)}
        print(f"   Migrated {len(created_projects)} projects.")

        # 7. Migrate ProjectCourses
        print("\n[Project Courses] Migrating Project Courses...")
        mysql_cur.execute("SELECT * FROM scheduling_projectcourse")
        mysql_pcs = mysql_cur.fetchall()
        pcs_to_create = []
        valid_mysql_pcs = []
        for row in mysql_pcs:
            proj = project_map.get(row['project_id'])
            course = course_map.get(row['course_id'])
            if not proj or not course:
                continue
            pc = ProjectCourse(
                project=proj,
                course=course,
                required_capacity=row['required_capacity'],
                duration_minutes=row['duration_minutes']
            )
            pcs_to_create.append(pc)
            valid_mysql_pcs.append(row)
        created_pcs = ProjectCourse.objects.using('default').bulk_create(pcs_to_create)
        project_course_map = {old_row['id']: new_obj for old_row, new_obj in zip(valid_mysql_pcs, created_pcs)}
        print(f"   Migrated {len(created_pcs)} project courses.")

        # 8. Migrate ProjectHalls
        print("\n[Project Halls] Migrating Project Halls...")
        mysql_cur.execute("SELECT * FROM scheduling_projecthall")
        mysql_phs = mysql_cur.fetchall()
        phs_to_create = []
        valid_mysql_phs = []
        for row in mysql_phs:
            proj = project_map.get(row['project_id'])
            hall = hall_map.get(row['hall_id'])
            if not proj or not hall:
                continue
            ph = ProjectHall(
                project=proj,
                hall=hall,
                is_active=bool(row['is_active'])
            )
            phs_to_create.append(ph)
            valid_mysql_phs.append(row)
        created_phs = ProjectHall.objects.using('default').bulk_create(phs_to_create)
        project_hall_map = {old_row['id']: new_obj for old_row, new_obj in zip(valid_mysql_phs, created_phs)}
        print(f"   Migrated {len(created_phs)} project halls.")

        # 9. Migrate TimeSlots
        print("\n[TimeSlots] Migrating TimeSlots...")
        mysql_cur.execute("SELECT * FROM scheduling_timeslot")
        mysql_slots = mysql_cur.fetchall()
        slots_to_create = []
        valid_mysql_slots = []
        for row in mysql_slots:
            proj = project_map.get(row['project_id'])
            if not proj:
                continue
            ts = TimeSlot(
                project=proj,
                date=row['date'],
                start_time=clean_time(row['start_time']),
                end_time=clean_time(row['end_time'])
            )
            slots_to_create.append(ts)
            valid_mysql_slots.append(row)
        created_slots = TimeSlot.objects.using('default').bulk_create(slots_to_create)
        timeslot_map = {old_row['id']: new_obj for old_row, new_obj in zip(valid_mysql_slots, created_slots)}
        print(f"   Migrated {len(created_slots)} timeslots.")

        # 10. Migrate Enrollments
        print("\n[Enrollments] Migrating Enrollments...")
        mysql_cur.execute("SELECT * FROM scheduling_enrollment")
        mysql_enrolls = mysql_cur.fetchall()
        enrolls_to_create = []
        for row in mysql_enrolls:
            proj = project_map.get(row['project_id'])
            student = student_map.get(row['student_id'])
            pc = project_course_map.get(row['project_course_id'])
            if not proj or not student or not pc:
                continue
            enroll = Enrollment(
                project=proj,
                student=student,
                project_course=pc,
                is_carryover=bool(row['is_carryover'])
            )
            enrolls_to_create.append(enroll)
        created_enrolls = Enrollment.objects.using('default').bulk_create(enrolls_to_create)
        print(f"   Migrated {len(created_enrolls)} enrollments.")

        # 11. Migrate Constraints
        print("\n[Constraints] Migrating Constraints...")
        mysql_cur.execute("SELECT * FROM scheduling_constraint")
        mysql_consts = mysql_cur.fetchall()
        consts_to_create = []
        for row in mysql_consts:
            proj = project_map.get(row['project_id'])
            if not proj:
                continue
            const = Constraint(
                project=proj,
                constraint_type=row['constraint_type'],
                enabled=bool(row['enabled'])
            )
            consts_to_create.append(const)
        created_consts = Constraint.objects.using('default').bulk_create(consts_to_create)
        print(f"   Migrated {len(created_consts)} constraints.")

        # 12. Migrate ExamSchedules
        print("\n[Exam Schedules] Migrating Exam Schedules...")
        mysql_cur.execute("SELECT * FROM scheduling_examschedule")
        mysql_scheds = mysql_cur.fetchall()
        scheds_to_create = []
        for row in mysql_scheds:
            proj = project_map.get(row['project_id'])
            pc = project_course_map.get(row['project_course_id'])
            ph = project_hall_map.get(row['project_hall_id']) if row['project_hall_id'] else None
            ts = timeslot_map.get(row['timeslot_id']) if row['timeslot_id'] else None
            if not proj or not pc:
                continue
            
            violations = []
            if row['constraint_violations']:
                try:
                    if isinstance(row['constraint_violations'], str):
                        violations = json.loads(row['constraint_violations'])
                    else:
                        violations = row['constraint_violations']
                except Exception:
                    violations = []

            sched = ExamSchedule(
                project=proj,
                project_course=pc,
                project_hall=ph,
                timeslot=ts,
                student_allocation=row['student_allocation'],
                preference_guided=bool(row['preference_guided']),
                constraint_violations=violations,
                constraints_total=row['constraints_total'],
                constraints_met=row['constraints_met']
            )
            scheds_to_create.append(sched)
        created_scheds = ExamSchedule.objects.using('default').bulk_create(scheds_to_create)
        print(f"   Migrated {len(created_scheds)} exam schedules.")

        # 13. Migrate HistoricalEntries
        print("\n[Historical Entries] Migrating Historical Entries...")
        mysql_cur.execute("SELECT * FROM scheduling_historicalentry")
        mysql_hists = mysql_cur.fetchall()
        hists_to_create = [
            HistoricalEntry(
                course_code=row['course_code'],
                hall_name=row['hall_name'],
                slot_label=row['slot_label'],
                source_file=row['source_file'],
                created_at=row['created_at']
            ) for row in mysql_hists
        ]
        created_hists = HistoricalEntry.objects.using('default').bulk_create(hists_to_create)
        print(f"   Migrated {len(created_hists)} historical entries.")

        # 14. Migrate CoursePreferences
        print("\n[Course Preferences] Migrating Course Preferences...")
        mysql_cur.execute("SELECT * FROM scheduling_coursepreference")
        mysql_prefs = mysql_cur.fetchall()
        prefs_to_create = [
            CoursePreference(
                course_code=row['course_code'],
                hall_name=row['hall_name'],
                venue_weight=row['venue_weight'],
                morning_weight=row['morning_weight'],
                midday_weight=row['midday_weight'],
                afternoon_weight=row['afternoon_weight']
            ) for row in mysql_prefs
        ]
        created_prefs = CoursePreference.objects.using('default').bulk_create(prefs_to_create)
        print(f"   Migrated {len(created_prefs)} course preferences.")

        print("\n" + "=" * 80)
        print("DATA MIGRATION COMPLETED SUCCESSFULLY (BULK MODE)!")
        print("=" * 80)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nError occurred during data migration: {e}")
    finally:
        mysql_cur.close()
        mysql_conn.close()

if __name__ == "__main__":
    main()
