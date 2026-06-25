"""
Utility functions for sending real-time notifications via Django Channels.

These functions are called from DRF views and Celery tasks to push
events to the admin WebSocket group. They use ``async_to_sync`` to
bridge the sync/async boundary since Celery tasks and DRF views
run in synchronous contexts.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import ADMIN_NOTIFICATIONS_GROUP

logger = logging.getLogger(__name__)


def _send_to_admin_group(event: dict):
    """
    Send an event to the admin notifications WebSocket group.

    Uses ``async_to_sync`` to call the async channel layer from
    synchronous Celery tasks and DRF views.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning("Channel layer not configured. Skipping notification.")
            return

        async_to_sync(channel_layer.group_send)(
            ADMIN_NOTIFICATIONS_GROUP,
            event,
        )
    except Exception:
        logger.exception("Failed to send WebSocket notification")


def notify_admin_new_complaint(complaint):
    """
    Notify admin dashboard of a new complaint submission.

    Called from the ComplaintCreateView after saving a new complaint.
    """
    _send_to_admin_group({
        "type": "new_complaint",
        "complaint_id": str(complaint.id),
        "subject": complaint.subject,
        "is_anonymous": complaint.is_anonymous,
        "tracking_token": str(complaint.tracking_token),
        "created_at": complaint.created_at.isoformat() if complaint.created_at else "",
    })
    logger.info("Sent new_complaint notification for: %s", complaint.id)


def notify_admin_status_change(complaint, old_status: str, new_status: str):
    """
    Notify admin dashboard of a complaint status change.

    Called from the ComplaintStatusUpdateView after updating status.
    """
    _send_to_admin_group({
        "type": "status_change",
        "complaint_id": str(complaint.id),
        "subject": complaint.subject,
        "old_status": old_status,
        "new_status": new_status,
        "changed_by": (
            complaint.complainant.display_name
            if complaint.complainant
            else "System"
        ),
    })
    logger.info(
        "Sent status_change notification: %s → %s for %s",
        old_status,
        new_status,
        complaint.id,
    )


def notify_admin_new_verification(nid_task):
    """
    Notify admin dashboard of NID verification completion.

    Called from the Celery NID OCR pipeline after verification.
    """
    complaint = nid_task.complaint

    if nid_task.status == "VERIFIED":
        _send_to_admin_group({
            "type": "nid_verified",
            "complaint_id": str(complaint.id),
            "subject": complaint.subject,
            "extracted_name": nid_task.extracted_name,
            "username": (
                nid_task.created_user.username
                if nid_task.created_user
                else ""
            ),
        })
    else:
        _send_to_admin_group({
            "type": "nid_failed",
            "complaint_id": str(complaint.id),
            "subject": complaint.subject,
            "error": nid_task.error_message[:200],
        })

    logger.info(
        "Sent NID verification notification (%s) for: %s",
        nid_task.status,
        complaint.id,
    )


def notify_chairman_escalation(complaint):
    """
    Notify admin dashboard/Chairman of a complaint escalation to the Chairman.

    Called from the ComplaintStatusUpdateView when status is updated to ESCALATED.
    """
    _send_to_admin_group({
        "type": "complaint_escalated",
        "complaint_id": str(complaint.id),
        "subject": complaint.subject,
        "escalated_at": complaint.updated_at.isoformat() if complaint.updated_at else "",
    })
    logger.info("Sent complaint_escalated notification for: %s", complaint.id)
