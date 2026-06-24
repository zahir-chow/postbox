"""
Celery tasks for the authentication app.

Handles periodic cleanup of auto-generated credentials that haven't
been retrieved within the expiry window (24 hours by default).
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(name="auth.cleanup_expired_credentials")
def cleanup_expired_credentials():
    """
    Clear auto-generated passwords older than 24 hours.

    This is a periodic task (configured via Celery Beat) that ensures
    plaintext credentials don't persist in the database indefinitely.
    """
    expiry_cutoff = timezone.now() - timedelta(hours=24)

    expired_users = User.objects.filter(
        auto_generated_password__gt="",  # Non-empty
        date_joined__lt=expiry_cutoff,
    )

    count = expired_users.count()

    if count > 0:
        expired_users.update(auto_generated_password="")
        logger.info("Cleared %d expired auto-generated credentials.", count)
    else:
        logger.debug("No expired credentials to clear.")

    return {"cleared": count}
