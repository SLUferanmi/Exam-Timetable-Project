from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    CustomTokenObtainPairView, 
    UserViewSet,
    RequestPasswordResetView,
    ConfirmPasswordResetView,
    SendVerificationEmailView,
    ConfirmEmailView
)
from rest_framework_simplejwt.views import TokenRefreshView
from core.root_view import root_view
from scheduling.views import (TimetableProjectViewSet, StudentViewSet, CourseViewSet,
                              HallViewSet, TimeSlotViewSet, ExamScheduleViewSet, ConstraintViewSet,
                              GlobalCourseViewSet, GlobalHallViewSet, CompareAlgorithmsView)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'projects', TimetableProjectViewSet)
router.register(r'students', StudentViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'halls', HallViewSet)
router.register(r'timeslots', TimeSlotViewSet)
router.register(r'schedules', ExamScheduleViewSet)
router.register(r'constraints', ConstraintViewSet)
router.register(r'global-courses', GlobalCourseViewSet, basename='global-course')
router.register(r'global-halls', GlobalHallViewSet, basename='global-hall')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', CustomTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/reset-password/request/', RequestPasswordResetView.as_view()),
    path('api/auth/reset-password/confirm/', ConfirmPasswordResetView.as_view()),
    path('api/auth/email/send-verification/', SendVerificationEmailView.as_view()),
    path('api/auth/email/verify/', ConfirmEmailView.as_view()),
    path('api/', include(router.urls)),
    path('api/compare-algorithms/', CompareAlgorithmsView.as_view()),
    path('', root_view),
]
