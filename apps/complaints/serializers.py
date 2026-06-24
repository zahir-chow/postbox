"""
DRF serializers for the complaints app.
"""

from django.conf import settings
from rest_framework import serializers

from .models import (
    Complaint,
    ComplaintAttachment,
    ComplaintStatus,
    ComplaintStatusLog,
    NIDVerificationTask,
    UnionParishad,
)


class UnionParishadSerializer(serializers.ModelSerializer):
    """Read-only serializer for Union Parishad data."""

    class Meta:
        model = UnionParishad
        fields = [
            "id",
            "name",
            "district",
            "upazila",
            "union_name",
            "chairman_name",
            "contact_phone",
        ]
        read_only_fields = fields


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for complaint attachments."""

    class Meta:
        model = ComplaintAttachment
        fields = [
            "id",
            "file_url",
            "object_key",
            "file_name",
            "file_type",
            "file_size",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AttachmentInputSerializer(serializers.Serializer):
    """
    Input serializer for attaching files to a complaint.

    The client uploads files directly to S3 via presigned URL,
    then sends the S3 metadata back to Django.
    """

    file_url = serializers.URLField()
    object_key = serializers.CharField(max_length=512)
    file_name = serializers.CharField(max_length=255)
    file_type = serializers.CharField(max_length=100)
    file_size = serializers.IntegerField(min_value=0)

    def validate_file_type(self, value):
        allowed = getattr(settings, "ALLOWED_UPLOAD_TYPES", [])
        if allowed and value not in allowed:
            raise serializers.ValidationError(
                f"File type '{value}' is not allowed. "
                f"Allowed types: {', '.join(allowed)}"
            )
        return value

    def validate_file_size(self, value):
        max_size = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024)
        if value > max_size:
            raise serializers.ValidationError(
                f"File size ({value} bytes) exceeds maximum "
                f"allowed size ({max_size} bytes)."
            )
        return value


class ComplaintCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new complaint.

    Handles both anonymous and NID-verified submissions.
    Attachments are provided as a list of S3 metadata objects
    (files already uploaded to S3 via presigned URL).
    """

    attachments = AttachmentInputSerializer(many=True, required=False, write_only=True)
    nid_image_url = serializers.URLField(required=False, write_only=True)
    nid_image_object_key = serializers.CharField(
        required=False, max_length=512, write_only=True
    )
    tracking_token = serializers.UUIDField(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "tracking_token",
            "union_parishad",
            "subject",
            "body",
            "is_anonymous",
            "attachments",
            "nid_image_url",
            "nid_image_object_key",
            "created_at",
        ]
        read_only_fields = ["id", "tracking_token", "created_at"]

    def validate(self, data):
        """
        Validate complaint data:
        - If not anonymous, NID image is required
        - Attachment count must not exceed limit
        """
        attachments = data.get("attachments", [])
        max_attachments = getattr(settings, "MAX_ATTACHMENTS_PER_COMPLAINT", 5)

        if len(attachments) > max_attachments:
            raise serializers.ValidationError(
                f"Maximum {max_attachments} attachments allowed per complaint."
            )

        # If submitting with NID verification, require NID image
        if not data.get("is_anonymous", True):
            if not data.get("nid_image_url"):
                raise serializers.ValidationError(
                    "NID image is required for non-anonymous submissions."
                )

        return data

    def create(self, validated_data):
        attachments_data = validated_data.pop("attachments", [])
        nid_image_url = validated_data.pop("nid_image_url", "")
        nid_image_object_key = validated_data.pop("nid_image_object_key", "")

        # Create the complaint
        complaint = Complaint.objects.create(**validated_data)

        # Create attachments
        for attachment_data in attachments_data:
            ComplaintAttachment.objects.create(
                complaint=complaint, **attachment_data
            )

        # If non-anonymous with NID, create verification task and trigger Celery
        if not complaint.is_anonymous and nid_image_url:
            from .models import NIDVerificationStatus

            nid_task = NIDVerificationTask.objects.create(
                complaint=complaint,
                nid_image_url=nid_image_url,
                nid_image_object_key=nid_image_object_key,
                status=NIDVerificationStatus.PENDING,
            )

            # Trigger async NID verification
            from .tasks import process_nid_verification

            celery_result = process_nid_verification.delay(str(nid_task.id))
            nid_task.celery_task_id = celery_result.id
            nid_task.save(update_fields=["celery_task_id"])

            complaint.nid_verification_status = NIDVerificationStatus.PENDING
            complaint.save(update_fields=["nid_verification_status"])

        return complaint


