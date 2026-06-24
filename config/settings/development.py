"""
Development settings — extends base.py.

Usage:
    DJANGO_SETTINGS_MODULE=config.settings.development
"""

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Debug
# ---------------------------------------------------------------------------
DEBUG = True
ALLOWED_HOSTS = ["*"]

# ---------------------------------------------------------------------------
# CORS — Allow all origins in development
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True

# ---------------------------------------------------------------------------
# Django REST Framework — Browsable API in dev
# ---------------------------------------------------------------------------
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)

# ---------------------------------------------------------------------------
# Channels — In-memory layer for local dev (no Redis required)
# ---------------------------------------------------------------------------
# Uncomment to use in-memory channels layer without Redis:
# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels.layers.InMemoryChannelLayer",
#     },
# }

# ---------------------------------------------------------------------------
# Logging — More verbose in development
# ---------------------------------------------------------------------------
LOGGING["handlers"]["console"]["formatter"] = "simple"  # noqa: F405
LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
LOGGING["loggers"]["django.db.backends"]["level"] = "WARNING"  # noqa: F405

# ---------------------------------------------------------------------------
# Email — Console backend for local dev
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
