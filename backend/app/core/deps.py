from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .security import decode_access_token
from ..db import get_db
from ..models import Student, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str | None = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None or payload.get("role") != "teacher":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user = await db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher privileges required")
    return current_user


async def get_current_student(
    authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)
) -> Student:
    """Students authenticate with a lightweight token issued by /api/auth/student-login."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None or payload.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    student = await db.get(Student, int(payload["sub"]))
    if student is None or student.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found")
    return student
