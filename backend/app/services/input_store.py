from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Dict, Optional
from uuid import uuid4

from app.models.schemas import ArchitectureDraft


@dataclass
class DraftSession:
    id: str
    created_at: datetime
    updated_at: datetime
    draft: ArchitectureDraft


class DraftSessionStore:
    """
    Simple in-memory temporary storage for the input workflow.
    This is intentionally ephemeral (dev-friendly, no DB dependency).
    """

    def __init__(self, ttl_minutes: int = 60):
        self._ttl = timedelta(minutes=ttl_minutes)
        self._lock = RLock()
        self._sessions: Dict[str, DraftSession] = {}

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _is_expired(self, s: DraftSession) -> bool:
        return self._now() - s.updated_at > self._ttl

    def _gc(self) -> None:
        expired = [sid for sid, s in self._sessions.items() if self._is_expired(s)]
        for sid in expired:
            self._sessions.pop(sid, None)

    def create(self, draft: Optional[ArchitectureDraft] = None) -> DraftSession:
        with self._lock:
            self._gc()
            sid = str(uuid4())
            now = self._now()
            s = DraftSession(
                id=sid,
                created_at=now,
                updated_at=now,
                draft=draft or ArchitectureDraft(),
            )
            self._sessions[sid] = s
            return s

    def get(self, session_id: str) -> Optional[DraftSession]:
        with self._lock:
            self._gc()
            s = self._sessions.get(session_id)
            if not s:
                return None
            if self._is_expired(s):
                self._sessions.pop(session_id, None)
                return None
            return s

    def upsert(self, session_id: str, draft: ArchitectureDraft) -> Optional[DraftSession]:
        with self._lock:
            self._gc()
            now = self._now()
            existing = self._sessions.get(session_id)
            if not existing:
                return None
            if self._is_expired(existing):
                self._sessions.pop(session_id, None)
                return None
            existing.draft = draft
            existing.updated_at = now
            return existing


store = DraftSessionStore(ttl_minutes=60)

