"""
Celery tasks for the complaints app — NID OCR Pipeline.

This module contains the core async NID verification pipeline that:
1. Downloads the NID image from S3
2. Runs OCR extraction (pytesseract — pluggable)
3. Parses Name, Address, NID Number from the OCR output
4. Checks jurisdiction match against the complaint's Union Parishad
5. If verified:
   a. Creates a User account (atomic, select_for_update to prevent races)
   b. Generates secure credentials
   c. Links the complaint to the new user
6. Updates NIDVerificationTask status
7. Notifies admin via Django Channels WebSocket

Design decisions:
    * ``select_for_update()`` on NID number uniqueness check prevents
      duplicate account creation under concurrent Celery workers.
    * ``transaction.atomic()`` wraps the entire account creation + complaint
      linking to ensure all-or-nothing semantics.
    * Retry with exponential backoff on transient failures (S3 timeout,
      OCR service down).
    * The OCR extraction function ``_extract_nid_data()`` is designed as
      a pluggable method — swap pytesseract for Google Vision, AWS Textract,
      or a custom ML model by changing just that function.
"""

import io
import logging
import re
import tempfile
from pathlib import Path

import boto3
from botocore.config import Config
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from core.utils import generate_secure_password, generate_username_from_nid

logger = logging.getLogger(__name__)

User = get_user_model()


def _get_s3_client():
    """Create a boto3 S3 client for downloading NID images."""
    client_kwargs = {
        "service_name": "s3",
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        "region_name": settings.AWS_S3_REGION_NAME,
        "config": Config(signature_version="s3v4"),
    }
    if settings.AWS_S3_ENDPOINT_URL:
        client_kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL
    return boto3.client(**client_kwargs)


def _download_image_from_s3(object_key: str) -> bytes:
    """
    Download an image from S3 and return the raw bytes.

    Raises:
        botocore.exceptions.ClientError: If the download fails.
    """
    client = _get_s3_client()
    response = client.get_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=object_key,
    )
    return response["Body"].read()


def _extract_nid_data(image_bytes: bytes) -> dict:
    """
    Extract structured data from a Bangladesh NID card image using OCR.

    This is the pluggable OCR function. Currently uses pytesseract
    (Tesseract OCR). Replace this function body to use:
    - Google Cloud Vision API
    - AWS Textract
    - A custom fine-tuned ML model

    Args:
        image_bytes: Raw image bytes of the NID card.

    Returns:
        dict with keys: 'name', 'address', 'nid_number'
        Values may be empty strings if extraction fails.
    """
    try:
        import pytesseract
        from PIL import Image

        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))

        # Run OCR with Bengali + English language packs
        # Requires: tesseract-ocr-ben language data installed
        ocr_text = pytesseract.image_to_string(image, lang="ben+eng")

        logger.info("OCR raw output (first 500 chars): %s", ocr_text[:500])

        # Parse the OCR output for NID fields
        return _parse_nid_text(ocr_text)

    except ImportError:
        logger.warning(
            "pytesseract not available. Using placeholder extraction. "
            "Install pytesseract and Tesseract OCR for production use."
        )
        return {
            "name": "",
            "address": "",
            "nid_number": "",
        }
    except Exception:
        logger.exception("OCR extraction failed")
        return {
            "name": "",
            "address": "",
            "nid_number": "",
        }


def _parse_nid_text(ocr_text: str) -> dict:
    """
    Parse structured fields from raw NID OCR text.

    Bangladesh NID cards typically contain:
    - Name / নাম
    - Address / ঠিকানা (sometimes split: পিতা/মাতা, ঠিকানা)
    - NID Number (10 or 17 digits)
    - Date of Birth / জন্ম তারিখ

    This parser uses regex patterns to extract these fields.
    For production accuracy, consider a trained NER model.
    """
    result = {
        "name": "",
        "address": "",
        "nid_number": "",
    }

    lines = ocr_text.strip().split("\n")
    lines = [line.strip() for line in lines if line.strip()]

    # ── Extract NID Number (10 or 17 consecutive digits) ─────────────
    nid_pattern = re.compile(r"\b(\d{10}|\d{17})\b")
    for line in lines:
        match = nid_pattern.search(line)
        if match:
            result["nid_number"] = match.group(1)
            break

    # ── Extract Name (look for নাম / Name label) ────────────────────
    name_pattern = re.compile(r"(?:নাম|Name)\s*[:\-]?\s*(.+)", re.IGNORECASE)
    for line in lines:
        match = name_pattern.search(line)
        if match:
            result["name"] = match.group(1).strip()
            break

    # ── Extract Address (look for ঠিকানা / Address label) ───────────
    address_pattern = re.compile(r"(?:ঠিকানা|Address)\s*[:\-]?\s*(.+)", re.IGNORECASE)
    collecting_address = False
    address_lines = []

    for line in lines:
        if collecting_address:
            # Stop collecting if we hit another labeled field
            if re.match(r"(?:নাম|Name|জন্ম|Date|ID\s*No)", line, re.IGNORECASE):
                break
            address_lines.append(line)
        else:
            match = address_pattern.search(line)
            if match:
                address_lines.append(match.group(1).strip())
                collecting_address = True

    result["address"] = " ".join(address_lines).strip()

    return result


