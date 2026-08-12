from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from ..core.security import decode_access_token
from ..db import AsyncSessionLocal
from ..models import Student, User
from ..services.live_manager import live_manager

router = APIRouter()


@router.websocket("/ws/live/{quiz_code}")
async def live_quiz_socket(websocket: WebSocket, quiz_code: str, role: str, token: str):
    payload = decode_access_token(token)
    if payload is None or payload.get("role") != role:
        await websocket.close(code=4401)
        return

    quiz_code = quiz_code.strip().upper()
    student_id: int | None = None

    async with AsyncSessionLocal() as db:
        if role == "teacher":
            user = await db.get(User, int(payload["sub"]))
            if user is None or user.role != "teacher":
                await websocket.close(code=4401)
                return
        elif role == "student":
            result = await db.execute(select(Student).where(Student.id == int(payload["sub"])))
            student = result.scalars().first()
            if student is None:
                await websocket.close(code=4401)
                return
            student_id = student.id
        else:
            await websocket.close(code=4400)
            return

    conn = await live_manager.connect(quiz_code, websocket, role, student_id)
    try:
        while True:
            # Connections are push-only from the server; we still read to detect
            # disconnects promptly and to allow simple client-side ping frames.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        live_manager.disconnect(quiz_code, conn)
