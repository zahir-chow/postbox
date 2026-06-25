"""
Domain models for the complaints app — Smart Union Postbox.

Entity Relationship Overview::

    UnionParishad (1) ──── (*) Complaint (1) ──┬── (*) ComplaintAttachment
                                               ├── (*) ComplaintStatusLog
                                               └── (0..1) NIDVerificationTask

    User (0..1) ──── (*) Complaint
    (nullable: anonymous complaints have no user)

Design decisions:
    * UUID v4 primary keys on all domain entities to prevent sequential
      ID enumeration in the public tracking API.
    * ``tracking_token`` is a separate UUID from the PK — this is the
      public-facing token shared with anonymous users. Separating it
      from the PK prevents leaking internal identifiers.
    * ``ComplaintStatusLog`` uses BigAutoField PK (not UUID) because it's
      an internal audit table never exposed in public APIs.
    * ``NIDVerificationTask`` tracks the async Celery pipeline state,
      linking to the complaint that triggered NID verification.
    * Soft-delete is enabled on Complaint and UnionParishad to avoid
      cascading DELETE locks under high-traffic conditions.

Status lifecycle::

    UNREAD → UNDER_REVIEW → IN_PROGRESS → RESOLVED
                                        → REJECTED

NID verification lifecycle::

    PENDING → PROCESSING → VERIFIED
                         → FAILED
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import SoftDeleteModel, TimestampedModel, UUIDSoftDeleteModel


# ==========================================================================
# Enums
# ==========================================================================


class ComplaintStatus(models.TextChoices):
    """Status lifecycle for a complaint."""

    UNREAD = "UNREAD", _("Unread")
    UNDER_REVIEW = "UNDER_REVIEW", _("Under Review")
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    ESCALATED = "ESCALATED", _("Escalated to Chairman")
    RESOLVED = "RESOLVED", _("Resolved")
    REJECTED = "REJECTED", _("Rejected")


class ComplaintPriority(models.TextChoices):
    """Priority level for a complaint."""

    LOW = "LOW", _("Low")
    MEDIUM = "MEDIUM", _("Medium")
    HIGH = "HIGH", _("High")
    URGENT = "URGENT", _("Urgent")


class NIDVerificationStatus(models.TextChoices):
    """Status of the async NID OCR verification pipeline."""

    PENDING = "PENDING", _("Pending")
    PROCESSING = "PROCESSING", _("Processing")
    VERIFIED = "VERIFIED", _("Verified")
    FAILED = "FAILED", _("Failed")


# ==========================================================================
# Union Parishad
# ==========================================================================


class UnionParishad(UUIDSoftDeleteModel):
    """
    Represents a Union Parishad (UP) — the lowest tier of local
    government in Bangladesh.

    This entity defines the jurisdiction for NID address matching.
    Complaints are scoped to a specific Union Parishad.
    """

    name = models.CharField(
        max_length=255,
        help_text=_("Official name of the Union Parishad."),
    )
    district = models.CharField(
        max_length=100,
        db_index=True,
        help_text=_("District name (জেলা) for jurisdiction matching."),
    )
    upazila = models.CharField(
        max_length=100,
        db_index=True,
        help_text=_("Upazila/Thana name (উপজেলা) for jurisdiction matching."),
    )
    union_name = models.CharField(
        max_length=100,
        help_text=_("Union name (ইউনিয়ন)."),
    )
    chairman_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=_("Name of the current UP Chairman."),
    )
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text=_("Official contact phone number."),
    )
    contact_email = models.EmailField(
        blank=True,
        default="",
        help_text=_("Official contact email address."),
    )
    address = models.TextField(
        blank=True,
        default="",
        help_text=_("Full physical address of the UP office."),
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Whether the UP is currently operational."),
    )

    class Meta:
        verbose_name = _("Union Parishad")
        verbose_name_plural = _("Union Parishads")
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["district", "upazila", "union_name"],
                name="uq_up_district_upazila_union",
            ),
        ]
        indexes = [
            models.Index(
                fields=["district", "upazila"],
                name="idx_up_district_upazila",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.upazila}, {self.district})"


# ==========================================================================
# Complaint
# ==========================================================================


class Complaint(UUIDSoftDeleteModel):
    """
    Central complaint record — the core entity of the Postbox system.

    Supports both anonymous and verified (NID-linked) complaints.
    Anonymous complaints are tracked via a separate ``tracking_token``
    UUID that is shared with the submitter for status checking.

    The ``status`` field follows the lifecycle:
    UNREAD → UNDER_REVIEW → IN_PROGRESS → RESOLVED / REJECTED
    """

    # ── Tracking ─────────────────────────────────────────────────────────
    tracking_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        help_text=_(
            "Public tracking token for anonymous complaint status checks. "
            "Separate from the PK to avoid leaking internal identifiers."
        ),
    )

    # ── Relationships ────────────────────────────────────────────────────
    union_parishad = models.ForeignKey(
        UnionParishad,
        on_delete=models.PROTECT,  # Never delete a UP with active complaints
        related_name="complaints",
        help_text=_("The Union Parishad this complaint is filed against."),
    )
    complainant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
        help_text=_(
            "The verified user who filed this complaint. "
            "NULL for anonymous complaints."
        ),
    )

    # ── Anonymous Flag ───────────────────────────────────────────────────
    is_anonymous = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Whether this complaint was filed anonymously."),
    )

    # ── Content ──────────────────────────────────────────────────────────
    subject = models.CharField(
        max_length=300,
        help_text=_("Brief subject line of the complaint."),
    )
    body = models.TextField(
        help_text=_("Full complaint body (supports rich text / HTML)."),
    )

    # ── Status & Priority ────────────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=ComplaintStatus.choices,
        default=ComplaintStatus.UNREAD,
        db_index=True,
        help_text=_("Current status of the complaint."),
    )
    priority = models.CharField(
        max_length=10,
        choices=ComplaintPriority.choices,
        default=ComplaintPriority.MEDIUM,
        db_index=True,
        help_text=_("Priority level assigned to the complaint."),
    )

    # ── NID Verification Status ──────────────────────────────────────────
    nid_verification_status = models.CharField(
        max_length=20,
        choices=NIDVerificationStatus.choices,
        default=NIDVerificationStatus.PENDING,
        blank=True,
        help_text=_(
            "Status of NID verification. Only relevant for non-anonymous "
            "complaints that include an NID photo."
        ),
    )

    # ── Admin Notes ──────────────────────────────────────────────────────
    admin_notes = models.TextField(
        blank=True,
        default="",
        help_text=_("Internal notes added by UP members (not visible to citizen)."),
    )

    # ── Timestamps ───────────────────────────────────────────────────────
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When the complaint status was changed to RESOLVED."),
    )

    class Meta:
        verbose_name = _("Complaint")
        verbose_name_plural = _("Complaints")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="idx_complaint_status_date",
            ),
            models.Index(
                fields=["union_parishad", "status"],
                name="idx_complaint_up_status",
            ),
            models.Index(
                fields=["complainant", "status"],
                name="idx_complaint_user_status",
            ),
            models.Index(
                fields=["is_anonymous", "status"],
                name="idx_complaint_anon_status",
            ),
        ]

    def __str__(self):
        source = "Anonymous" if self.is_anonymous else str(self.complainant)
        return f"[{self.get_status_display()}] {self.subject} — {source}"

    @property
    def is_resolved(self):
        """Check if the complaint has been resolved."""
        return self.status == ComplaintStatus.RESOLVED

    @property
    def attachment_count(self):
        """Return the number of attachments on this complaint."""
        return self.attachments.count()


# ==========================================================================
# Complaint Attachment
# ==========================================================================


class ComplaintAttachment(UUIDSoftDeleteModel):
    """
    A file (image, PDF) attached to a complaint as evidence.

    Files are stored in S3 via presigned URL upload. Only the S3 object
    URL is stored in Django — the actual file never touches the DRF server.
    """

    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="attachments",
        help_text=_("The complaint this attachment belongs to."),
    )
    file_url = models.URLField(
        max_length=1024,
        help_text=_("S3 object URL of the uploaded file."),
    )
    object_key = models.CharField(
        max_length=512,
        help_text=_("S3 object key for generating presigned download URLs."),
    )
    file_name = models.CharField(
        max_length=255,
        help_text=_("Original filename as uploaded by the user."),
    )
    file_type = models.CharField(
        max_length=100,
        help_text=_("MIME type of the file (e.g., 'image/jpeg', 'application/pdf')."),
    )
    file_size = models.PositiveIntegerField(
        default=0,
        help_text=_("File size in bytes."),
    )

    class Meta:
        verbose_name = _("Complaint Attachment")
        verbose_name_plural = _("Complaint Attachments")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"


# ==========================================================================
# Complaint Status Log (Audit Trail)
# ==========================================================================


class ComplaintStatusLog(TimestampedModel):
    """
    Immutable audit trail for complaint status changes.

    Every time a complaint's status is updated (by an admin or the system),
    a log entry is created recording the old status, new status, who made
    the change, and an optional note explaining the reason.

    Uses BigAutoField PK — this is an internal audit table, never exposed
    in public APIs or URLs.
    """

    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="status_logs",
        help_text=_("The complaint this log entry belongs to."),
    )
    old_status = models.CharField(
        max_length=20,
        choices=ComplaintStatus.choices,
        help_text=_("The previous status before the change."),
    )
    new_status = models.CharField(
        max_length=20,
        choices=ComplaintStatus.choices,
        help_text=_("The new status after the change."),
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="status_changes",
        help_text=_(
            "The user who made this status change. "
            "NULL for system-initiated changes."
        ),
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text=_("Optional notes explaining the reason for the status change."),
    )

    class Meta:
        verbose_name = _("Status Log Entry")
        verbose_name_plural = _("Status Log Entries")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["complaint", "created_at"],
                name="idx_statuslog_complaint_date",
            ),
        ]

    def __str__(self):
        return (
            f"{self.complaint.subject}: "
            f"{self.get_old_status_display()} → {self.get_new_status_display()}"
        )


# ==========================================================================
# NID Verification Task
# ==========================================================================


class NIDVerificationTask(UUIDSoftDeleteModel):
    """
    Tracks the state of an async NID OCR verification pipeline.

    Created when a citizen submits a complaint with an NID photo.
    Updated by the Celery worker as it processes the image through
    the OCR → Parse → Verify → Account Creation pipeline.

    OneToOne with Complaint: each complaint can have at most one
    NID verification task.
    """

    complaint = models.OneToOneField(
        Complaint,
        on_delete=models.CASCADE,
        related_name="nid_task",
        help_text=_("The complaint that triggered this NID verification."),
    )

    # ── Celery Integration ───────────────────────────────────────────────
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
        help_text=_("Celery task ID for tracking the async job."),
    )

    # ── NID Image ────────────────────────────────────────────────────────
    nid_image_url = models.URLField(
        max_length=1024,
        help_text=_("S3 URL of the NID card photo to process."),
    )
    nid_image_object_key = models.CharField(
        max_length=512,
        blank=True,
        default="",
        help_text=_("S3 object key for downloading the NID image."),
    )

    # ── Pipeline Status ──────────────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=NIDVerificationStatus.choices,
        default=NIDVerificationStatus.PENDING,
        db_index=True,
        help_text=_("Current status of the NID verification pipeline."),
    )

    # ── Extracted Data ───────────────────────────────────────────────────
    extracted_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=_("Name extracted from the NID card via OCR."),
    )
    extracted_address = models.TextField(
        blank=True,
        default="",
        help_text=_("Address extracted from the NID card via OCR."),
    )
    extracted_nid_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text=_("NID number extracted from the card via OCR."),
    )

    # ── Verification Result ──────────────────────────────────────────────
    jurisdiction_match = models.BooleanField(
        null=True,
        blank=True,
        help_text=_(
            "Whether the extracted address falls within the "
            "Union Parishad's jurisdiction. NULL = not yet checked."
        ),
    )
    error_message = models.TextField(
        blank=True,
        default="",
        help_text=_("Error details if the verification pipeline failed."),
    )

    # ── Linked User (created on successful verification) ─────────────────
    created_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nid_verifications",
        help_text=_(
            "The user account auto-created after successful NID verification."
        ),
    )

    class Meta:
        verbose_name = _("NID Verification Task")
        verbose_name_plural = _("NID Verification Tasks")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="idx_nidtask_status_date",
            ),
        ]

    def __str__(self):
        return (
            f"NID Task [{self.get_status_display()}] — "
            f"Complaint: {self.complaint.subject}"
        )
