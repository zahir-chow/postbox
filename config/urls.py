"""
Root URL configuration for Smart Union Postbox.

All API routes are namespaced under /api/v1/.
Admin panel is available at /admin/.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/auth/", include("apps.authentication.urls", namespace="auth")),
    path("api/v1/complaints/", include("apps.complaints.urls", namespace="complaints")),
]
