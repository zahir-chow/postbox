from django.apps import AppConfig


class ComplaintsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.complaints"
    verbose_name = "Complaints"

    def ready(self):
        # Import signals when the app is ready
        import apps.complaints.signals  # noqa: F401
