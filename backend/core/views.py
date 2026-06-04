from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user_id'] = self.user.pk
        data['username'] = self.user.username
        data['role'] = 'Super Admin' if self.user.is_superuser else 'Exam Officer'
        data['is_email_verified'] = getattr(self.user, 'is_email_verified', True)
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    """Secure JWT login endpoint replacing legacy Token authentication."""
    serializer_class = CustomTokenObtainPairSerializer

class RequestPasswordResetView(APIView):
    """Sends a time-limited password reset token to the user's email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"
            
            send_mail(
                'Password Reset Request',
                f'Click the link to securely reset your password: {reset_link}',
                'security@examscheduler.local',
                [user.email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            pass # Fail silently for security to prevent email enumeration
            
        return Response({'message': 'If the email exists, a secure reset link has been sent.'})

class ConfirmPasswordResetView(APIView):
    """Verifies the token and updates the password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not all([uidb64, token, new_password]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                return Response({'message': 'Password reset successful.'})
            else:
                return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

class SendVerificationEmailView(APIView):
    """Sends a time-limited verification token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if getattr(user, 'is_email_verified', False):
            return Response({'message': 'Email already verified'})
            
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verify_link = f"http://localhost:5173/verify-email?uid={uid}&token={token}"
        
        recipient = user.email if user.email else f"{user.username}@examscheduler.local"
        
        send_mail(
            'Verify your Email',
            f'Click here to verify your account: {verify_link}',
            'security@examscheduler.local',
            [recipient],
            fail_silently=False,
        )
        return Response({'message': 'Verification email securely sent.'})

class ConfirmEmailView(APIView):
    """Verifies the token and confirms the email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')

        if not all([uidb64, token]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.is_email_verified = True
                user.save()
                return Response({'message': 'Email verified successfully.'})
            else:
                return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """API endpoint that allows users to be viewed or edited."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all()
        return [self.request.user]
