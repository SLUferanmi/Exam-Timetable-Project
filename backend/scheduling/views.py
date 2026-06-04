from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import (
    TimetableProject,
    Student,
    Course,
    Hall,
    ProjectCourse,
    ProjectHall,
    TimeSlot,
    ExamSchedule,
    Enrollment,
    Constraint,
)
from .serializers import (
    TimetableProjectSerializer,
    StudentSerializer,
    ProjectCourseSerializer,
    ProjectHallSerializer,
    TimeSlotSerializer,
    ExamScheduleSerializer,
    EnrollmentSerializer,
    ConstraintSerializer,
    GlobalCourseSerializer,
    GlobalHallSerializer,
)
import pandas as pd # For data import
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Sample dataset constants — mirrors seed_sample_data.py exactly
# ---------------------------------------------------------------------------
_SAMPLE_COURSES = [
    ("CSC 101", "Introduction to Computing",           "Computer Science",          "First",  110),
    ("CSC 201", "Data Structures",                     "Computer Science",          "First",   70),
    ("CSC 211", "Discrete Mathematics",                "Computer Science",          "First",   40),
    ("CSC 301", "Algorithms",                          "Computer Science",          "First",   35),
    ("CSC 401", "Software Engineering",                "Computer Science",          "First",   20),
    ("CSC 411", "Compiler Design",                     "Computer Science",          "First",    8),
    ("MAC 101", "Intro to Mass Communication",         "Mass Communication",        "First",   85),
    ("MAC 201", "Broadcast Journalism",                "Mass Communication",        "First",   45),
    ("MAC 211", "Media Law",                           "Mass Communication",        "First",   30),
    ("MAC 301", "Public Relations",                    "Mass Communication",        "First",   22),
    ("MAC 401", "Media Management",                    "Mass Communication",        "First",   12),
    ("MEE 101", "Engineering Mechanics",               "Mechanical Engineering",    "First",   95),
    ("MEE 201", "Thermodynamics",                      "Mechanical Engineering",    "First",   55),
    ("MEE 211", "Fluid Mechanics",                     "Mechanical Engineering",    "First",   40),
    ("MEE 301", "Machine Design",                      "Mechanical Engineering",    "First",   28),
    ("MEE 401", "Manufacturing Technology",            "Mechanical Engineering",    "First",   15),
    ("NSC 101", "Anatomy & Physiology",                "Nursing Science",           "First",   80),
    ("NSC 201", "Medical-Surgical Nursing",            "Nursing Science",           "First",   50),
    ("NSC 211", "Pharmacology",                        "Nursing Science",           "First",   38),
    ("NSC 301", "Community Health Nursing",            "Nursing Science",           "First",   25),
    ("NSC 401", "Nursing Research",                    "Nursing Science",           "First",   10),
    ("ECN 101", "Principles of Economics",             "Economics",                 "First",  100),
    ("ECN 201", "Microeconomics",                      "Economics",                 "First",   60),
    ("ECN 211", "Statistics for Economics",            "Economics",                 "First",   42),
    ("ECN 301", "Econometrics",                        "Economics",                 "First",   30),
    ("ECN 401", "Development Economics",               "Economics",                 "First",   14),
    ("POL 101", "Intro to Political Science",          "Political Science",         "First",   90),
    ("POL 201", "Comparative Politics",               "Political Science",         "First",   55),
    ("POL 211", "Political Theory",                    "Political Science",         "First",   35),
    ("POL 301", "International Relations",             "Political Science",         "First",   20),
    ("POL 401", "Public Administration",               "Political Science",         "First",    9),
    ("GST 111", "Logic, Philosophy & Human Existence", "General Studies",           "Both",   200),
    ("GST 112", "Communication in English",            "General Studies",           "Both",   180),
]

_SAMPLE_HALLS = [
    ("BA006",   50,  28,  46),
    ("BA001",   48,  16,  32),
    ("BA 202",  144, 48,  96),
    ("BA 203",  144, 48,  96),
    ("PFA",     166, 70, 100),
]

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

