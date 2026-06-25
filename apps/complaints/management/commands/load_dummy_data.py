import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.complaints.models import (
    UnionParishad,
    Complaint,
    ComplaintAttachment,
    ComplaintStatusLog,
    NIDVerificationTask
)

User = get_user_model()

class Command(BaseCommand):
    help = "Loads dummy data for all tables (UnionParishads, Users, Complaints, Attachments, Logs, and Tasks) into the DB."

    def handle(self, *args, **options):
        # Locate the JSON file containing the dummy data
        json_file_path = os.path.join(
            settings.BASE_DIR, "apps", "complaints", "data", "dummy_all_data.json"
        )

        if not os.path.exists(json_file_path):
            self.stdout.write(
                self.style.ERROR(f"Data file not found at: {json_file_path}")
            )
            return

        with open(json_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Load Union Parishads
        up_map = {}  # union_name -> UnionParishad object
        self.stdout.write("--- Loading Union Parishads ---")
        for up_data in data.get("union_parishads", []):
            union_name = up_data["union_name"]
            up_obj, created = UnionParishad.objects.update_or_create(
                district=up_data["district"],
                upazila=up_data["upazila"],
                union_name=union_name,
                defaults={
                    "name": up_data["name"],
                    "chairman_name": up_data.get("chairman_name", ""),
                    "contact_phone": up_data.get("contact_phone", ""),
                    "contact_email": up_data.get("contact_email", ""),
                    "address": up_data.get("address", ""),
                    "is_active": True,
                }
            )
            up_map[union_name] = up_obj
            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"[{status_str}] UP: {up_obj.name}"))

        # 2. Load Users
        user_map = {}  # username -> User object
        self.stdout.write("\n--- Loading Users ---")
        for user_data in data.get("users", []):
            username = user_data["username"]
            email = user_data["email"]
            password = user_data["password"]
            
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.filter(email=email).first()

            if user:
                user.username = username
                user.email = email
                user.first_name = user_data.get("first_name", "")
                user.last_name = user_data.get("last_name", "")
                user.phone_number = user_data.get("phone_number", "")
                user.nid_number = user_data.get("nid_number", None)
                user.nid_name = user_data.get("nid_name", "")
                user.nid_address = user_data.get("nid_address", "")
                user.nid_verified = user_data.get("nid_verified", False)
                user.is_up_member = user_data.get("is_up_member", False)
                user.is_chairman = user_data.get("is_chairman", False)
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"[Updated] User: {username}"))
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=user_data.get("first_name", ""),
                    last_name=user_data.get("last_name", ""),
                    phone_number=user_data.get("phone_number", ""),
                    nid_number=user_data.get("nid_number", None),
                    nid_name=user_data.get("nid_name", ""),
                    nid_address=user_data.get("nid_address", ""),
                    nid_verified=user_data.get("nid_verified", False),
                    is_up_member=user_data.get("is_up_member", False),
                    is_chairman=user_data.get("is_chairman", False),
                )
                self.stdout.write(self.style.SUCCESS(f"[Created] User: {username}"))
            
            user_map[username] = user

        # 3. Load Complaints
        complaint_map = {}  # ref_id -> Complaint object
        self.stdout.write("\n--- Loading Complaints ---")
        for comp_data in data.get("complaints", []):
            ref_id = comp_data["ref_id"]
            union_name = comp_data["union_name"]
            complainant_username = comp_data.get("complainant_username")
            
            up_obj = up_map.get(union_name)
            if not up_obj:
                self.stdout.write(self.style.ERROR(f"UnionParishad '{union_name}' not found for complaint '{ref_id}'"))
                continue

            complainant = user_map.get(complainant_username) if complainant_username else None

            # Look for existing complaint by subject & complainant to avoid duplicate spam on re-runs
            complaint = Complaint.objects.filter(
                subject=comp_data["subject"],
                complainant=complainant,
                union_parishad=up_obj
            ).first()

            if complaint:
                complaint.body = comp_data["body"]
                complaint.status = comp_data["status"]
                complaint.priority = comp_data["priority"]
                complaint.is_anonymous = comp_data.get("is_anonymous", True)
                complaint.nid_verification_status = comp_data.get("nid_verification_status", "PENDING")
                complaint.admin_notes = comp_data.get("admin_notes", "")
                complaint.save()
                self.stdout.write(self.style.SUCCESS(f"[Updated] Complaint: {comp_data['subject']}"))
            else:
                complaint = Complaint.objects.create(
                    union_parishad=up_obj,
                    complainant=complainant,
                    is_anonymous=comp_data.get("is_anonymous", True),
                    subject=comp_data["subject"],
                    body=comp_data["body"],
                    status=comp_data["status"],
                    priority=comp_data["priority"],
                    nid_verification_status=comp_data.get("nid_verification_status", "PENDING"),
                    admin_notes=comp_data.get("admin_notes", ""),
                )
                self.stdout.write(self.style.SUCCESS(f"[Created] Complaint: {comp_data['subject']}"))
            
            complaint_map[ref_id] = complaint

        # 4. Load Attachments
        self.stdout.write("\n--- Loading Complaint Attachments ---")
        for attach_data in data.get("attachments", []):
            comp_ref = attach_data["complaint_ref_id"]
            comp_obj = complaint_map.get(comp_ref)
            if not comp_obj:
                self.stdout.write(self.style.ERROR(f"Complaint '{comp_ref}' not found for attachment"))
                continue

            attach_obj, created = ComplaintAttachment.objects.update_or_create(
                complaint=comp_obj,
                file_name=attach_data["file_name"],
                defaults={
                    "file_url": attach_data["file_url"],
                    "object_key": attach_data["object_key"],
                    "file_type": attach_data["file_type"],
                    "file_size": attach_data.get("file_size", 0),
                }
            )
            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"[{status_str}] Attachment: {attach_obj.file_name} for Complaint '{comp_obj.subject}'"))

        # 5. Load Status Logs
        self.stdout.write("\n--- Loading Complaint Status Logs ---")
        for log_data in data.get("status_logs", []):
            comp_ref = log_data["complaint_ref_id"]
            comp_obj = complaint_map.get(comp_ref)
            if not comp_obj:
                self.stdout.write(self.style.ERROR(f"Complaint '{comp_ref}' not found for status log"))
                continue

            changed_by = user_map.get(log_data.get("changed_by_username"))

            # Log entries are typically historical/append-only, but let's avoid duplicates based on content
            log_exists = ComplaintStatusLog.objects.filter(
                complaint=comp_obj,
                old_status=log_data["old_status"],
                new_status=log_data["new_status"],
                notes=log_data.get("notes", "")
            ).exists()

            if not log_exists:
                log_obj = ComplaintStatusLog.objects.create(
                    complaint=comp_obj,
                    old_status=log_data["old_status"],
                    new_status=log_data["new_status"],
                    changed_by=changed_by,
                    notes=log_data.get("notes", "")
                )
                self.stdout.write(self.style.SUCCESS(f"[Created] Log: {log_obj.old_status} -> {log_obj.new_status}"))
            else:
                self.stdout.write(f"[Skipped Duplicate] Log: {log_data['old_status']} -> {log_data['new_status']}")

        # 6. Load NID Tasks
        self.stdout.write("\n--- Loading NID Verification Tasks ---")
        for task_data in data.get("nid_tasks", []):
            comp_ref = task_data["complaint_ref_id"]
            comp_obj = complaint_map.get(comp_ref)
            if not comp_obj:
                self.stdout.write(self.style.ERROR(f"Complaint '{comp_ref}' not found for NID verification task"))
                continue

            task_obj, created = NIDVerificationTask.objects.update_or_create(
                complaint=comp_obj,
                defaults={
                    "celery_task_id": task_data.get("celery_task_id", ""),
                    "nid_image_url": task_data["nid_image_url"],
                    "nid_image_object_key": task_data.get("nid_image_object_key", ""),
                    "status": task_data["status"],
                    "extracted_name": task_data.get("extracted_name", ""),
                    "extracted_address": task_data.get("extracted_address", ""),
                    "extracted_nid_number": task_data.get("extracted_nid_number", ""),
                    "jurisdiction_match": task_data.get("jurisdiction_match", None),
                    "created_user": comp_obj.complainant
                }
            )
            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"[{status_str}] NID Task for Complaint: '{comp_obj.subject}'"))

        self.stdout.write(self.style.SUCCESS("\nAll table data loaded successfully!"))
