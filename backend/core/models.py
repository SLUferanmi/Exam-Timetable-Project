from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Added for secure authentication flows
    is_email_verified = models.BooleanField(default=False)
