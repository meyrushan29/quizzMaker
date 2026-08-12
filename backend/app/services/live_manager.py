from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class Connection:
    websocket: WebSocket
    role: str  # "teacher" | "student"
    student_id: int | None = None


class LiveManager:
    """In-memory registry of WebSocket connections per quiz_code room.

    Business logic (join, start, submit, scoring) lives entirely in the REST
    handlers, which mutate the database and then call `broadcast` here. The
    socket itself is push-only from the server's point of view, so a student
    reconnecting after a dropped connection simply re-opens the socket and
    re-fetches current state over REST - no state lives only in memory.
    """

    def __init__(self) -> None:
        self._rooms: dict[str, list[Connection]] = {}

    async def connect(self, quiz_code: str, websocket: WebSocket, role: str, student_id: int | None = None) -> Connection:
        await websocket.accept()
        conn = Connection(websocket=websocket, role=role, student_id=student_id)
        self._rooms.setdefault(quiz_code, []).append(conn)
        return conn

    def disconnect(self, quiz_code: str, conn: Connection) -> None:
        connections = self._rooms.get(quiz_code)
        if not connections:
            return
        if conn in connections:
            connections.remove(conn)
        if not connections:
            self._rooms.pop(quiz_code, None)

    def room_size(self, quiz_code: str, role: str | None = None) -> int:
        connections = self._rooms.get(quiz_code, [])
        if role is None:
            return len(connections)
        return sum(1 for c in connections if c.role == role)

    async def broadcast(self, quiz_code: str, message: dict) -> None:
        connections = list(self._rooms.get(quiz_code, []))
        dead: list[Connection] = []
        for conn in connections:
            try:
                await conn.websocket.send_json(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(quiz_code, conn)


live_manager = LiveManager()
