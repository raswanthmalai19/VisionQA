"""Firestore service with in-memory local fallback for development."""

import uuid
from datetime import datetime
from typing import Optional

from backend.config import settings

# ── In-Memory Local Store ──────────────────────────────────────────
# Used when local_mode=True (no GCP project required)

_local_users: dict[str, dict] = {}
_local_sessions: dict[str, dict] = {}
_local_testcases: dict[str, dict[str, dict]] = {}  # session_id -> {test_id -> data}
_local_reports: dict[str, dict] = {}  # session_id -> report


def _is_local() -> bool:
    return settings.local_mode


# ── Firestore Client (GCP mode only) ──────────────────────────────

_db = None


def get_db():
    global _db
    if _db is None:
        from google.cloud import firestore
        _db = firestore.AsyncClient(
            project=settings.gcp_project_id,
            database=settings.firestore_database,
        )
    return _db


# ── Users ──────────────────────────────────────────────────────────

async def create_user(email: str, password_hash: str, api_key: str) -> dict:
    user_id = str(uuid.uuid4())
    data = {
        "user_id": user_id,
        "email": email,
        "password_hash": password_hash,
        "api_key": api_key,
        "created_at": datetime.utcnow(),
    }
    if _is_local():
        _local_users[user_id] = data
    else:
        db = get_db()
        await db.collection("users").document(user_id).set(data)
    return data


async def get_user_by_email(email: str) -> Optional[dict]:
    if _is_local():
        for u in _local_users.values():
            if u["email"] == email:
                return u
        return None
    db = get_db()
    query = db.collection("users").where("email", "==", email).limit(1)
    docs = []
    async for doc in query.stream():
        docs.append(doc.to_dict())
    return docs[0] if docs else None


async def get_user_by_api_key(api_key: str) -> Optional[dict]:
    if _is_local():
        for u in _local_users.values():
            if u["api_key"] == api_key:
                return u
        return None
    db = get_db()
    query = db.collection("users").where("api_key", "==", api_key).limit(1)
    docs = []
    async for doc in query.stream():
        docs.append(doc.to_dict())
    return docs[0] if docs else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    if _is_local():
        return _local_users.get(user_id)
    db = get_db()
    doc = await db.collection("users").document(user_id).get()
    return doc.to_dict() if doc.exists else None


# ── Sessions ───────────────────────────────────────────────────────

async def create_session(user_id: str, url: str, prompt: str) -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    data = {
        "session_id": session_id,
        "user_id": user_id,
        "url": url,
        "prompt": prompt,
        "status": "created",
        "site_structure": None,
        "created_at": now,
        "updated_at": now,
    }
    if _is_local():
        _local_sessions[session_id] = data
        _local_testcases[session_id] = {}
    else:
        db = get_db()
        await db.collection("sessions").document(session_id).set(data)
    return data


async def get_session(session_id: str) -> Optional[dict]:
    if _is_local():
        return _local_sessions.get(session_id)
    db = get_db()
    doc = await db.collection("sessions").document(session_id).get()
    return doc.to_dict() if doc.exists else None


async def list_sessions(user_id: str) -> list[dict]:
    if _is_local():
        sessions = [s for s in _local_sessions.values() if s["user_id"] == user_id]
        sessions.sort(key=lambda s: s.get("created_at", datetime.min), reverse=True)
        return sessions
    db = get_db()
    from google.cloud import firestore as fs
    query = (
        db.collection("sessions")
        .where("user_id", "==", user_id)
        .order_by("created_at", direction=fs.Query.DESCENDING)
    )
    sessions = []
    async for doc in query.stream():
        sessions.append(doc.to_dict())
    return sessions


async def update_session(session_id: str, **fields) -> None:
    fields["updated_at"] = datetime.utcnow()
    if _is_local():
        if session_id in _local_sessions:
            _local_sessions[session_id].update(fields)
    else:
        db = get_db()
        await db.collection("sessions").document(session_id).update(fields)


# ── Test Cases (subcollection under sessions) ─────────────────────

async def create_testcase(session_id: str, testcase_data: dict) -> dict:
    test_id = str(uuid.uuid4())
    data = {
        "test_id": test_id,
        "session_id": session_id,
        **testcase_data,
        "status": "pending",
        "error": None,
        "screenshots": [],
        "created_at": datetime.utcnow(),
    }
    if _is_local():
        if session_id not in _local_testcases:
            _local_testcases[session_id] = {}
        _local_testcases[session_id][test_id] = data
    else:
        db = get_db()
        await (
            db.collection("sessions")
            .document(session_id)
            .collection("testcases")
            .document(test_id)
            .set(data)
        )
    return data


async def get_testcases(session_id: str) -> list[dict]:
    if _is_local():
        return list(_local_testcases.get(session_id, {}).values())
    db = get_db()
    query = (
        db.collection("sessions")
        .document(session_id)
        .collection("testcases")
    )
    testcases = []
    async for doc in query.stream():
        testcases.append(doc.to_dict())
    return testcases


async def update_testcase(session_id: str, test_id: str, **fields) -> None:
    if _is_local():
        if session_id in _local_testcases and test_id in _local_testcases[session_id]:
            _local_testcases[session_id][test_id].update(fields)
    else:
        db = get_db()
        await (
            db.collection("sessions")
            .document(session_id)
            .collection("testcases")
            .document(test_id)
            .update(fields)
        )


# ── Reports (subcollection under sessions) ────────────────────────

async def create_report(session_id: str, report_data: dict) -> dict:
    data = {
        "session_id": session_id,
        **report_data,
        "created_at": datetime.utcnow(),
    }
    if _is_local():
        _local_reports[session_id] = data
    else:
        db = get_db()
        await (
            db.collection("sessions")
            .document(session_id)
            .collection("report")
            .document("latest")
            .set(data)
        )
    return data


async def get_report(session_id: str) -> Optional[dict]:
    if _is_local():
        return _local_reports.get(session_id)
    db = get_db()
    doc = await (
        db.collection("sessions")
        .document(session_id)
        .collection("report")
        .document("latest")
        .get()
    )
    return doc.to_dict() if doc.exists else None
