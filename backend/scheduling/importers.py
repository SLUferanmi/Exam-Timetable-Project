import pandas as pd
from .models import Student, Course, Hall, Enrollment

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
            # Expected headers: course code, title, department, level, duration
            for _, row in df.iterrows():
                # Flexible column matching
                code = row.get('course code') or row.get('code') or row.get('course_code')
                if not code: continue
                
                Course.objects.create(
                    project=project,
                    code=code,
                    title=row.get('course title') or row.get('title') or '',
                    department=row.get('department') or 'General',
                    duration_minutes=start_to_minutes(row.get('duration')) if row.get('duration') else 120,
                    required_capacity=0 # Will be calculated from Enrollments if not provided
                )
                count += 1
                
        elif data_type == 'halls':
            # Expected headers: name, capacity
            for _, row in df.iterrows():
                name = row.get('hall name') or row.get('name') or row.get('hall')
                capacity = row.get('capacity') or row.get('size')
                
                if name and capacity:
                    Hall.objects.create(
                        project=project,
                        name=name,
                        capacity=int(capacity)
                    )
                    count += 1

        elif data_type == 'students':
            # Expected headers: matric no, department, level, course1, course2... OR normalized list
            # Handling "Student Course Registration" listing
            for _, row in df.iterrows():
                matric = row.get('matric no') or row.get('matric_no') or row.get('student id')
                if not matric: continue
                
                # Get or Create Student
                student, _ = Student.objects.get_or_create(
                    project=project, 
                    matric_no=matric,
                    defaults={
                        'department': row.get('department', 'Unknown'),
                        'level': row.get('level', 100)
                    }
                )
                
                # If the format is wide (Course 1, Course 2 columns)
                course_cols = [c for c in df.columns if 'course' in c and 'code' not in c]
                courses_to_add = []
                for col in course_cols:
                    c_code = row[col]
                    if pd.notna(c_code):
                        courses_to_add.append(str(c_code).strip())
                
                # If format is narrow (Matric, Course Code)
                c_narrow = row.get('course code') or row.get('code')
                if c_narrow:
                    courses_to_add.append(str(c_narrow).strip())

                for c_code in courses_to_add:
                    # Find the course object (it must exist usually, or we create a placeholder)
                    # For safety in this POC, we get or create the course so imports don't fail order
                    course, _ = Course.objects.get_or_create(
                        project=project,
                        code=c_code,
                        defaults={'title': f'Imported {c_code}'}
                    )
                    
                    Enrollment.objects.get_or_create(
                        project=project,
                        student=student,
                        course=course
                    )
                    
                count += 1
                
        # After importing students, update course required capacity
        if data_type == 'students':
            for course in Course.objects.filter(project=project):
                course.required_capacity = Enrollment.objects.filter(project=project, course=course).count()
                course.save()
                
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
