from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FailureDetail(BaseModel):
    test_id: str
    test_name: str
    page: str
    issue: str
    screenshot_url: Optional[str] = None


class ReportAnalysis(BaseModel):
    executive_summary: str = ""
    risk_assessment: str = "medium"
    recommendations: list[str] = []
    priority_fixes: list[str] = []


class ReportResponse(BaseModel):
    session_id: str
    total_tests: int
    passed: int
    failed: int
    failures: list[FailureDetail] = []
    analysis: Optional[ReportAnalysis] = None
    created_at: datetime


class ReportInDB(BaseModel):
    session_id: str
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    failures: list[FailureDetail] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
