"""
Django Channels WebSocket consumer for real-time admin notifications.

Provides a WebSocket endpoint for UP Member dashboard to receive
instant notifications when:
- A new complaint is submitted
- A complaint status changes
- NID verification completes (success or failure)

The consumer uses Redis-backed channel layers for horizontal scalability
across multiple ASGI server instances.
"""

import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)

# Group name for all admin notifications
ADMIN_NOTIFICATIONS_GROUP = "admin_notifications"


class AdminNotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for the UP Member (admin) dashboard.

    Connection lifecycle:
        1. Client connects to ws://.../ws/admin/notifications/
        2. Consumer checks authentication (must be an UP member)
        3. Joins the 'admin_notifications' channel group
        4. Receives real-time JSON events pushed by Celery tasks
           and DRF views via channel_layer.group_send()
        5. On disconnect, leaves the group

    Event types:
        - new_complaint: A new complaint has been submitted
        - status_change: A complaint's status has been updated
        - nid_verified: NID verification pipeline completed
        - nid_failed: NID verification pipeline failed
    """

    async def connect(self):
        """
        Handle WebSocket connection.

        Validates that the connecting user is authenticated and is a
        UP member. Rejects connection otherwise.
        """
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            logger.warning("Rejected unauthenticated WebSocket connection")
            await self.close(code=4001)
            return

        if not (getattr(user, "is_up_member", False) or getattr(user, "is_chairman", False)):
            logger.warning(
                "Rejected WebSocket from non-UP-member/Chairman: %s", user.username
            )
            await self.close(code=4003)
            return

        # Join the admin notifications group
        await self.channel_layer.group_add(
            ADMIN_NOTIFICATIONS_GROUP,
            self.channel_name,
        )

        await self.accept()
        logger.info("Admin WebSocket connected: %s", user.username)

        # Send a welcome message
        await self.send_json({
            "type": "connection_established",
            "message": "Connected to admin notification stream.",
            "user": user.username,
        })

    async def disconnect(self, close_code):
        """Leave the admin notifications group on disconnect."""
        await self.channel_layer.group_discard(
            ADMIN_NOTIFICATIONS_GROUP,
            self.channel_name,
        )
        logger.info("Admin WebSocket disconnected (code: %s)", close_code)

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming messages from the client.

        Currently, the admin dashboard only listens — it doesn't send
        commands via WebSocket. This handler is a placeholder for future
        features (e.g., typing indicators, read receipts).
        """
        logger.debug("Received WebSocket message: %s", content)

    # ── Event Handlers (called by channel_layer.group_send) ──────────

    async def new_complaint(self, event):
        """Notify admin of a new complaint submission."""
        await self.send_json({
            "type": "new_complaint",
            "complaint_id": event.get("complaint_id"),
            "subject": event.get("subject"),
            "is_anonymous": event.get("is_anonymous"),
            "tracking_token": event.get("tracking_token"),
            "created_at": event.get("created_at"),
        })

    async def status_change(self, event):
        """Notify admin of a complaint status change."""
        await self.send_json({
            "type": "status_change",
            "complaint_id": event.get("complaint_id"),
            "subject": event.get("subject"),
            "old_status": event.get("old_status"),
            "new_status": event.get("new_status"),
            "changed_by": event.get("changed_by"),
        })

    async def nid_verified(self, event):
        """Notify admin of successful NID verification."""
        await self.send_json({
            "type": "nid_verified",
            "complaint_id": event.get("complaint_id"),
            "subject": event.get("subject"),
            "extracted_name": event.get("extracted_name"),
            "username": event.get("username"),
        })

    async def nid_failed(self, event):
        """Notify admin of failed NID verification."""
        await self.send_json({
            "type": "nid_failed",
            "complaint_id": event.get("complaint_id"),
            "subject": event.get("subject"),
            "error": event.get("error"),
        })

    async def complaint_escalated(self, event):
        """Notify Chairman/admin of escalated complaint."""
        await self.send_json({
            "type": "complaint_escalated",
            "complaint_id": event.get("complaint_id"),
            "subject": event.get("subject"),
            "escalated_at": event.get("escalated_at"),
        })
