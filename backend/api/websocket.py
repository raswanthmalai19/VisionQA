import json
from typing import AsyncIterator

from fastapi import WebSocket, WebSocketDisconnect

from backend.services import firestore


class ConnectionManager:
    """Manages WebSocket connections from CLI runners."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}  # user_id -> websocket

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_task(self, user_id: str, task: dict) -> bool:
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_json(task)
            return True
        return False

    async def wait_for_result(self, user_id: str) -> dict | None:
        ws = self.active_connections.get(user_id)
        if ws:
            data = await ws.receive_json()
            return data
        return None

    def is_connected(self, user_id: str) -> bool:
        return user_id in self.active_connections


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    # Authenticate via API key in query params
    api_key = websocket.query_params.get("api_key")
    if not api_key:
        await websocket.close(code=4001, reason="Missing api_key")
        return

    user = await firestore.get_user_by_api_key(api_key)
    if not user:
        await websocket.close(code=4003, reason="Invalid api_key")
        return

    user_id = user["user_id"]
    await manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming results from CLI runner
            if data.get("type") == "result":
                session_id = data.get("session_id")
                test_id = data.get("test_id")
                if session_id and test_id:
                    await firestore.update_testcase(
                        session_id,
                        test_id,
                        status=data.get("status", "failed"),
                        error=data.get("error"),
                        screenshots=data.get("screenshots", []),
                    )
    except WebSocketDisconnect:
        manager.disconnect(user_id)
