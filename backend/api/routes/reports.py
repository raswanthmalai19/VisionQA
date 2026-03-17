from fastapi import APIRouter, Depends, HTTPException, status

from backend.models.report import ReportResponse
from backend.services import firestore
from backend.api.deps import get_current_user

router = APIRouter()


@router.get("/{session_id}", response_model=ReportResponse)
async def get_report(session_id: str, user: dict = Depends(get_current_user)):
    session = await firestore.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    report = await firestore.get_report(session_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not yet generated")

    return ReportResponse(**report)
