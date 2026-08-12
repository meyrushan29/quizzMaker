from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.deps import get_current_teacher
from ..db import get_db
from ..models import User
from ..services import analytics as analytics_service

router = APIRouter()


@router.get("/dashboard")
async def dashboard_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.dashboard_stats(db)


@router.get("/students/{student_id}")
async def student_analysis(student_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.student_analysis(db, student_id)


@router.get("/quizzes/{quiz_id}/class")
async def class_analysis(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.class_analysis(db, quiz_id)


@router.get("/quizzes/{quiz_id}/questions")
async def question_analysis(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.question_analysis(db, quiz_id)


@router.get("/quizzes/{quiz_id}/topics")
async def quiz_topic_analysis(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.quiz_topic_analysis(db, quiz_id)


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    return await analytics_service.overview(db)
