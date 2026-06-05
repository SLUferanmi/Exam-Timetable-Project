"""
Initialize default constraints for all projects.
Run this once to set up the constraint system.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_scheduler.settings')
django.setup()

from scheduling.models import TimetableProject, Constraint

def main():
    print("=" * 80)
    print("INITIALIZING DEFAULT CONSTRAINTS")
    print("=" * 80)
    
    projects = TimetableProject.objects.all()
    print(f"\nFound {projects.count()} projects")
    
    constraint_types = [
        'student_conflict',
        'carryover_conflict',
        'department_conflict',
        'venue_capacity',
    ]
    
    total_created = 0
    
    for project in projects:
        print(f"\nProject: {project.name}")
        created_count = 0
        
        for constraint_type in constraint_types:
            constraint, created = Constraint.objects.get_or_create(
                project=project,
                constraint_type=constraint_type,
                defaults={'enabled': True}
            )
            
            if created:
                created_count += 1
                total_created += 1
                print(f"   [Created] {constraint.get_constraint_type_display()}")
            else:
                print(f"   [Exists] {constraint.get_constraint_type_display()} ({'Enabled' if constraint.enabled else 'Disabled'})")
        
        if created_count == 0:
            print(f"   All constraints already exist")
    
    print(f"\n" + "=" * 80)
    print(f"Initialization complete!")
    print(f"   Total constraints created: {total_created}")
    print("=" * 80)

if __name__ == "__main__":
    main()
