"""
WSGI configuration for Smart Union Postbox.

Exposes the WSGI callable as a module-level variable named ``application``.
For production behind Gunicorn or uWSGI (non-WebSocket traffic).
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = get_wsgi_application()