class ComplaintListSerializer(serializers.ModelSerializer):
    """
    Compact serializer for listing complaints.

    Truncates the body for performance and includes attachment count.
    """

    attachment_count = serializers.ReadOnlyField()
    complainant_name = serializers.SerializerMethodField()
    union_parishad_name = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "id",
            "tracking_token",
            "subject",
            "status",
            "priority",
            "is_anonymous",
            "complainant_name",
            "union_parishad_name",
            "nid_verification_status",
            "attachment_count",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields

    def get_complainant_name(self, obj):
        if obj.is_anonymous or not obj.complainant:
            return "Anonymous"
        return obj.complainant.display_name

    def get_union_parishad_name(self, obj):
        return obj.union_parishad.name


class StatusLogSerializer(serializers.ModelSerializer):
    """Serializer for complaint status change audit trail."""

    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintStatusLog
        fields = [
            "id",
            "old_status",
            "new_status",
            "changed_by_name",
            "notes",
            "created_at",
        ]
        read_only_fields = fields

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.display_name
        return "System"


class NIDVerificationTaskSerializer(serializers.ModelSerializer):
    """Read-only serializer for NID verification task status."""

    class Meta:
        model = NIDVerificationTask
        fields = [
            "id",
            "status",
            "extracted_name",
            "jurisdiction_match",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ComplaintDetailSerializer(serializers.ModelSerializer):
    """
    Full detail serializer for a single complaint.

    Includes nested attachments, status logs, and NID verification status.
    """

    attachments = AttachmentSerializer(many=True, read_only=True)
    status_logs = StatusLogSerializer(many=True, read_only=True)
    nid_task = NIDVerificationTaskSerializer(read_only=True)
    complainant_name = serializers.SerializerMethodField()
    union_parishad = UnionParishadSerializer(read_only=True)
    attachment_count = serializers.ReadOnlyField()

    class Meta:
        model = Complaint
        fields = [
            "id",
            "tracking_token",
            "union_parishad",
            "complainant_name",
            "is_anonymous",
            "subject",
            "body",
            "status",
            "priority",
            "nid_verification_status",
            "admin_notes",
            "attachment_count",
            "attachments",
            "status_logs",
            "nid_task",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = fields

    def get_complainant_name(self, obj):
        if obj.is_anonymous or not obj.complainant:
            return "Anonymous"
        return obj.complainant.display_name


class ComplaintTrackingSerializer(serializers.ModelSerializer):
    """
    Public-facing serializer for anonymous complaint tracking.

    Returns limited information — no admin notes, no internal IDs.
    Used by the tracking endpoint that accepts a tracking token.
    """

    status_logs = StatusLogSerializer(many=True, read_only=True)
    attachment_count = serializers.ReadOnlyField()

    class Meta:
        model = Complaint
        fields = [
            "tracking_token",
            "subject",
            "status",
            "priority",
            "nid_verification_status",
            "attachment_count",
            "status_logs",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class ComplaintStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for admin status updates.

    Validates the new status and optional notes.
    """

    status = serializers.ChoiceField(choices=ComplaintStatus.choices)
    notes = serializers.CharField(required=False, default="", allow_blank=True)
    priority = serializers.ChoiceField(
        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("URGENT", "Urgent")],
        required=False,
    )
    admin_notes = serializers.CharField(required=False, default="", allow_blank=True)


class PresignedURLRequestSerializer(serializers.Serializer):
    """
    Validates a request for an S3 presigned upload URL.
    """

    file_name = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)
    folder = serializers.ChoiceField(
        choices=[
            ("attachments", "Complaint Attachments"),
            ("nid-photos", "NID Card Photos"),
        ],
        default="attachments",
    )

    def validate_content_type(self, value):
        allowed = getattr(settings, "ALLOWED_UPLOAD_TYPES", [])
        if allowed and value not in allowed:
            raise serializers.ValidationError(
                f"Content type '{value}' is not allowed. "
                f"Allowed: {', '.join(allowed)}"
            )
        return value