def _check_jurisdiction(extracted_address: str, union_parishad) -> bool:
    """
    Check if the extracted NID address falls within the Union Parishad's
    jurisdiction.

    Uses substring matching on district and upazila names. This is a
    basic implementation — for production, consider:
    - Fuzzy string matching (fuzzywuzzy / rapidfuzz)
    - Geocoding API
    - Structured address parsing

    Args:
        extracted_address: Address string from OCR.
        union_parishad: UnionParishad model instance.

    Returns:
        True if the address appears to match the UP's jurisdiction.
    """
    if not extracted_address:
        return False

    address_lower = extracted_address.lower()

    # Check if district or upazila name appears in the address
    # Support both Bengali and English names
    district_match = (
        union_parishad.district.lower() in address_lower
        or union_parishad.district in extracted_address  # Bengali exact match
    )
    upazila_match = (
        union_parishad.upazila.lower() in address_lower
        or union_parishad.upazila in extracted_address  # Bengali exact match
    )

    # Require at least district match; upazila is bonus
    return district_match


@shared_task(
    bind=True,
    name="complaints.process_nid_verification",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_nid_verification(self, verification_task_id: str):
    """
    Async NID OCR verification pipeline.

    This is the core Celery task that processes NID card images
    submitted with complaints. It runs entirely in the background,
    allowing the DRF view to return 202 Accepted immediately.

    Pipeline steps:
        1. Load the NIDVerificationTask record
        2. Download NID image from S3
        3. Run OCR extraction
        4. Parse Name, Address, NID Number
        5. Check jurisdiction match against UnionParishad
        6. If verified:
           a. Create User account (atomic, with select_for_update)
           b. Generate secure credentials
           c. Link complaint to the new user
        7. Update task status
        8. Notify admin dashboard via WebSocket

    Args:
        verification_task_id: UUID of the NIDVerificationTask record.
    """
    from apps.complaints.models import NIDVerificationTask, NIDVerificationStatus
    from apps.notifications.utils import notify_admin_new_verification

    logger.info("Starting NID verification for task: %s", verification_task_id)

    try:
        task = NIDVerificationTask.objects.select_related(
            "complaint", "complaint__union_parishad"
        ).get(id=verification_task_id)
    except NIDVerificationTask.DoesNotExist:
        logger.error("NIDVerificationTask %s not found.", verification_task_id)
        return {"status": "error", "detail": "Task not found"}

    # ── Step 1: Mark as PROCESSING ───────────────────────────────────
    task.status = NIDVerificationStatus.PROCESSING
    task.celery_task_id = self.request.id or ""
    task.save(update_fields=["status", "celery_task_id", "updated_at"])

    complaint = task.complaint
    complaint.nid_verification_status = NIDVerificationStatus.PROCESSING
    complaint.save(update_fields=["nid_verification_status", "updated_at"])

    try:
        # ── Step 2: Download NID image from S3 ───────────────────────
        logger.info("Downloading NID image: %s", task.nid_image_object_key)
        image_bytes = _download_image_from_s3(task.nid_image_object_key)
        logger.info("Downloaded %d bytes", len(image_bytes))

        # ── Step 3: Run OCR extraction ───────────────────────────────
        extracted = _extract_nid_data(image_bytes)
        logger.info("OCR extracted: %s", {k: v[:50] for k, v in extracted.items()})

        task.extracted_name = extracted.get("name", "")
        task.extracted_address = extracted.get("address", "")
        task.extracted_nid_number = extracted.get("nid_number", "")

        # Validate minimum extraction quality
        if not task.extracted_nid_number:
            _mark_failed(task, complaint, "Could not extract NID number from image.")
            return {"status": "failed", "detail": "NID number not found"}

        # ── Step 4: Check jurisdiction ───────────────────────────────
        up = complaint.union_parishad
        jurisdiction_match = _check_jurisdiction(task.extracted_address, up)
        task.jurisdiction_match = jurisdiction_match

        if not jurisdiction_match:
            logger.warning(
                "Jurisdiction mismatch: extracted=%s, UP=%s/%s",
                task.extracted_address[:100],
                up.district,
                up.upazila,
            )
            # Still mark as verified but flag the mismatch
            # The admin can review and override

        # ── Step 5: Create user account (atomic) ─────────────────────
        user = _create_verified_user(task, complaint)

        # ── Step 6: Mark as VERIFIED ─────────────────────────────────
        task.status = NIDVerificationStatus.VERIFIED
        task.created_user = user
        task.save(update_fields=[
            "status",
            "extracted_name",
            "extracted_address",
            "extracted_nid_number",
            "jurisdiction_match",
            "created_user",
            "updated_at",
        ])

        complaint.nid_verification_status = NIDVerificationStatus.VERIFIED
        complaint.is_anonymous = False
        complaint.complainant = user
        complaint.save(update_fields=[
            "nid_verification_status",
            "is_anonymous",
            "complainant",
            "updated_at",
        ])

        logger.info(
            "NID verification complete. User created: %s (task: %s)",
            user.username,
            verification_task_id,
        )

        # ── Step 7: Notify admin ─────────────────────────────────────
        try:
            notify_admin_new_verification(task)
        except Exception:
            logger.exception("Failed to send admin notification (non-critical)")

        return {
            "status": "verified",
            "user_id": str(user.id),
            "username": user.username,
        }

    except self.MaxRetriesExceededError:
        _mark_failed(task, complaint, "Max retries exceeded.")
        raise

    except Exception as exc:
        logger.exception("NID verification failed for task: %s", verification_task_id)
        _mark_failed(task, complaint, str(exc))

        # Retry on transient errors (S3 timeout, network issues)
        try:
            self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        except self.MaxRetriesExceededError:
            return {"status": "failed", "detail": str(exc)}


def _create_verified_user(task, complaint):
    """
    Create a verified user account from NID data.

    Uses ``select_for_update()`` on NID number to prevent duplicate
    account creation under concurrent Celery workers processing the
    same NID number simultaneously.
    """
    with transaction.atomic():
        # Check for existing user with this NID number (with row lock)
        existing = (
            User.objects.select_for_update()
            .filter(nid_number=task.extracted_nid_number)
            .first()
        )

        if existing:
            logger.info(
                "User with NID %s already exists: %s",
                task.extracted_nid_number,
                existing.username,
            )
            return existing

        # Generate credentials
        password = generate_secure_password(length=12)
        username = generate_username_from_nid(
            task.extracted_name, task.extracted_nid_number
        )

        # Ensure username uniqueness
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        # Generate a placeholder email from NID number
        email = f"{username}@postbox.local"

        try:
            user = User.objects.create_nid_verified_user(
                username=username,
                email=email,
                password=password,
                nid_number=task.extracted_nid_number,
                nid_name=task.extracted_name,
                nid_address=task.extracted_address,
                nid_image_url=task.nid_image_url,
            )
            logger.info("Created NID-verified user: %s", username)
            return user

        except IntegrityError:
            logger.warning(
                "IntegrityError creating user for NID %s. Fetching existing.",
                task.extracted_nid_number,
            )
            # Race condition: another worker created the user between our
            # select_for_update and insert. Fetch the existing one.
            return User.objects.get(nid_number=task.extracted_nid_number)


def _mark_failed(task, complaint, error_message: str):
    """Mark a verification task and its complaint as FAILED."""
    from apps.complaints.models import NIDVerificationStatus

    task.status = NIDVerificationStatus.FAILED
    task.error_message = error_message
    task.save(update_fields=["status", "error_message", "updated_at"])

    complaint.nid_verification_status = NIDVerificationStatus.FAILED
    complaint.save(update_fields=["nid_verification_status", "updated_at"])

    logger.error("NID verification failed: %s (task: %s)", error_message, task.id)
