"""
DRF permissions for the complaints app.
"""

from rest_framework import permissions


class IsUPMember(permissions.BasePermission):
    """
    Allow access only to Union Parishad members (admins).

    Checks the ``is_up_member`` flag on the user model.
    """

    message = "Only Union Parishad members can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_up_member
        )


class IsComplaintOwner(permissions.BasePermission):
    """
    Allow access only to the user who filed the complaint.

    For anonymous complaints (no complainant), this permission denies
    access — anonymous users should use the tracking token endpoint instead.
    """

    message = "You can only access your own complaints."

    def has_object_permission(self, request, view, obj):
        if obj.is_anonymous or obj.complainant is None:
            return False
        return obj.complainant == request.user


class IsUPMemberOrComplaintOwner(permissions.BasePermission):
    """
    Allow access to UP members (full access) or complaint owners (own only).
    """

    message = "Access denied."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # UP members can access any complaint
        if user.is_up_member:
            return True

        # Regular users can only access their own complaints
        if obj.complainant and obj.complainant == user:
            return True

        return False
