from rest_framework import serializers
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

class TimetableProjectSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = TimetableProject
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')

class StudentSerializer(serializers.ModelSerializer):
    courses = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'matric_no', 'department', 'level', 'courses']

    def get_courses(self, obj):
        enrolls = Enrollment.objects.filter(student=obj).select_related('project_course__course', 'project')
        return [{
            'id': e.id,
            'project_id': e.project.id,
            'project_name': e.project.name,
            'project_course_id': e.project_course.id,
            'course_code': e.project_course.course.code,
            'course_title': e.project_course.course.title,
            'is_carryover': e.is_carryover
        } for e in enrolls]

    def create(self, validated_data):
        request = self.context.get('request')
        enrollments_data = request.data.get('enrollments', []) if request else []
        project_id = request.data.get('project_id') if request else None

        student = Student.objects.create(**validated_data)

        if project_id and enrollments_data:
            try:
                project = TimetableProject.objects.get(id=project_id)
                for item in enrollments_data:
                    pc_id = item.get('project_course_id')
                    is_c = bool(item.get('is_carryover', False))
                    pc = ProjectCourse.objects.get(id=pc_id, project=project)
                    Enrollment.objects.create(
                        project=project,
                        student=student,
                        project_course=pc,
                        is_carryover=is_c
                    )
            except Exception as e:
                print(f"Error creating enrollments: {e}")

        return student

    def update(self, instance, validated_data):
        request = self.context.get('request')
        enrollments_data = request.data.get('enrollments', []) if request else []
        project_id = request.data.get('project_id') if request else None

        # Update student fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if project_id:
            try:
                project = TimetableProject.objects.get(id=project_id)
                # Clear existing enrollments for this student in this project
                Enrollment.objects.filter(student=instance, project=project).delete()
                # Re-create
                for item in enrollments_data:
                    pc_id = item.get('project_course_id')
                    is_c = bool(item.get('is_carryover', False))
                    pc = ProjectCourse.objects.get(id=pc_id, project=project)
                    Enrollment.objects.create(
                        project=project,
                        student=instance,
                        project_course=pc,
                        is_carryover=is_c
                    )
            except Exception as e:
                print(f"Error updating enrollments: {e}")

        return instance

class GlobalCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

class GlobalHallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hall
        fields = '__all__'

class ProjectCourseSerializer(serializers.ModelSerializer):
    """
    Project-scoped course view used by the frontend.
    Exposes `code`, `department`, and per-project editable `required_capacity` etc.
    """
    # Global catalog fields (read-only in this UI)
    code = serializers.CharField(source='course.code', read_only=True)
    department = serializers.CharField(source='course.department', read_only=True)
    title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = ProjectCourse
        fields = ['id', 'project', 'course', 'code', 'title', 'department', 'required_capacity', 'duration_minutes']
        read_only_fields = ('project', 'course', 'code', 'department', 'title')


class ProjectHallSerializer(serializers.ModelSerializer):
    """Project-scoped hall view used by the frontend."""
    enabled = serializers.BooleanField(source='is_active', required=False)

    # UI fields map from global
    name = serializers.CharField(source='hall.name', read_only=True)
    capacity = serializers.IntegerField(source='hall.capacity', read_only=True)
    exam_capacity_single = serializers.IntegerField(source='hall.exam_capacity_single', read_only=True)
    exam_capacity_mixed = serializers.IntegerField(source='hall.exam_capacity_mixed', read_only=True)

    class Meta:
        model = ProjectHall
        fields = ['id', 'project', 'hall', 'name', 'capacity', 'exam_capacity_single', 'exam_capacity_mixed', 'enabled']
        read_only_fields = ('project', 'hall', 'name', 'capacity', 'exam_capacity_single', 'exam_capacity_mixed')

class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = '__all__'

class ConstraintSerializer(serializers.ModelSerializer):
    constraint_label = serializers.ReadOnlyField(source='get_constraint_type_display')
    
    class Meta:
        model = Constraint
        fields = '__all__'

class ExamScheduleSerializer(serializers.ModelSerializer):
    course = ProjectCourseSerializer(source='project_course', read_only=True)
    hall = ProjectHallSerializer(source='project_hall', read_only=True)
    timeslot = TimeSlotSerializer(read_only=True)
    
    # Backward-compat shortcuts
    course_code = serializers.ReadOnlyField(source='project_course.course.code')
    hall_name   = serializers.ReadOnlyField(source='project_hall.hall.name')
    timeslot_details = serializers.ReadOnlyField(source='timeslot.__str__')

    # Violation fields
    has_violations = serializers.SerializerMethodField()

    class Meta:
        model = ExamSchedule
        fields = '__all__'

    def get_has_violations(self, obj):
        return bool(obj.constraint_violations)

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = '__all__'
