"""
DRF views for the authentication app.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView as BaseTokenObtainPairView,
    TokenRefreshView as BaseTokenRefreshView,
)

from .serializers import UserCredentialsSerializer, UserProfileSerializer

User = get_user_model()


class TokenObtainPairView(BaseTokenObtainPairView):
    """
    JWT token obtain endpoint.

    POST /api/v1/auth/login/
    Body: {"username": "...", "password": "..."}
    Returns: {"access": "...", "refresh": "..."}
    """

    pass


class TokenRefreshView(BaseTokenRefreshView):
    """
    JWT token refresh endpoint.

    POST /api/v1/auth/refresh/
    Body: {"refresh": "..."}
    Returns: {"access": "..."}
    """

    pass


class UserProfileView(generics.RetrieveAPIView):
    """
    Retrieve the authenticated user's profile.

    GET /api/v1/auth/profile/
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class CredentialsRetrieveView(APIView):
    """
    One-time endpoint to retrieve auto-generated credentials.

    GET /api/v1/auth/credentials/

    Returns the auto-generated username and password for NID-verified
    users. After retrieval, the plaintext password is cleared from the
    database for security.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if not user.auto_generated_password:
            return Response(
                {
                    "detail": (
                        "No auto-generated credentials available. "
                        "They may have already been retrieved or expired."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserCredentialsSerializer(user)
        data = serializer.data

        # Clear the password after retrieval (one-time display)
        user.clear_auto_credentials()

        return Response(data, status=status.HTTP_200_OK)
