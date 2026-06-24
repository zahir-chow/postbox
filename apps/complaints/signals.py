"""
Django signals for the complaints app.

Handles side-effects when complaint status changes, such as:
- Setting ``resolved_at`` timestamp when status becomes RESOLVED
- Sending WebSocket notifications to admin dashboard
"""

import logging

from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Complaint, ComplaintStatus

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Complaint)
def handle_complaint_status_change(sender, instance, **kwargs):
    """
    Set ``resolved_at`` when a complaint is resolved.

    Triggered before save — checks if the status field has changed
    by comparing against the database version of the record.
    """
    if not instance.pk:
        # New complaint — nothing to compare
        return

    try:
        old_instance = Complaint.all_objects.get(pk=instance.pk)
    except Complaint.DoesNotExist:
        return

    if old_instance.status != instance.status:
        logger.info(
            "Complaint %s status: %s → %s",
            instance.id,
            old_instance.status,
            instance.status,
        )

        # Set resolved_at when transitioning to RESOLVED
        if instance.status == ComplaintStatus.RESOLVED and not instance.resolved_at:
            instance.resolved_at = timezone.now()

        # Clear resolved_at if re-opened from RESOLVED
        if old_instance.status == ComplaintStatus.RESOLVED and instance.status != ComplaintStatus.RESOLVED:
            instance.resolved_at = None
