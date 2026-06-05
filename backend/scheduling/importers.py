import pandas as pd
from .models import Student, Course, Hall, Enrollment, ProjectCourse, ProjectHall

def parse_and_import_data(project, file, data_type):
    """
    Parses uploaded file and imports data into the database.
    Supported types: 'students', 'courses', 'halls'
    """
    try:
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        # Normalize headers to lowercase for easier matching
        df.columns = df.columns.str.lower().str.strip()
        
        count = 0
        if data_type == 'courses':
            for _, row in df.iterrows():
                code = row.get('course code') or row.get('code') or row.get('course_code')
                if not code: continue
                code = str(code).strip().upper()
                
                # Get or create global Course
                course, _ = Course.objects.get_or_create(
                    code=code,
                    defaults={
                        'title': row.get('course title') or row.get('title') or '',
                        'department': row.get('department') or 'General',
                        'semester': row.get('semester') or 'First'
                    }
                )
                
                # Get or create ProjectCourse
                pc, _ = ProjectCourse.objects.get_or_create(
                    project=project,
                    course=course,
                    defaults={
                        'required_capacity': int(row.get('required_capacity') or row.get('capacity') or 0),
                        'duration_minutes': start_to_minutes(row.get('duration')) if row.get('duration') else 120,
                    }
                )
                count += 1
                
        elif data_type == 'halls':
            for _, row in df.iterrows():
                name = row.get('hall name') or row.get('name') or row.get('hall')
                capacity = row.get('capacity') or row.get('size')
                if not name or not capacity: continue
                name = str(name).strip()
                
                # Get or create global Hall
                hall, _ = Hall.objects.get_or_create(
                    name=name,
                    defaults={
                        'capacity': int(capacity),
                        'exam_capacity_single': int(row.get('exam_capacity_single') or capacity),
                        'exam_capacity_mixed': int(row.get('exam_capacity_mixed') or capacity)
                    }
                )
                
                # Get or create ProjectHall
                ph, _ = ProjectHall.objects.get_or_create(
                    project=project,
                    hall=hall,
                    defaults={'is_active': True}
                )
                count += 1

        elif data_type == 'students':
            import re
            for _, row in df.iterrows():
                matric = row.get('matric no') or row.get('matric_no') or row.get('student id')
                if not matric: continue
                matric = str(matric).strip().upper()
                
                # Get or Create Student (Global)
                student, _ = Student.objects.get_or_create(
                    matric_no=matric,
                    defaults={
                        'department': row.get('department') or 'Unknown',
                        'level': int(row.get('level') or 100)
                    }
                )
                
                # If the format is wide (Course 1, Course 2 columns)
                course_cols = [c for c in df.columns if 'course' in c and 'code' not in c]
                courses_to_add = []
                for col in course_cols:
                    c_code = row[col]
                    if pd.notna(c_code):
                        courses_to_add.append(str(c_code).strip().upper())
                
                # If format is narrow (Matric, Course Code)
                c_narrow = row.get('course code') or row.get('code')
                if c_narrow:
                    courses_to_add.append(str(c_narrow).strip().upper())
                
                # Determine is_carryover check from row if explicit
                row_is_carryover = False
                if 'carryover' in row:
                    row_is_carryover = bool(row['carryover'])
                elif 'is_carryover' in row:
                    row_is_carryover = bool(row['is_carryover'])

                for c_code in courses_to_add:
                    c_code = str(c_code).strip()
                    # Get or create global course
                    course, _ = Course.objects.get_or_create(
                        code=c_code,
                        defaults={
                            'department': student.department,
                            'title': f'Imported {c_code}'
                        }
                    )
                    
                    # Get or create ProjectCourse
                    project_course, _ = ProjectCourse.objects.get_or_create(
                        project=project,
                        course=course,
                        defaults={
                            'required_capacity': 0,
                            'duration_minutes': 120
                        }
                    )
                    
                    # Level comparison check: if student level > course level
                    is_carryover = row_is_carryover
                    if not is_carryover:
                        course_level_match = re.search(r'\d+', c_code)
                        if course_level_match:
                            try:
                                course_level = int(course_level_match.group()[0]) * 100
                                if student.level > course_level:
                                    is_carryover = True
                            except:
                                pass
                    
                    Enrollment.objects.get_or_create(
                        project=project,
                        student=student,
                        project_course=project_course,
                        defaults={'is_carryover': is_carryover}
                    )
                    
                count += 1
                
        # After importing students, update course required capacity
        if data_type == 'students':
            for pc in ProjectCourse.objects.filter(project=project):
                pc.required_capacity = Enrollment.objects.filter(project=project, project_course=pc).count()
                pc.save()
                
        return count, None
    except Exception as e:
        return 0, str(e)

def start_to_minutes(val):
    try:
        if isinstance(val, int) or isinstance(val, float):
            return int(val)
        # Handle "2 hrs" etc
        return 120 # Default
    except:
        return 120
