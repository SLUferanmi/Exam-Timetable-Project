from django.db import models
from core.models import User

class TimetableProject(models.Model):
    objects = models.Manager()
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    academic_session = models.CharField(max_length=50, help_text="e.g 2023/2024")
    semester = models.CharField(max_length=20, help_text="e.g First Semester")
    
    exam_start_date = models.DateField(null=True, blank=True, help_text="First day of exams")
    exam_end_date = models.DateField(null=True, blank=True, help_text="Last day of exams")
    is_sample_mode = models.BooleanField(
        default=False,
        help_text="When True, only the 32-course sample dataset is active for this project."
    )

    def __str__(self) -> str:
        return str(self.name)

class Department(models.Model):
    objects = models.Manager()
    name = models.CharField(max_length=255)
    
    def __str__(self) -> str:
        return str(self.name)

class Student(models.Model):
    objects = models.Manager()
    # Global Student
    matric_no = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=100) 
    level = models.IntegerField(default=100)
    
    def __str__(self) -> str:
        return str(self.matric_no)

class Course(models.Model):
    objects = models.Manager()
    # Global Course Catalog
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=100)
    semester = models.CharField(
        max_length=20,
        choices=[('First', 'First'), ('Second', 'Second'), ('Both', 'Both')],
        default='First'
    )
    
    def __str__(self) -> str:
        return str(self.code)

class Hall(models.Model):
    objects = models.Manager()
    # Global Venue Catalog
    name = models.CharField(max_length=100, unique=True)
    capacity = models.IntegerField()  # Total physical capacity
    exam_capacity_single = models.IntegerField(null=True, blank=True, help_text="Capacity when hosting 1 course")
    exam_capacity_mixed = models.IntegerField(null=True, blank=True, help_text="Capacity when hosting mixed courses")

    def __str__(self):
        return f"{self.name} ({self.capacity})"

class ProjectCourse(models.Model):
    """Link courses to a specific project (semester)"""
    objects = models.Manager()
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='project_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    required_capacity = models.IntegerField(default=0, help_text="Number of students enrolled")
    duration_minutes = models.IntegerField(default=120)

    class Meta:
        unique_together = ('project', 'course')

    def __str__(self):
        return f"{self.course.code} ({self.project.name})"

class ProjectHall(models.Model):
    """Link halls to a specific project (semester) allowing user to unselect or override"""
    objects = models.Manager()
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='project_halls')
    hall = models.ForeignKey(Hall, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True, help_text="Uncheck to disable this venue for this semester")
    
    class Meta:
        unique_together = ('project', 'hall')

    def __str__(self):
        return f"{self.hall.name} ({self.project.name})"

class TimeSlot(models.Model):
    objects = models.Manager()
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='timeslots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    def __str__(self):
        return f"{self.date} {self.start_time}-{self.end_time}"

class Enrollment(models.Model):
    """Mapping which students are taking which courses this semester"""
    objects = models.Manager()
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    project_course = models.ForeignKey(ProjectCourse, on_delete=models.CASCADE)
    is_carryover = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('student', 'project_course')

class Constraint(models.Model):
    objects = models.Manager()
    CONSTRAINT_TYPES = [
        ('student_conflict', 'No student has two exams at the same time'),
        ('department_conflict', 'No department has two exams at the same time'),
        ('venue_capacity', 'Venue capacity must accommodate all students'),
    ]
    
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='constraints')
    constraint_type = models.CharField(max_length=50, choices=CONSTRAINT_TYPES)
    enabled = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('project', 'constraint_type')
    
    def __str__(self):
        return f"{self.get_constraint_type_display()} ({'Enabled' if self.enabled else 'Disabled'})"

class ExamSchedule(models.Model):
    """The final output assignment. One row per (course, hall) pair — a course may
    span multiple halls if its student count exceeds any single hall's capacity."""
    objects = models.Manager()
    project = models.ForeignKey(TimetableProject, on_delete=models.CASCADE, related_name='schedules')
    project_course = models.ForeignKey(ProjectCourse, on_delete=models.CASCADE)
    project_hall = models.ForeignKey(ProjectHall, on_delete=models.CASCADE, null=True, blank=True)
    timeslot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, null=True, blank=True)
    # How many students from this course sit in this particular hall
    student_allocation = models.IntegerField(default=0)
    # True when historical preference data influenced the venue/slot choice
    preference_guided = models.BooleanField(default=False, help_text="Set when data-driven historical preferences guided this placement")
    # Constraint violation tracking — stored as JSON list of dicts
    # Each dict: {"constraint_type": str, "label": str, "detail": str}
    constraint_violations = models.JSONField(default=list, blank=True,
        help_text="List of constraints that were violated for this placement")
    constraints_total = models.IntegerField(default=0, help_text="Total enabled constraints checked")
    constraints_met = models.IntegerField(default=0, help_text="Number of constraints that were satisfied")


class HistoricalEntry(models.Model):
    """A single parsed row from a historical timetable PDF."""
    objects = models.Manager()
    SLOT_LABELS = [
        ('morning', 'Morning (08:15–10:15)'),
        ('midday', 'Midday (11:00–13:00)'),
        ('afternoon', 'Afternoon (14:00–17:00)'),
    ]
    course_code = models.CharField(max_length=20, db_index=True)
    hall_name = models.CharField(max_length=150)
    slot_label = models.CharField(max_length=20, choices=SLOT_LABELS)
    source_file = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.course_code} → {self.hall_name} ({self.slot_label})"


class CoursePreference(models.Model):
    """
    Frequency-based preference weights learned from historical timetable data.
    One row per (course_code, hall_name) pair; slot weights are on this row.
    """
    objects = models.Manager()
    course_code = models.CharField(max_length=20, db_index=True)
    hall_name = models.CharField(max_length=150)

    # Venue weight: what fraction of this course's appearances were in this hall
    venue_weight = models.FloatField(default=0.0)

    # Time-slot weights (sum across halls ≈ 1.0 per course)
    morning_weight = models.FloatField(default=0.0)
    midday_weight = models.FloatField(default=0.0)
    afternoon_weight = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('course_code', 'hall_name')

    def __str__(self):
        return f"{self.course_code} → {self.hall_name} (v={self.venue_weight:.2f})"
