"""
Core abstract models for Smart Union Postbox.

Provides reusable base classes with timestamp tracking and soft-delete
semantics. All domain models should inherit from one of these.

Design rationale — Soft Delete:
    Hard-deleting rows referenced by many foreign keys triggers cascading
    DELETE statements that acquire row-level locks across multiple tables.
    Under high-traffic conditions, this can cause lock contention and
    request timeouts. Soft-delete avoids this by flipping a boolean flag,
    deferring actual cleanup to off-peak Celery tasks.
"""

import uuid

from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Managers
# ---------------------------------------------------------------------------


class SoftDeleteManager(models.Manager):
    """Default manager that filters out soft-deleted rows."""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def all_with_deleted(self):
        """Return a queryset that includes soft-deleted rows."""
        return super().get_queryset()

    def only_deleted(self):
        """Return a queryset containing *only* soft-deleted rows."""
        return super().get_queryset().filter(is_deleted=True)


# ---------------------------------------------------------------------------
# Abstract Models
# ---------------------------------------------------------------------------


class TimestampedModel(models.Model):
    """
    Abstract base model providing automatic timestamp tracking.

    Fields:
        created_at: Set once when the row is first inserted.
        updated_at: Refreshed on every save.
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the record was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the record was last updated.",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SoftDeleteModel(TimestampedModel):
    """
    Abstract base model with soft-delete semantics.

    Calling ``delete()`` sets ``is_deleted=True`` and records ``deleted_at``
    instead of issuing a SQL DELETE.  Use ``hard_delete()`` when you truly
    need to remove the row (e.g., in a data-purge Celery task).

    The default manager (``objects``) excludes soft-deleted rows.  Use
    ``all_objects`` to include them.
    """

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft-delete flag. True means logically deleted.",
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the record was soft-deleted.",
    )

    # Managers — ``objects`` is the default (excludes deleted rows).
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """
        Soft-delete: mark the row as deleted without issuing a SQL DELETE.

        This prevents cascading deletes and the associated row-level locks.
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(using=using, update_fields=["is_deleted", "deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """
        Permanently remove the row from the database.

        Should only be called from controlled batch jobs (e.g., Celery
        data-retention tasks running during off-peak hours).
        """
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Un-delete a soft-deleted row."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])


class UUIDSoftDeleteModel(SoftDeleteModel):
    """
    Soft-deletable model with a UUID v4 primary key.

    Use for domain entities that are exposed in URLs or APIs where
    sequential integer IDs would leak information.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Universally unique identifier (UUID v4).",
    )

    class Meta:
        abstract = True
