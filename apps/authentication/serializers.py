"""
DRF serializers for the authentication app.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that embeds additional claims.

    Adds ``is_up_member``, ``is_chairman``, and ``nid_verified`` flags to the token
    payload so the frontend can determine user role without an
    additional API call.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_up_member"] = user.is_up_member
        token["is_chairman"] = user.is_chairman
        token["nid_verified"] = user.nid_verified
        token["display_name"] = user.display_name
        return token


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the authenticated user's profile.
    """

    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "display_name",
            "nid_number",
            "nid_name",
            "nid_address",
            "nid_verified",
            "is_up_member",
            "is_chairman",
            "avatar_url",
            "date_joined",
        ]
        read_only_fields = fields


class UserCredentialsSerializer(serializers.ModelSerializer):
    """
    One-time serializer to display auto-generated credentials.

    Returns the auto-generated username and password so the NID-verified
    user can note them down. The ``auto_generated_password`` field is
    cleared after this endpoint is called.
    """

    class Meta:
        model = User
        fields = [
            "username",
            "auto_generated_password",
        ]
        read_only_fields = fields
