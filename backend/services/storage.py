"""Cloud Storage service with local filesystem fallback for development."""

import os
from pathlib import Path

from backend.config import settings

_LOCAL_STORAGE_DIR = Path(__file__).parent.parent / "local_storage"


def _is_local() -> bool:
    return settings.local_mode


# ── GCS Client (production mode) ──────────────────────────────────

_client = None


def get_storage_client():
    global _client
    if _client is None:
        from google.cloud import storage as gcs
        _client = gcs.Client(project=settings.gcp_project_id)
    return _client


# ── Upload ─────────────────────────────────────────────────────────

async def upload_blob(blob_path: str, data: bytes, content_type: str = "image/png") -> str:
    if _is_local():
        local_path = _LOCAL_STORAGE_DIR / blob_path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        return str(local_path)
    client = get_storage_client()
    bucket = client.bucket(settings.gcs_bucket)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(data, content_type=content_type)
    return f"gs://{settings.gcs_bucket}/{blob_path}"


# ── Signed URLs ────────────────────────────────────────────────────

def generate_signed_upload_url(blob_path: str, content_type: str = "image/png", expiry_minutes: int = 15) -> str:
    if _is_local():
        local_path = _LOCAL_STORAGE_DIR / blob_path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        return str(local_path)
    client = get_storage_client()
    bucket = client.bucket(settings.gcs_bucket)
    blob = bucket.blob(blob_path)
    from datetime import timedelta
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiry_minutes),
        method="PUT",
        content_type=content_type,
    )
    return url


def generate_signed_download_url(blob_path: str, expiry_minutes: int = 60) -> str:
    if _is_local():
        local_path = _LOCAL_STORAGE_DIR / blob_path
        return str(local_path)
    client = get_storage_client()
    bucket = client.bucket(settings.gcs_bucket)
    blob = bucket.blob(blob_path)
    from datetime import timedelta
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiry_minutes),
        method="GET",
    )
    return url
