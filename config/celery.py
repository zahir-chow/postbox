"""
Celery application configuration for Smart Union Postbox.

Uses Redis as the message broker. Task results are stored via
django-celery-results (configured in settings as 'django-db').
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("postbox")

# Read config from Django settings, using the CELERY_ namespace.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps (e.g., apps/complaints/tasks.py).
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Diagnostic task — prints the current request info."""
    print(f"Request: {self.request!r}")
