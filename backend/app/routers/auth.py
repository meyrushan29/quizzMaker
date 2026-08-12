from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.rate_limit import login_rate_limiter, student_login_rate_limiter
from ..core.security import create_access_token, create_password_hash, verify_password
from ..db import get_db
from ..models import Student, User
from ..schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, StudentLoginRequest, StudentToken, Token

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=Token, dependencies=[Depends(login_rate_limiter)])
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token(
        {"sub": str(user.id), "role": user.role}, timedelta(minutes=settings.access_token_expire_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


@router.post("/student-login", response_model=StudentToken, dependencies=[Depends(student_login_rate_limiter)])
async def student_login(payload: StudentLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(func.lower(Student.student_id) == payload.student_id.strip().lower()))
    student = result.scalars().first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student ID not found. Please contact your teacher.")
    if student.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This student account is inactive. Please contact your teacher.")
    if student.name.strip().lower() != payload.name.strip().lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID or name does not match our records.")

    access_token = create_access_token(
        {"sub": str(student.id), "role": "student"}, timedelta(minutes=settings.student_token_expire_minutes)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "student",
        "student_id": student.student_id,
        "name": student.name,
        "id": student.id,
    }


@router.post("/forgot-password", dependencies=[Depends(login_rate_limiter)])
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    # Always return a generic message so this endpoint can't be used to enumerate accounts.
    if user is not None:
        reset_token = create_access_token({"sub": str(user.id), "role": "password_reset"}, timedelta(minutes=30))
        # TODO: wire up an email provider. For now the reset link is logged server-side.
        print(f"[password reset] {user.email} -> token={reset_token}")
    return {"detail": "If that email exists, password reset instructions have been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from ..core.security import decode_access_token

    token_payload = decode_access_token(payload.token)
    if token_payload is None or token_payload.get("role") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user = await db.get(User, int(token_payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user.password_hash = create_password_hash(payload.new_password)
    await db.commit()
    return {"detail": "Password updated successfully"}