class TimetableProjectViewSet(viewsets.ModelViewSet):
    queryset = TimetableProject.objects.all()
    serializer_class = TimetableProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)

        # Auto-populate per-project selection rows from global catalogs.
        # This avoids manual "clone/import" steps on the frontend.
        master_project = TimetableProject.objects.filter(name="University Master Data").first()

        master_pcs = {}
        if master_project:
            master_pcs = {
                pc.course_id: pc 
                for pc in ProjectCourse.objects.filter(project=master_project)
            }

        project_courses = []
        for course in Course.objects.all():
            default_cap = 0
            default_dur = 120
            master_pc = master_pcs.get(course.id)
            if master_pc:
                default_cap = master_pc.required_capacity
                default_dur = master_pc.duration_minutes

            project_courses.append(
                ProjectCourse(
                    project=project,
                    course=course,
                    required_capacity=default_cap,
                    duration_minutes=default_dur,
                )
            )
        if project_courses:
            ProjectCourse.objects.bulk_create(project_courses)

        project_halls = [
            ProjectHall(project=project, hall=hall, is_active=True)
            for hall in Hall.objects.all()
        ]
        if project_halls:
            ProjectHall.objects.bulk_create(project_halls)

        # Ensure base constraints exist for new projects.
        constraints_to_create = []
        for constraint_type, _label in Constraint.CONSTRAINT_TYPES:
            constraints_to_create.append(
                Constraint(project=project, constraint_type=constraint_type, enabled=True)
            )
        if constraints_to_create:
            Constraint.objects.bulk_create(constraints_to_create)
    
    @action(detail=True, methods=['post'])
    def upload_data(self, request, pk=None):
        project = self.get_object()
        file = request.FILES.get('file')
        data_type = request.data.get('type') # 'students', 'courses', 'halls'
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .importers import parse_and_import_data
        count, error = parse_and_import_data(project, file, data_type)
        
        if error:
             return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'status': 'success', 'imported_count': count})

    @action(detail=True, methods=['post'])
    def clone_master_data(self, request, pk=None):
        project = self.get_object()
        # With global catalogs + per-project selection rows, cloning is just ensuring
        # ProjectCourse/ProjectHall exist for this project.
        master_project = TimetableProject.objects.filter(name="University Master Data").first()

        existing_pc_course_ids = set(ProjectCourse.objects.filter(project=project).values_list('course_id', flat=True))
        master_pcs = {}
        if master_project:
            master_pcs = {
                pc.course_id: pc 
                for pc in ProjectCourse.objects.filter(project=master_project)
            }

        courses_to_create = []
        for course in Course.objects.all():
            if course.id in existing_pc_course_ids:
                continue
            default_cap = 0
            default_dur = 120
            master_pc = master_pcs.get(course.id)
            if master_pc:
                default_cap = master_pc.required_capacity
                default_dur = master_pc.duration_minutes
            
            courses_to_create.append(
                ProjectCourse(
                    project=project,
                    course=course,
                    required_capacity=default_cap,
                    duration_minutes=default_dur,
                )
            )
        
        if courses_to_create:
            ProjectCourse.objects.bulk_create(courses_to_create)
        created_courses = len(courses_to_create)

        existing_ph_hall_ids = set(ProjectHall.objects.filter(project=project).values_list('hall_id', flat=True))
        halls_to_create = []
        for hall in Hall.objects.all():
            if hall.id in existing_ph_hall_ids:
                continue
            halls_to_create.append(
                ProjectHall(
                    project=project,
                    hall=hall,
                    is_active=True,
                )
            )
        
        if halls_to_create:
            ProjectHall.objects.bulk_create(halls_to_create)
        created_halls = len(halls_to_create)

        return Response({'status': 'success', 'cloned_courses': created_courses, 'cloned_halls': created_halls})

    @action(detail=True, methods=['post'])
    def generate_timeslots(self, request, pk=None):
        """
        Generate timeslots based on exam start and end dates.
        3 sessions per day (8:15-10:15, 11am-1pm, 2pm-5pm), Monday-Saturday only.
        """
        project = self.get_object()
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date >= end_date:
            return Response(
                {'error': 'End date must be after start date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update project dates
        project.exam_start_date = start_date
        project.exam_end_date = end_date
        project.save()
        
        # Clear existing timeslots
        TimeSlot.objects.filter(project=project).delete()
        
        # Generate timeslots
        time_sessions = [
            ('08:15:00', '10:15:00'),
            ('11:00:00', '13:00:00'),
            ('14:00:00', '17:00:00'),
        ]
        
        current_date = start_date
        timeslots_created = 0
        exam_days = 0
        
        while current_date <= end_date:
            # Skip Saturday (weekday 5) and Sunday (weekday 6) — Monday–Friday only
            if current_date.weekday() < 5:
                exam_days += 1
                for start_time, end_time in time_sessions:
                    TimeSlot.objects.create(
                        project=project,
                        date=current_date,
                        start_time=start_time,
                        end_time=end_time
                    )
                    timeslots_created += 1
            
            current_date += timedelta(days=1)
        
        return Response({
            'status': 'success',
            'timeslots_created': timeslots_created,
            'exam_days': exam_days,
            'start_date': start_date_str,
            'end_date': end_date_str
        })
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        project = self.get_object()
        from .improved_algo import ImprovedSchedulerWithVenueSharing
        scheduler = ImprovedSchedulerWithVenueSharing(project)
        unscheduled = scheduler.schedule_exams()
        
        status_msg = 'Timetable generated successfully with venue sharing!'
        if unscheduled:
            status_msg = f'Generated with issues. Could not schedule: {", ".join(unscheduled)}'
            
        return Response({'status': status_msg, 'unscheduled': unscheduled})

    @action(detail=True, methods=['post'])
    def toggle_sample_mode(self, request, pk=None):
        """
        Switch a project between sample mode (32-course test set) and
        full catalog mode.

        Body: { "enable": true | false }

        Wipes all ProjectCourse + ProjectHall rows for this project and
        re-seeds from the chosen dataset. Timeslots and schedules are
        left untouched.
        """
        project = self.get_object()
        enable = bool(request.data.get('enable', True))

        # Clear existing per-project data
        ProjectCourse.objects.filter(project=project).delete()
        ProjectHall.objects.filter(project=project).delete()

        if enable:
            _seed_sample_courses(project)
            _seed_sample_halls(project)
        else:
            _seed_from_catalog(project)

        project.is_sample_mode = enable
        project.save(update_fields=['is_sample_mode'])

        course_count = ProjectCourse.objects.filter(project=project).count()
        hall_count   = ProjectHall.objects.filter(project=project).count()

        return Response({
            'status': 'ok',
            'is_sample_mode': project.is_sample_mode,
            'courses_loaded': course_count,
            'halls_loaded': hall_count,
        })


# ---------------------------------------------------------------------------
# Private helpers — not exposed as API endpoints
# ---------------------------------------------------------------------------

def _seed_sample_courses(project):
    """Seed the 32-course sample set into a project."""
    to_create = []
    for code, title, department, semester, capacity in _SAMPLE_COURSES:
        course, _ = Course.objects.get_or_create(
            code=code,
            defaults={'title': title, 'department': department, 'semester': semester},
        )
        # Keep course meta up-to-date
        course.title = title
        course.department = department
        course.semester = semester
        course.save()

        to_create.append(ProjectCourse(
            project=project,
            course=course,
            required_capacity=capacity,
            duration_minutes=120,
        ))
    ProjectCourse.objects.bulk_create(to_create)


def _seed_sample_halls(project):
    """Seed the 5 sample halls into a project."""
    to_create = []
    for name, cap, single_cap, mixed_cap in _SAMPLE_HALLS:
        hall, _ = Hall.objects.get_or_create(
            name=name,
            defaults={
                'capacity': cap,
                'exam_capacity_single': single_cap,
                'exam_capacity_mixed': mixed_cap,
            },
        )
        # Always keep capacities up-to-date
        hall.capacity = cap
        hall.exam_capacity_single = single_cap
        hall.exam_capacity_mixed = mixed_cap
        hall.save()

        to_create.append(ProjectHall(
            project=project,
            hall=hall,
            is_active=True,
        ))
    ProjectHall.objects.bulk_create(to_create)


def _seed_from_catalog(project):
    """Re-seed a project from the full global Course + Hall catalog."""
    master = TimetableProject.objects.filter(name='University Master Data').first()

    course_rows = []
    for course in Course.objects.all():
        default_cap, default_dur = 0, 120
        if master:
            mpc = ProjectCourse.objects.filter(project=master, course=course).first()
            if mpc:
                default_cap = mpc.required_capacity
                default_dur = mpc.duration_minutes
        course_rows.append(ProjectCourse(
            project=project,
            course=course,
            required_capacity=default_cap,
            duration_minutes=default_dur,
        ))
    ProjectCourse.objects.bulk_create(course_rows)

    hall_rows = [
        ProjectHall(project=project, hall=hall, is_active=True)
        for hall in Hall.objects.all()
    ]
    ProjectHall.objects.bulk_create(hall_rows)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

class CourseViewSet(viewsets.ModelViewSet):
    queryset = ProjectCourse.objects.select_related('course').all()
    serializer_class = ProjectCourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = ProjectCourse.objects.select_related('course').all()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class HallViewSet(viewsets.ModelViewSet):
    queryset = ProjectHall.objects.select_related('hall').all()
    serializer_class = ProjectHallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectHall.objects.select_related('hall').all()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class TimeSlotViewSet(viewsets.ModelViewSet):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExamScheduleViewSet(viewsets.ModelViewSet):
    queryset = ExamSchedule.objects.select_related(
        'project_course__course',
        'project_hall__hall',
        'timeslot'
    ).all()
    serializer_class = ExamScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset


class ConstraintViewSet(viewsets.ModelViewSet):
    queryset = Constraint.objects.all()
    serializer_class = ConstraintSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class GlobalCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = GlobalCourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        semester = self.request.query_params.get('semester')
        if semester:
            queryset = queryset.filter(semester=semester)
        return queryset

    @action(detail=False, methods=['post'])
    def rename_department(self, request):
        old_name = request.data.get('old_name')
        new_name = request.data.get('new_name')
        if not old_name or not new_name:
            return Response({'error': 'old_name and new_name required'}, status=400)
        
        updated = Course.objects.filter(department=old_name).update(department=new_name)
        return Response({'status': 'success', 'updated_count': updated})

class GlobalHallViewSet(viewsets.ModelViewSet):
    queryset = Hall.objects.all()
    serializer_class = GlobalHallSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class CompareAlgorithmsView(APIView):
    """
    POST /api/compare-algorithms/
    Body: { "project_id": <int> }

    - Basic Greedy + Traditional run in-memory (nothing written to DB).
    - Improved reads the project's existing ExamSchedule records from the DB,
      guaranteeing the result is identical to what Generate Timetable produced.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .comparison_algos import BasicGreedyScheduler, TraditionalTimetableScheduler
        from .models import HistoricalEntry

        project_id = request.data.get('project_id')
        if not project_id:
            return Response({'error': 'project_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.exceptions import ObjectDoesNotExist  # type: ignore
        try:
            project = TimetableProject.objects.get(id=project_id)
        except ObjectDoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # ── Load project data ──────────────────────────────────────────────────
        project_courses = list(
            ProjectCourse.objects.filter(project=project, required_capacity__gt=0)
            .select_related('course')
            .order_by('course__department', '-required_capacity')
        )
        active_halls = list(
            ProjectHall.objects.filter(project=project, is_active=True)
            .select_related('hall')
            .order_by('-hall__capacity')
        )
        timeslots_qs = list(
            TimeSlot.objects.filter(project=project).order_by('date', 'start_time')
        )

        if not project_courses:
            return Response({'error': 'No courses with student counts. Configure courses first.'}, status=400)
        if not active_halls:
            return Response({'error': 'No active halls found. Configure venues first.'}, status=400)
        if not timeslots_qs:
            return Response({'error': 'No timeslots found. Generate timeslots in Project Setup first.'}, status=400)

        courses = [
            {
                'code':              pc.course.code,
                'title':             pc.course.title,
                'department':        pc.course.department,
                'required_capacity': pc.required_capacity,
            }
            for pc in project_courses
        ]
        halls = [
            {
                'name':                 ph.hall.name,
                'capacity':             ph.hall.capacity,
                'exam_capacity_single': ph.hall.exam_capacity_single,
                'exam_capacity_mixed':  ph.hall.exam_capacity_mixed,
            }
            for ph in active_halls
        ]
        timeslots = [
            {
                'id':         ts.id,
                'date':       ts.date,
                'start_time': ts.start_time,
                'end_time':   ts.end_time,
            }
            for ts in timeslots_qs
        ]

        # ── Historical entries for Traditional algorithm ────────────────────────
        course_codes = [c['code'] for c in courses]
        historical_entries = list(
            HistoricalEntry.objects.filter(course_code__in=course_codes)
            .values('course_code', 'hall_name', 'slot_label')
        )
        hist_course_count = len({e['course_code'] for e in historical_entries})

        # ── Run Basic Greedy + Traditional in-memory ──────────────────────────
        basic       = BasicGreedyScheduler(courses, halls, timeslots).schedule()
        traditional = TraditionalTimetableScheduler(courses, halls, timeslots, historical_entries).schedule()

        import time
        # ── Improved: read existing ExamSchedule records ──────────────────────
        t0_improved = time.time()
        existing_schedules = list(
            ExamSchedule.objects.filter(project=project, project_course__required_capacity__gt=0)
            .select_related('project_course__course', 'project_hall__hall', 'timeslot')
        )
        improved_time_ms = (time.time() - t0_improved) * 1000

        if not existing_schedules:
            improved = {"no_schedule": True}
        else:
            total_seats = sum(
                (ph.hall.exam_capacity_single or ph.hall.capacity) * len(timeslots)
                for ph in active_halls
            )
            used_seats   = sum(s.student_allocation for s in existing_schedules)
            util         = round(used_seats / total_seats * 100, 1) if total_seats else 0
            
            # Calculate metrics dynamically
            project_course_codes = {c['code'] for c in courses}
            scheduled_course_codes = {s.project_course.course.code for s in existing_schedules}
            dropped_codes = list(project_course_codes - scheduled_course_codes)
            dropped_count = len(dropped_codes)
            
            guided_count = sum(1 for s in existing_schedules if s.preference_guided)
            forced_count = sum(1 for s in existing_schedules if s.constraint_violations)
            dept_conf    = sum(
                1 for s in existing_schedules
                if any(v.get('constraint_type') == 'department_conflict'
                       for v in (s.constraint_violations or []))
            )
            cap_viol     = sum(
                1 for s in existing_schedules
                if any(v.get('constraint_type') == 'venue_capacity'
                       for v in (s.constraint_violations or []))
            )

            improved_schedule = []
            for s in existing_schedules:
                ts = s.timeslot
                improved_schedule.append({
                    "course_code":       s.project_course.course.code,
                    "course_title":      s.project_course.course.title,
                    "department":        s.project_course.course.department,
                    "students":          s.student_allocation,
                    "hall_name":         s.project_hall.hall.name if s.project_hall else "—",
                    "slot_id":           ts.id if ts else None,
                    "slot_date":         str(ts.date) if ts else "",
                    "slot_start":        str(ts.start_time)[:5] if ts else "",
                    "slot_end":          str(ts.end_time)[:5] if ts else "",
                    "violations":        s.constraint_violations or [],
                    "is_forced":         bool(s.constraint_violations),
                    "is_split":          False,
                    "preference_guided": s.preference_guided,
                    "constraints_total": s.constraints_total,
                    "constraints_met":   s.constraints_met,
                })

            improved = {
                "schedule": improved_schedule,
                "metrics": {
                    "time_ms":             improved_time_ms,
                    "scheduled":           len(scheduled_course_codes),
                    "dropped":             dropped_count,
                    "forced":              forced_count,
                    "dept_conflicts":      dept_conf,
                    "capacity_violations": cap_viol,
                    "utilization_pct":     util,
                    "dropped_codes":       dropped_codes,
                    "historically_guided": guided_count,
                },
            }

        return Response({
            "project_info": {
                "id":            project.id,
                "name":          project.name,
                "session":       project.academic_session,
                "semester":      project.semester,
                "courses":       len(courses),
                "halls":         len(halls),
                "timeslots":     len(timeslots),
                "days":          len(timeslots) // 3,
                "hist_coverage": hist_course_count,
            },
            "basic_greedy":  basic,
            "traditional":   traditional,
            "improved":      improved,
        })
