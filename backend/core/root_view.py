from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "message": "Welcome to the Exam Timetable Scheduling API",
        "documentation": "/api/",
        "admin": "/admin/"
    })
