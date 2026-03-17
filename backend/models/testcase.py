from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TestStep(BaseModel):
    action: str  # "goto", "click", "fill", "screenshot", "assert_visible"
    target: Optional[str] = None
    value: Optional[str] = None


class TestCaseCreate(BaseModel):
    session_id: str
    name: str
    steps: list[TestStep]
    expected_result: str


class TestCaseResponse(BaseModel):
    test_id: str
    session_id: str
    name: str
    steps: list[TestStep]
    expected_result: str
    status: str
    error: Optional[str] = None
    screenshots: list[str] = []


class TestCaseInDB(BaseModel):
    test_id: str
    session_id: str
    name: str
    steps: list[TestStep]
    expected_result: str
    status: str = "pending"
    error: Optional[str] = None
    screenshots: list[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
