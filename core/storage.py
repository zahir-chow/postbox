"""
S3-compatible presigned URL generator for Smart Union Postbox.

Generates presigned PUT URLs so the frontend can upload files directly
to S3/MinIO, completely bypassing the Django server for I/O. This is
critical for high-concurrency scenarios where streaming large files
through DRF would choke the ASGI worker pool.

Flow:
    1. Client requests a presigned URL from the DRF endpoint.
    2. This module generates a time-limited PUT URL via boto3.
    3. Client uploads the file directly to S3 using the presigned URL.
    4. Client sends the final S3 object key back to DRF for persistence.
"""

import logging
import uuid
from pathlib import PurePosixPath

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


class S3PresignedURLGenerator:
    """
    Thread-safe presigned URL generator using boto3.

    The S3 client is initialized once and reused across requests.
    boto3 clients are thread-safe for read operations (signing).
    """

    def __init__(self):
        client_kwargs = {
            "service_name": "s3",
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
            "region_name": settings.AWS_S3_REGION_NAME,
            "config": Config(signature_version="s3v4"),
        }
        # Support custom endpoint for MinIO / DigitalOcean Spaces
        if settings.AWS_S3_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL

        self._client = boto3.client(**client_kwargs)
        self._bucket = settings.AWS_S3_BUCKET_NAME
        self._expiry = settings.AWS_S3_PRESIGNED_URL_EXPIRY

    def generate_upload_url(
        self,
        file_name: str,
        content_type: str,
        folder: str = "attachments",
    ) -> dict:
        """
        Generate a presigned PUT URL for direct client-to-S3 upload.

        Args:
            file_name: Original filename (sanitized).
            content_type: MIME type (e.g., 'image/jpeg').
            folder: S3 key prefix (e.g., 'attachments', 'nid-photos').

        Returns:
            dict with 'upload_url' (presigned PUT URL) and 'object_key'
            (the S3 key where the file will be stored).

        Raises:
            ClientError: If S3 is unreachable or credentials are invalid.
        """
        # Generate a unique key to prevent overwrites
        safe_name = PurePosixPath(file_name).name  # Strip path traversal
        unique_key = f"{folder}/{uuid.uuid4().hex}_{safe_name}"

        try:
            upload_url = self._client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": unique_key,
                    "ContentType": content_type,
                },
                ExpiresIn=self._expiry,
            )
        except ClientError:
            logger.exception("Failed to generate presigned upload URL")
            raise

        logger.info("Generated presigned URL for key: %s", unique_key)

        return {
            "upload_url": upload_url,
            "object_key": unique_key,
            "expires_in": self._expiry,
        }

    def generate_download_url(self, object_key: str) -> str:
        """
        Generate a presigned GET URL for downloading a private object.

        Args:
            object_key: The S3 key of the object.

        Returns:
            A time-limited GET URL for the object.
        """
        try:
            download_url = self._client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": object_key,
                },
                ExpiresIn=self._expiry,
            )
        except ClientError:
            logger.exception("Failed to generate presigned download URL")
            raise

        return download_url

    def get_object_url(self, object_key: str) -> str:
        """
        Return the permanent (non-presigned) URL for a public object.

        For private buckets, use ``generate_download_url`` instead.
        """
        if settings.AWS_S3_ENDPOINT_URL:
            return f"{settings.AWS_S3_ENDPOINT_URL}/{self._bucket}/{object_key}"
        return f"https://{self._bucket}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{object_key}"


# Module-level singleton — lazy initialization
_generator = None


def get_s3_generator() -> S3PresignedURLGenerator:
    """Return the module-level S3 generator singleton."""
    global _generator
    if _generator is None:
        _generator = S3PresignedURLGenerator()
    return _generator
