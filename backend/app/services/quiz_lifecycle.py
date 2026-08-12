import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Answer, Quiz, QuizStatus, QuizSession, SessionStatus
from .live_manager import live_manager
from .scoring import finalize_scoring


async def finalize_quiz(db: AsyncSession, quiz: Quiz) -> None:
    """Auto-submits every attempt still in progress and marks the quiz completed.

    Shared by the teacher's manual "End Quiz" action and the server-side timer
    below, so a quiz is always graded the same way regardless of what triggered
    the end - the frontend timer is cosmetic only.
    """
    now = datetime.utcnow()
    result = await db.execute(
        select(QuizSession).where(
            QuizSession.quiz_id == quiz.id,
            QuizSession.status.in_([SessionStatus.in_progress.value, SessionStatus.waiting.value]),
        )
    )
    for session in result.scalars().all():
        answers_result = await db.execute(select(Answer).where(Answer.session_id == session.id))
        answers_by_qid = {a.question_id: a for a in answers_result.scalars().all()}
        session.submitted_at = now
        session.status = SessionStatus.auto_submitted.value
        if session.started_at is None:
            session.started_at = quiz.started_at or now
        questions = quiz.questions
        finalize_scoring(session, quiz, questions, answers_by_qid)

    quiz.status = QuizStatus.completed.value


async def _auto_end_after_delay(quiz_id: int, delay_seconds: float) -> None:
    from ..db import AsyncSessionLocal

    await asyncio.sleep(max(delay_seconds, 0))
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
        )
        quiz = result.scalars().first()
        if quiz is None or quiz.status != QuizStatus.live_active.value:
            return
        if quiz.ends_at and datetime.utcnow() < quiz.ends_at:
            return
        await finalize_quiz(db, quiz)
        await db.commit()
        if quiz.quiz_code:
            await live_manager.broadcast(quiz.quiz_code, {"type": "quiz_ended", "reason": "time_expired"})


def schedule_auto_end(quiz_id: int, ends_at: datetime) -> None:
    delay = (ends_at - datetime.utcnow()).total_seconds()
    asyncio.create_task(_auto_end_after_delay(quiz_id, delay))
