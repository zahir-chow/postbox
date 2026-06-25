"""
Django admin configuration for the authentication app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin for the User model with NID verification fields.
    """

    list_display = [
        "username",
        "email",
        "nid_name",
        "nid_verified",
        "is_up_member",
        "is_chairman",
        "is_active",
        "date_joined",
    ]
    list_filter = [
        "is_up_member",
        "is_chairman",
        "nid_verified",
        "is_active",
        "is_staff",
    ]
    search_fields = [
        "username",
        "email",
        "nid_name",
        "nid_number",
        "phone_number",
    ]
    ordering = ["-date_joined"]

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            _("NID Verification"),
            {
                "fields": (
                    "nid_number",
                    "nid_name",
                    "nid_address",
                    "nid_verified",
                    "nid_image_url",
                ),
            },
        ),
        (
            _("Union Parishad"),
            {
                "fields": (
                    "is_up_member",
                    "is_chairman",
                    "phone_number",
                    "avatar_url",
                ),
            },
        ),
        (
            _("Auto-generated Credentials"),
            {
                "classes": ("collapse",),
                "fields": ("auto_generated_password",),
            },
        ),
    )
