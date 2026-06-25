"""
User model for Smart Union Postbox.

Entity Relationship Overview::

    User (1) ──── (*) Complaint
                     │
                     └── (*) ComplaintAttachment

Design decisions:
    * UUID v4 primary key prevents sequential ID enumeration in public APIs.
    * NID fields (nid_number, nid_name, nid_address) store data extracted
      by the Celery OCR pipeline from National ID card photos.
    * ``auto_generated_password`` stores the plaintext password temporarily
      so NID-verified users can retrieve their auto-generated credentials.
      This field is cleared after the user's first login.
    * ``is_up_member`` flag distinguishes Union Parishad admin users from
      regular citizens, controlling access to the admin dashboard.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractUser):
    """
    Custom user model with UUID primary key and NID verification fields.

    Extends Django's ``AbstractUser`` to retain built-in auth functionality
    (password hashing, permissions, groups) while adding Bangladesh-specific
    NID verification support and Union Parishad member designation.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Universally unique identifier for the user."),
    )
    email = models.EmailField(
        _("email address"),
        unique=True,
        help_text=_("Unique email address — used for login and notifications."),
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text=_("Contact phone number (e.g., +8801XXXXXXXXX)."),
    )

    # ── NID Verification Fields ──────────────────────────────────────────
    nid_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Bangladesh National ID number (10 or 17 digits)."),
    )
    nid_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=_("Full name as printed on the NID card."),
    )
    nid_address = models.TextField(
        blank=True,
        default="",
        help_text=_("Address as printed on the NID card."),
    )
    nid_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_("Whether NID verification has been completed successfully."),
    )
    nid_image_url = models.URLField(
        blank=True,
        default="",
        help_text=_("S3 URL of the uploaded NID card photo."),
    )

    # ── Auto-generated Credentials ───────────────────────────────────────
    auto_generated_password = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text=_(
            "Plaintext auto-generated password for NID-verified users. "
            "Cleared after the user's first login or after 24 hours."
        ),
    )

    # ── UP Member Flag ───────────────────────────────────────────────────
    is_up_member = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_("Whether this user is a Union Parishad member/admin."),
    )

    is_chairman = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_("Whether this user is the Union Parishad Chairman."),
    )

    # ── Profile ──────────────────────────────────────────────────────────
    avatar_url = models.URLField(
        blank=True,
        default="",
        help_text=_("URL to the user's profile picture."),
    )

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["email"], name="idx_user_email"),
            models.Index(fields=["nid_number"], name="idx_user_nid"),
            models.Index(
                fields=["is_up_member", "is_active"],
                name="idx_user_up_member",
            ),
            models.Index(
                fields=["is_chairman", "is_active"],
                name="idx_user_chairman",
            ),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} <{self.email}>"

    @property
    def display_name(self):
        """Return the best available display name."""
        if self.nid_name:
            return self.nid_name
        full = self.get_full_name()
        return full if full else self.username

    def clear_auto_credentials(self):
        """
        Clear the auto-generated password after first login.

        Called by the JWT token serializer or a periodic Celery task.
        """
        if self.auto_generated_password:
            self.auto_generated_password = ""
            self.save(update_fields=["auto_generated_password", "updated_at"])
