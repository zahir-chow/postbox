"""
Production settings — extends base.py.

Usage:
    DJANGO_SETTINGS_MODULE=config.settings.production
"""

import os

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
DEBUG = False
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")  # noqa: F405
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]  # Mandatory in prod  # noqa: F405

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31_536_000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ---------------------------------------------------------------------------
# Static files — expect a CDN or whitenoise in prod
# ---------------------------------------------------------------------------
STATIC_ROOT = os.environ.get("STATIC_ROOT", "/var/www/postbox/static/")  # noqa: F405

# ---------------------------------------------------------------------------
# Logging — structured in production
# ---------------------------------------------------------------------------
LOGGING["handlers"]["console"]["formatter"] = "verbose"  # noqa: F405
LOGGING["root"]["level"] = "WARNING"  # noqa: F405
