"""
Redis-backed rate-limiting middleware for Smart Union Postbox.

Provides per-IP rate limiting for specific endpoints to prevent
spam submissions. Uses Redis INCR with TTL for atomic, lock-free
counting.

Protected endpoints and their limits are configured in Django settings:
    RATE_LIMIT_COMPLAINTS_PER_HOUR
    RATE_LIMIT_UPLOADS_PER_HOUR
    RATE_LIMIT_REDIS_URL
"""

import logging
import hashlib

import redis
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)

# Mapping of URL path prefixes → (settings attribute, window in seconds)
RATE_LIMIT_RULES = {
    "/api/v1/complaints/submit": ("RATE_LIMIT_COMPLAINTS_PER_HOUR", 3600),
    "/api/v1/complaints/upload": ("RATE_LIMIT_UPLOADS_PER_HOUR", 3600),
}


def _get_client_ip(request):
    """
    Extract the real client IP, respecting X-Forwarded-For behind a
    reverse proxy (e.g., nginx, AWS ALB).
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class RateLimitMiddleware:
    """
    Django middleware that enforces Redis-backed rate limits on
    configured API endpoints.

    If Redis is unavailable, requests are allowed through (fail-open)
    to prevent a Redis outage from blocking the entire application.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        try:
            self._redis = redis.from_url(
                getattr(settings, "RATE_LIMIT_REDIS_URL", "redis://127.0.0.1:6379/0"),
                decode_responses=True,
            )
            # Test connectivity at startup
            self._redis.ping()
        except (redis.ConnectionError, redis.RedisError) as exc:
            logger.warning("Rate-limit Redis unavailable: %s. Fail-open.", exc)
            self._redis = None

    def __call__(self, request):
        # Only rate-limit POST/PUT/PATCH requests
        if request.method in ("POST", "PUT", "PATCH") and self._redis:
            for path_prefix, (limit_attr, window) in RATE_LIMIT_RULES.items():
                if request.path.startswith(path_prefix):
                    if not self._check_rate(request, limit_attr, window):
                        return JsonResponse(
                            {
                                "error": "rate_limit_exceeded",
                                "detail": (
                                    "Too many requests. Please try again later."
                                ),
                            },
                            status=429,
                        )
                    break  # Only match the first rule

        return self.get_response(request)

    def _check_rate(self, request, limit_attr, window):
        """
        Check whether the request is within the rate limit.

        Uses Redis INCR + EXPIRE for atomic, lock-free counting.
        Returns True if allowed, False if rate-limited.
        """
        max_requests = getattr(settings, limit_attr, 10)
        client_ip = _get_client_ip(request)

        # Hash the IP for privacy in Redis keys
        ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]
        key = f"rl:{limit_attr}:{ip_hash}"

        try:
            pipe = self._redis.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            count, ttl = pipe.execute()

            # Set expiry on first request in window
            if ttl == -1:
                self._redis.expire(key, window)

            if count > max_requests:
                logger.warning(
                    "Rate limit hit: %s from %s (%d/%d)",
                    limit_attr,
                    client_ip,
                    count,
                    max_requests,
                )
                return False

            return True

        except (redis.ConnectionError, redis.RedisError) as exc:
            logger.warning("Rate-limit check failed: %s. Allowing request.", exc)
            return True  # Fail-open
