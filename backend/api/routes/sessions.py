from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from backend.models.session import SessionCreate, SessionResponse
from backend.services import firestore
from backend.api.deps import get_current_user

import asyncio
import json

router = APIRouter()


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate):
    user = {"user_id": "test-mock-user-id"}
    session = await firestore.create_session(
        user_id=user["user_id"],
        url=body.url,
        prompt=body.prompt,
    )

    # Auto-start execution synchronously for debugging
    from backend.agents.orchestrator import run_orchestrator
    await firestore.update_session(session["session_id"], status="crawling")
    try:
        await run_orchestrator(session["session_id"])
    except Exception as e:
        import traceback
        with open("/tmp/visionqa_err.txt", "w") as f:
            f.write(traceback.format_exc())
        return SessionResponse(**session)

    return SessionResponse(**session)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(user: dict = Depends(get_current_user)):
    sessions = await firestore.list_sessions(user["user_id"])
    return [SessionResponse(**s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    session = await firestore.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    return SessionResponse(**session)


@router.get("/{session_id}/testcases")
async def get_testcases(session_id: str, user: dict = Depends(get_current_user)):
    session = await firestore.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    testcases = await firestore.get_testcases(session_id)
    return testcases


@router.get("/{session_id}/stream")
async def stream_session_status(session_id: str, user: dict = Depends(get_current_user)):
    """SSE endpoint — streams session status updates in real time."""
    session = await firestore.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    async def event_stream():
        last_status = None
        last_tc_hash = None
        terminal_states = {"completed", "failed"}
        while True:
            s = await firestore.get_session(session_id)
            if not s:
                break
            current_status = s.get("status", "unknown")

            # Also check testcase updates during execution
            tc = []
            tc_hash = None
            if current_status in ("generating", "executing", "reporting", "completed"):
                tc = await firestore.get_testcases(session_id)
                tc_hash = str([(t.get("test_id"), t.get("status")) for t in tc])

            status_changed = current_status != last_status
            tc_changed = tc_hash and tc_hash != last_tc_hash

            if status_changed or tc_changed:
                data = {
                    "status": current_status,
                    "site_structure": s.get("site_structure"),
                }
                if tc:
                    data["testcases"] = tc
                if current_status == "completed":
                    report = await firestore.get_report(session_id)
                    data["report"] = report

                yield f"data: {json.dumps(data, default=str)}\n\n"
                last_status = current_status
                last_tc_hash = tc_hash

            if current_status in terminal_states:
                break

            await asyncio.sleep(1.5)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/{session_id}/execute")
async def execute_session(session_id: str, user: dict = Depends(get_current_user)):
    session = await firestore.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    if session["status"] not in ("created", "completed", "failed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is currently {session['status']}",
        )

    await firestore.update_session(session_id, status="crawling")

    # Agent orchestration is triggered asynchronously
    from backend.agents.orchestrator import run_orchestrator
    asyncio.create_task(run_orchestrator(session_id))

    return {"message": "Execution started", "session_id": session_id}
