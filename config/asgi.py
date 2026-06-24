"""
ASGI configuration for Smart Union Postbox.

Configures the ProtocolTypeRouter to handle both HTTP and WebSocket
connections. WebSocket connections are routed through Django Channels
with authentication middleware.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Initialize Django ASGI application early to ensure AppRegistry is populated
# before importing consumers.
django_asgi_app = get_asgi_application()

# Import after Django setup to avoid AppRegistryNotReady errors.
from apps.notifications.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
        ),
    }
)
