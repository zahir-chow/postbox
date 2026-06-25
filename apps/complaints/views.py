"""
DRF views for the complaints app.

Implements all complaint-related API endpoints including:
- Complaint submission (anonymous + NID-verified)
- Public tracking by token
- Authenticated complaint listing
- Admin status updates
- S3 presigned URL generation
- Admin dashboard statistics
"""

import logging

from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.storage import get_s3_generator

from .models import Complaint, ComplaintStatus, ComplaintStatusLog, UnionParishad
from .permissions import IsUPMember, IsUPMemberOrComplaintOwner
from .serializers import (
    ComplaintCreateSerializer,
    ComplaintDetailSerializer,
    ComplaintListSerializer,
    ComplaintStatusUpdateSerializer,
    ComplaintTrackingSerializer,
    PresignedURLRequestSerializer,
    UnionParishadSerializer,
)

logger = logging.getLogger(__name__)


# =========================================================================
# Complaint Submission (AllowAny — supports anonymous)
# =========================================================================


class ComplaintCreateView(generics.CreateAPIView):
    """
    Submit a new complaint.

    POST /api/v1/complaints/submit/

    Supports both anonymous and NID-verified submissions:
    - Anonymous: Set ``is_anonymous=true``. Returns a ``tracking_token``.
    - NID-verified: Set ``is_anonymous=false`` and provide ``nid_image_url``.
      Returns ``202 Accepted`` — NID processing happens asynchronously.

    Request body:
        {
            "union_parishad": "<uuid>",
            "subject": "...",
            "body": "...",
            "is_anonymous": true/false,
            "attachments": [{"file_url": "...", "object_key": "...", ...}],
            "nid_image_url": "...",        (required if not anonymous)
            "nid_image_object_key": "..."  (required if not anonymous)
        }
    """

    serializer_class = ComplaintCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()

        # If NID verification was triggered, return 202 Accepted
        if not complaint.is_anonymous:
            return Response(
                {
                    "id": str(complaint.id),
                    "tracking_token": str(complaint.tracking_token),
                    "status": "accepted",
                    "detail": (
                        "Your complaint has been received. NID verification "
                        "is being processed in the background. You will be "
                        "notified once verification is complete."
                    ),
                },
                status=status.HTTP_202_ACCEPTED,
            )

        # Anonymous submission — return 201 Created with tracking token
        return Response(
            {
                "id": str(complaint.id),
                "tracking_token": str(complaint.tracking_token),
                "status": "created",
                "detail": (
                    "Your anonymous complaint has been submitted. "
                    "Use the tracking token to check your complaint status."
                ),
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================================
# Public Tracking (AllowAny — by tracking token)
# =========================================================================


class ComplaintTrackView(generics.RetrieveAPIView):
    """
    Track a complaint by its public tracking token.

    GET /api/v1/complaints/track/<uuid:tracking_token>/

    This is the public endpoint for anonymous users to check their
    complaint status without authentication.
    """

    serializer_class = ComplaintTrackingSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "tracking_token"
    queryset = Complaint.objects.prefetch_related("status_logs")


# =========================================================================
# Authenticated Complaint List
# =========================================================================


class ComplaintListView(generics.ListAPIView):
    """
    List complaints for the authenticated user.

    GET /api/v1/complaints/

    - Regular users: See only their own complaints.
    - UP members: See all complaints for their UP.
    """

    serializer_class = ComplaintListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_chairman:
            # Chairman sees only escalated complaints
            qs = Complaint.objects.select_related(
                "union_parishad", "complainant"
            ).filter(status=ComplaintStatus.ESCALATED)
        elif user.is_up_member:
            # UP Member sees all complaints except escalated ones
            qs = Complaint.objects.select_related(
                "union_parishad", "complainant"
            ).exclude(status=ComplaintStatus.ESCALATED)
        else:
            # Regular user sees only their complaints
            qs = Complaint.objects.select_related(
                "union_parishad"
            ).filter(complainant=user)

        # Optional filters
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        priority_filter = self.request.query_params.get("priority")
        if priority_filter:
            qs = qs.filter(priority=priority_filter)

        is_anonymous = self.request.query_params.get("is_anonymous")
        if is_anonymous is not None:
            qs = qs.filter(is_anonymous=is_anonymous.lower() == "true")

        return qs


# =========================================================================
# Complaint Detail
# =========================================================================


class ComplaintDetailView(generics.RetrieveAPIView):
    """
    Retrieve full complaint details.

    GET /api/v1/complaints/<uuid:pk>/

    Includes attachments, status logs, and NID verification data.
    Access restricted to complaint owner or UP members.
    """

    serializer_class = ComplaintDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsUPMemberOrComplaintOwner]
    queryset = Complaint.objects.select_related(
        "union_parishad", "complainant", "nid_task"
    ).prefetch_related("attachments", "status_logs", "status_logs__changed_by")


# =========================================================================
# Admin Status Update
# =========================================================================


class ComplaintStatusUpdateView(APIView):
    """
    Update complaint status (admin only).

    PATCH /api/v1/complaints/<uuid:pk>/status/

    Creates a status log entry for the audit trail and optionally
    updates priority and admin notes.

    Request body:
        {
            "status": "UNDER_REVIEW",
            "notes": "Reviewing the complaint...",
            "priority": "HIGH",
            "admin_notes": "Internal note..."
        }
    """

    permission_classes = [permissions.IsAuthenticated, IsUPMember]

    def patch(self, request, pk):
        try:
            complaint = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return Response(
                {"detail": "Complaint not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ComplaintStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = complaint.status
        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")

        # Create audit log
        ComplaintStatusLog.objects.create(
            complaint=complaint,
            old_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            notes=notes,
        )

        # Update complaint
        complaint.status = new_status

        if "priority" in serializer.validated_data:
            complaint.priority = serializer.validated_data["priority"]

        if "admin_notes" in serializer.validated_data:
            complaint.admin_notes = serializer.validated_data["admin_notes"]

        complaint.save()

        # Notify via WebSocket
        try:
            if new_status == ComplaintStatus.ESCALATED:
                from apps.notifications.utils import notify_chairman_escalation

                notify_chairman_escalation(complaint)
            else:
                from apps.notifications.utils import notify_admin_status_change

                notify_admin_status_change(complaint, old_status, new_status)
        except Exception:
            logger.exception("Failed to send status change notification")

        return Response(
            {
                "id": str(complaint.id),
                "old_status": old_status,
                "new_status": new_status,
                "detail": f"Status updated to {complaint.get_status_display()}.",
            },
            status=status.HTTP_200_OK,
        )


# =========================================================================
# S3 Presigned URL
# =========================================================================


class PresignedURLView(APIView):
    """
    Generate an S3 presigned PUT URL for direct file upload.

    POST /api/v1/complaints/upload/presigned-url/

    The frontend uses this URL to upload files directly to S3,
    bypassing the Django server entirely. This is critical for
    high-concurrency performance.

    Request body:
        {
            "file_name": "evidence.jpg",
            "content_type": "image/jpeg",
            "folder": "attachments"  // or "nid-photos"
        }

    Response:
        {
            "upload_url": "https://s3.../...",
            "object_key": "attachments/abc123_evidence.jpg",
            "expires_in": 3600
        }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PresignedURLRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            s3 = get_s3_generator()
            result = s3.generate_upload_url(
                file_name=serializer.validated_data["file_name"],
                content_type=serializer.validated_data["content_type"],
                folder=serializer.validated_data.get("folder", "attachments"),
            )
            return Response(result, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Failed to generate presigned URL")
            return Response(
                {"detail": "Failed to generate upload URL. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =========================================================================
# Admin Dashboard Statistics
# =========================================================================


class AdminDashboardStatsView(APIView):
    """
    Aggregated statistics for the UP member dashboard.

    GET /api/v1/complaints/admin/stats/

    Returns complaint counts by status, priority distribution,
    and recent activity metrics.
    """

    permission_classes = [permissions.IsAuthenticated, IsUPMember]

    def get(self, request):
        user = request.user

        # Base query filtered by user type
        if user.is_chairman:
            base_qs = Complaint.objects.filter(status=ComplaintStatus.ESCALATED)
        elif user.is_up_member:
            base_qs = Complaint.objects.exclude(status=ComplaintStatus.ESCALATED)
        else:
            base_qs = Complaint.objects.filter(complainant=user)

        # Status distribution
        status_counts = (
            base_qs.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        # Priority distribution
        priority_counts = (
            base_qs.values("priority")
            .annotate(count=Count("id"))
            .order_by("priority")
        )

        # Anonymous vs. verified
        source_counts = (
            base_qs.values("is_anonymous")
            .annotate(count=Count("id"))
        )

        # Total counts
        total = base_qs.count()
        unread = base_qs.filter(status=ComplaintStatus.UNREAD).count()
        in_progress = base_qs.filter(
            status__in=[ComplaintStatus.UNDER_REVIEW, ComplaintStatus.IN_PROGRESS]
        ).count()
        resolved = base_qs.filter(status=ComplaintStatus.RESOLVED).count()

        return Response(
            {
                "total": total,
                "unread": unread,
                "in_progress": in_progress,
                "resolved": resolved,
                "by_status": {item["status"]: item["count"] for item in status_counts},
                "by_priority": {
                    item["priority"]: item["count"] for item in priority_counts
                },
                "by_source": {
                    "anonymous": next(
                        (s["count"] for s in source_counts if s["is_anonymous"]), 0
                    ),
                    "verified": next(
                        (s["count"] for s in source_counts if not s["is_anonymous"]), 0
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )


# =========================================================================
# Union Parishad List (Public)
# =========================================================================


class UnionParishadListView(generics.ListAPIView):
    """
    List all active Union Parishads.

    GET /api/v1/complaints/union-parishads/

    Public endpoint used by the complaint submission form to populate
    the Union Parishad dropdown.
    """

    serializer_class = UnionParishadSerializer
    permission_classes = [permissions.AllowAny]
    queryset = UnionParishad.objects.filter(is_active=True).order_by("name")
    pagination_class = None  # Return all UPs without pagination
