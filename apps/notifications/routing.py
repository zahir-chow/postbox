"""
WebSocket URL routing for the notifications app.
"""

from django.urls import path

from .consumers import AdminNotificationConsumer

websocket_urlpatterns = [
    path("ws/admin/notifications/", AdminNotificationConsumer.as_asgi()),
]
