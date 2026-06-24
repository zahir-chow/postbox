"""
Custom user manager for Smart Union Postbox.

Handles user creation for both normal registration and the
auto-generated accounts created by the NID OCR pipeline.
"""

from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """
    Custom manager for the User model.

    - ``create_user``: Standard user creation with email normalization.
    - ``create_superuser``: Admin user with elevated permissions.
    - ``create_nid_verified_user``: Auto-generated user from NID data
      (called by the Celery OCR pipeline).
    """

    def create_user(self, username, email, password=None, **extra_fields):
        """Create and return a regular user."""
        if not email:
            raise ValueError(_("Users must have an email address."))
        if not username:
            raise ValueError(_("Users must have a username."))

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        """Create and return a superuser with staff/admin privileges."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_up_member", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(username, email, password, **extra_fields)

    def create_nid_verified_user(
        self,
        username: str,
        email: str,
        password: str,
        nid_number: str,
        nid_name: str,
        nid_address: str,
        nid_image_url: str = "",
    ):
        """
        Create a user auto-generated from NID OCR verification.

        This is called by the Celery task after successful NID processing.
        The password is stored in plaintext temporarily in
        ``auto_generated_password`` so the user can retrieve their
        credentials on first login.
        """
        user = self.create_user(
            username=username,
            email=email,
            password=password,
            nid_number=nid_number,
            nid_name=nid_name,
            nid_address=nid_address,
            nid_image_url=nid_image_url,
            nid_verified=True,
            auto_generated_password=password,  # Temporary, cleared after first login
        )
        return user
