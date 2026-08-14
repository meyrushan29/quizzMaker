from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.rate_limit import login_rate_limiter, student_login_rate_limiter
from ..core.security import create_access_token, create_password_hash, verify_password
from ..db import get_db
from ..models import QuizStatus, QuizSession, Quiz, Student, User
from ..schemas.auth import (
    ForgotPasswordRequest,
    QuickJoinRequest,
    ResetPasswordRequest,
    StudentLoginRequest,
    StudentToken,
    Token,
)
from ..services.quiz_code import generate_guest_student_id, guest_prefix_for

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


@router.post("/quick-join", response_model=StudentToken, dependencies=[Depends(student_login_rate_limiter)])
async def quick_join(payload: QuickJoinRequest, db: AsyncSession = Depends(get_db)):
    """Lets a student join a live quiz with just their name and the quiz code -
    no teacher-provisioned Student ID required. A lightweight guest Student
    record is created (or reused, if this name already joined this quiz)."""
    name = payload.name.strip()
    quiz_code = payload.quiz_code.strip().upper()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter your name.")

    result = await db.execute(select(Quiz).where(Quiz.quiz_code == quiz_code))
    quiz = result.scalars().first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz code is invalid.")
    if quiz.status == QuizStatus.completed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz has already ended.")
    if quiz.status == QuizStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has not started yet.")

    # Resume this name's own guest record for this quiz (e.g. on page refresh) rather than
    # creating a duplicate - but never match against a teacher's real roster of students.
    existing_result = await db.execute(
        select(Student)
        .join(QuizSession, QuizSession.student_id == Student.id)
        .where(
            Student.student_id.like(f"{guest_prefix_for(quiz_code)}%"),
            func.lower(Student.name) == name.lower(),
            QuizSession.quiz_id == quiz.id,
        )
    )
    student = existing_result.scalars().first()

    if student is None:
        student = Student(
            student_id=await generate_guest_student_id(db, quiz_code),
            name=name,
            grade=quiz.grade,
            subject=quiz.subject,
            status="active",
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)

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
