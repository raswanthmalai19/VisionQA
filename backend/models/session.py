from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    url: str
    prompt: str


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    url: str
    prompt: str
    status: str
    site_structure: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


class SessionInDB(BaseModel):
    session_id: str
    user_id: str
    url: str
    prompt: str
    status: str = "created"
    site_structure: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
