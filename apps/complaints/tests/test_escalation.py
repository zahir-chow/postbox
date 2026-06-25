import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.complaints.models import Complaint, ComplaintStatus, UnionParishad
from apps.complaints.permissions import IsUPMember, IsUPMemberOrComplaintOwner
from apps.complaints.views import ComplaintListView, ComplaintStatusUpdateView

User = get_user_model()


@pytest.mark.django_db
class TestEscalationWorkflow:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.factory = APIRequestFactory()
        
        # Create a Union Parishad
        self.up = UnionParishad.objects.create(
            name="Test UP",
            district="Dhaka",
            upazila="Dhamrai",
            union_name="Test Union"
        )
        
        # Create users
        self.citizen = User.objects.create_user(
            username="citizen",
            email="citizen@test.com",
            password="password123"
        )
        self.up_member = User.objects.create_user(
            username="upmember",
            email="member@test.com",
            password="password123",
            is_up_member=True
        )
        self.chairman = User.objects.create_user(
            username="chairman",
            email="chairman@test.com",
            password="password123",
            is_chairman=True
        )
        
        # Create a complaint
        self.complaint = Complaint.objects.create(
            union_parishad=self.up,
            complainant=self.citizen,
            is_anonymous=False,
            subject="Test Subject",
            body="Test Body",
            status=ComplaintStatus.UNREAD
        )

    def test_user_roles_is_chairman_field(self):
        """Verify is_chairman field on User model."""
        assert not self.citizen.is_chairman
        assert not self.up_member.is_chairman
        assert self.chairman.is_chairman

    def test_permissions_is_up_member_class(self):
        """Verify IsUPMember permission class allows both UP Member and Chairman."""
        permission = IsUPMember()
        
        # Citizen should be denied
        request_citizen = self.factory.get("/dummy/")
        request_citizen.user = self.citizen
        assert not permission.has_permission(request_citizen, None)
        
        # UP Member should be allowed
        request_member = self.factory.get("/dummy/")
        request_member.user = self.up_member
        assert permission.has_permission(request_member, None)
        
        # Chairman should be allowed
        request_chairman = self.factory.get("/dummy/")
        request_chairman.user = self.chairman
        assert permission.has_permission(request_chairman, None)

    def test_permissions_is_up_member_or_owner_class(self):
        """Verify IsUPMemberOrComplaintOwner allows UP Member, Chairman, and Owner."""
        permission = IsUPMemberOrComplaintOwner()
        
        # Citizen (owner) should be allowed
        request_citizen = self.factory.get("/dummy/")
        request_citizen.user = self.citizen
        assert permission.has_object_permission(request_citizen, None, self.complaint)
        
        # Other citizen should be denied
        other_citizen = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="password123"
        )
        request_other = self.factory.get("/dummy/")
        request_other.user = other_citizen
        assert not permission.has_object_permission(request_other, None, self.complaint)
        
        # UP Member should be allowed
        request_member = self.factory.get("/dummy/")
        request_member.user = self.up_member
        assert permission.has_object_permission(request_member, None, self.complaint)
        
        # Chairman should be allowed
        request_chairman = self.factory.get("/dummy/")
        request_chairman.user = self.chairman
        assert permission.has_object_permission(request_chairman, None, self.complaint)

    def test_complaint_status_choices(self):
        """Verify ESCALATED is a valid choice in ComplaintStatus."""
        assert "ESCALATED" in ComplaintStatus.values
        
        self.complaint.status = ComplaintStatus.ESCALATED
        self.complaint.save()
        
        db_complaint = Complaint.objects.get(pk=self.complaint.pk)
        assert db_complaint.status == ComplaintStatus.ESCALATED

    @patch("apps.notifications.utils.notify_chairman_escalation")
    @patch("apps.notifications.utils.notify_admin_status_change")
    def test_status_update_view_triggers_escalation_notification(
        self, mock_status_change, mock_escalation
    ):
        """Verify that updating status to ESCALATED triggers the Chairman notification."""
        view = ComplaintStatusUpdateView.as_view()
        
        # Payload to escalate
        data = {
            "status": ComplaintStatus.ESCALATED,
            "notes": "Moving to Chairman due to high importance"
        }
        
        request = self.factory.patch(
            f"/api/v1/complaints/{self.complaint.id}/status/",
            data,
            format="json"
        )
        request.user = self.up_member
        
        response = view(request, pk=str(self.complaint.id))
        
        assert response.status_code == status.HTTP_200_OK
        
        # Escalation notification should be called
        mock_escalation.assert_called_once()
        mock_status_change.assert_not_called()
        
        # Check database update
        self.complaint.refresh_from_db()
        assert self.complaint.status == ComplaintStatus.ESCALATED

    @patch("apps.notifications.utils.notify_chairman_escalation")
    @patch("apps.notifications.utils.notify_admin_status_change")
    def test_status_update_view_triggers_normal_notification(
        self, mock_status_change, mock_escalation
    ):
        """Verify that updating status to standard status triggers regular notification."""
        view = ComplaintStatusUpdateView.as_view()
        
        # Payload to move to IN_PROGRESS
        data = {
            "status": ComplaintStatus.IN_PROGRESS,
            "notes": "Starting review"
        }
        
        request = self.factory.patch(
            f"/api/v1/complaints/{self.complaint.id}/status/",
            data,
            format="json"
        )
        request.user = self.up_member
        
        response = view(request, pk=str(self.complaint.id))
        
        assert response.status_code == status.HTTP_200_OK
        
        # Normal notification should be called
        mock_status_change.assert_called_once()
        mock_escalation.assert_not_called()
