from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'core'

    def ready(self):
        from rest_framework.serializers import ModelSerializer
        from django_mongodb_backend.fields import ObjectIdAutoField
        from rest_framework import serializers

        # Map MongoDB ObjectIdAutoField to DRF CharField globally to fix serialization errors
        ModelSerializer.serializer_field_mapping[ObjectIdAutoField] = serializers.CharField
