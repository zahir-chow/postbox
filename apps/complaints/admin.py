"""
Django admin configuration for the complaints app.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import (
    Complaint,
    ComplaintAttachment,
    ComplaintStatusLog,
    NIDVerificationTask,
    UnionParishad,
)


@admin.register(UnionParishad)
class UnionParishadAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "district",
        "upazila",
        "union_name",
        "chairman_name",
        "is_active",
    ]
    list_filter = ["district", "upazila", "is_active"]
    search_fields = ["name", "district", "upazila", "union_name"]
    ordering = ["district", "upazila", "name"]


class ComplaintAttachmentInline(admin.TabularInline):
    model = ComplaintAttachment
    extra = 0
    readonly_fields = ["file_url", "file_name", "file_type", "file_size"]


class ComplaintStatusLogInline(admin.TabularInline):
    model = ComplaintStatusLog
    extra = 0
    readonly_fields = ["old_status", "new_status", "changed_by", "notes", "created_at"]
    ordering = ["-created_at"]


class NIDVerificationTaskInline(admin.StackedInline):
    model = NIDVerificationTask
    extra = 0
    readonly_fields = [
        "celery_task_id",
        "nid_image_url",
        "status",
        "extracted_name",
        "extracted_address",
        "extracted_nid_number",
        "jurisdiction_match",
        "error_message",
        "created_user",
    ]


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        "subject",
        "status",
        "priority",
        "is_anonymous",
        "nid_verification_status",
        "union_parishad",
        "created_at",
    ]
    list_filter = [
        "status",
        "priority",
        "is_anonymous",
        "nid_verification_status",
        "union_parishad",
    ]
    search_fields = ["subject", "body", "tracking_token"]
    readonly_fields = ["id", "tracking_token", "created_at", "updated_at", "resolved_at"]
    ordering = ["-created_at"]

    inlines = [
        ComplaintAttachmentInline,
        ComplaintStatusLogInline,
        NIDVerificationTaskInline,
    ]

    fieldsets = (
        (
            _("Complaint Details"),
            {
                "fields": (
                    "id",
                    "tracking_token",
                    "union_parishad",
                    "complainant",
                    "is_anonymous",
                    "subject",
                    "body",
                ),
            },
        ),
        (
            _("Status & Priority"),
            {
                "fields": (
                    "status",
                    "priority",
                    "nid_verification_status",
                    "admin_notes",
                ),
            },
        ),
        (
            _("Timestamps"),
            {
                "classes": ("collapse",),
                "fields": ("created_at", "updated_at", "resolved_at"),
            },
        ),
    )


@admin.register(ComplaintStatusLog)
class ComplaintStatusLogAdmin(admin.ModelAdmin):
    list_display = [
        "complaint",
        "old_status",
        "new_status",
        "changed_by",
        "created_at",
    ]
    list_filter = ["new_status"]
    readonly_fields = ["complaint", "old_status", "new_status", "changed_by", "notes", "created_at"]
    ordering = ["-created_at"]


@admin.register(NIDVerificationTask)
class NIDVerificationTaskAdmin(admin.ModelAdmin):
    list_display = [
        "complaint",
        "status",
        "extracted_name",
        "jurisdiction_match",
        "created_at",
    ]
    list_filter = ["status", "jurisdiction_match"]
    readonly_fields = [
        "complaint",
        "celery_task_id",
        "nid_image_url",
        "status",
        "extracted_name",
        "extracted_address",
        "extracted_nid_number",
        "jurisdiction_match",
        "error_message",
        "created_user",
    ]
    ordering = ["-created_at"]
