from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.deps import get_current_teacher
from ..db import get_db
from ..models import Answer, Question, Quiz, QuizSession, QuizStatus, SessionStatus, User
from ..schemas.common import assume_utc
from ..schemas.quiz import QuizCreate, QuizDetail, QuizRead, QuizStartResponse, QuizUpdate
from ..services.live_manager import live_manager
from ..services.quiz_code import generate_quiz_code
from ..services.quiz_lifecycle import finalize_quiz, schedule_auto_end

router = APIRouter()


async def _get_quiz_or_404(db: AsyncSession, quiz_id: int, with_questions: bool = False) -> Quiz:
    query = select(Quiz).where(Quiz.id == quiz_id)
    if with_questions:
        query = query.options(selectinload(Quiz.questions))
    result = await db.execute(query)
    quiz = result.scalars().first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _to_quiz_read(quiz: Quiz, question_count: int) -> dict:
    data = QuizRead.model_validate(quiz).model_dump()
    data["question_count"] = question_count
    return data


@router.post("/", response_model=QuizRead)
async def create_quiz(quiz_in: QuizCreate, db: AsyncSession = Depends(get_db), teacher: User = Depends(get_current_teacher)):
    quiz = Quiz(**quiz_in.model_dump(), total_marks=0, created_by=teacher.id, status=QuizStatus.draft.value)
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return _to_quiz_read(quiz, 0)


@router.get("/", response_model=list[QuizRead])
async def list_quizzes(
    status_filter: str | None = Query(None, alias="status"),
    subject: str | None = None,
    grade: str | None = None,
    chapter: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_teacher),
):
    query = select(Quiz)
    if status_filter:
        query = query.where(Quiz.status == status_filter)
    if subject:
        query = query.where(Quiz.subject == subject)
    if grade:
        query = query.where(Quiz.grade == grade)
    if chapter:
        query = query.where(Quiz.chapter == chapter)
    query = query.order_by(Quiz.created_at.desc())
    result = await db.execute(query)
    quizzes = result.scalars().all()

    counts_result = await db.execute(select(Question.quiz_id, func.count(Question.id)).group_by(Question.quiz_id))
    counts = dict(counts_result.all())
    return [_to_quiz_read(q, counts.get(q.id, 0)) for q in quizzes]


@router.get("/{quiz_id}", response_model=QuizDetail)
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    data = QuizDetail.model_validate(quiz).model_dump()
    data["question_count"] = len(quiz.questions)
    return data


@router.put("/{quiz_id}", response_model=QuizRead)
async def update_quiz(quiz_id: int, quiz_in: QuizUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_quiz_or_404(db, quiz_id)
    if quiz.status != QuizStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft quizzes can be edited")
    for field, value in quiz_in.model_dump(exclude_none=True).items():
        setattr(quiz, field, value)
    await db.commit()
    await db.refresh(quiz)
    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz.id))
    return _to_quiz_read(quiz, count_result.scalar_one())


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_quiz_or_404(db, quiz_id)
    await db.delete(quiz)
    await db.commit()
    return {"detail": "Quiz deleted"}


@router.post("/{quiz_id}/duplicate", response_model=QuizRead)
async def duplicate_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), teacher: User = Depends(get_current_teacher)):
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    new_quiz = Quiz(
        title=f"{quiz.title} (Copy)",
        subject=quiz.subject,
        grade=quiz.grade,
        chapter=quiz.chapter,
        description=quiz.description,
        duration=quiz.duration,
        total_marks=quiz.total_marks,
        passing_percentage=quiz.passing_percentage,
        randomize_questions=quiz.randomize_questions,
        randomize_options=quiz.randomize_options,
        show_result_immediately=quiz.show_result_immediately,
        allow_retake=quiz.allow_retake,
        allow_late_join=quiz.allow_late_join,
        leaderboard_visible=quiz.leaderboard_visible,
        status=QuizStatus.draft.value,
        created_by=teacher.id,
    )
    db.add(new_quiz)
    await db.flush()
    for q in quiz.questions:
        db.add(
            Question(
                quiz_id=new_quiz.id,
                order_index=q.order_index,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_answer=q.correct_answer,
                marks=q.marks,
                topic=q.topic,
                difficulty=q.difficulty,
            )
        )
    await db.commit()
    await db.refresh(new_quiz)
    return _to_quiz_read(new_quiz, len(quiz.questions))


@router.post("/{quiz_id}/start", response_model=QuizStartResponse)
async def start_live_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    """Opens the waiting room and generates the quiz code students join with."""
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    if not quiz.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add at least one question before starting")
    if quiz.status not in (QuizStatus.draft.value, QuizStatus.completed.value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is already live")

    quiz.quiz_code = await generate_quiz_code(db, quiz.subject)
    quiz.status = QuizStatus.live_lobby.value
    quiz.started_at = None
    quiz.ends_at = None
    await db.commit()
    return QuizStartResponse(quiz_id=quiz.id, quiz_code=quiz.quiz_code, status=quiz.status)


@router.post("/{quiz_id}/begin", response_model=QuizRead)
async def begin_live_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    """Teacher clicks START QUIZ - releases the quiz to everyone in the lobby."""
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    if quiz.status != QuizStatus.live_lobby.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not in the waiting room")

    now = datetime.utcnow()
    quiz.status = QuizStatus.live_active.value
    quiz.started_at = now
    quiz.ends_at = now + timedelta(minutes=quiz.duration)

    result = await db.execute(
        select(QuizSession).where(QuizSession.quiz_id == quiz.id, QuizSession.status == SessionStatus.waiting.value)
    )
    for session in result.scalars().all():
        session.status = SessionStatus.in_progress.value
        session.started_at = now

    await db.commit()
    schedule_auto_end(quiz.id, quiz.ends_at)
    await live_manager.broadcast(
        quiz.quiz_code,
        {"type": "quiz_started", "started_at": assume_utc(now).isoformat(), "ends_at": assume_utc(quiz.ends_at).isoformat(), "duration": quiz.duration},
    )
    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz.id))
    return _to_quiz_read(quiz, count_result.scalar_one())


@router.post("/{quiz_id}/end", response_model=QuizRead)
async def end_live_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    """Ends the quiz and auto-finalizes every attempt still in progress."""
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    if quiz.status not in (QuizStatus.live_lobby.value, QuizStatus.live_active.value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not live")

    await finalize_quiz(db, quiz)
    await db.commit()
    await live_manager.broadcast(quiz.quiz_code, {"type": "quiz_ended"})
    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz.id))
    return _to_quiz_read(quiz, count_result.scalar_one())


@router.get("/{quiz_id}/monitor")
async def monitor_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_quiz_or_404(db, quiz_id, with_questions=True)
    total_questions = len(quiz.questions)

    result = await db.execute(
        select(QuizSession).where(QuizSession.quiz_id == quiz.id).options(selectinload(QuizSession.student))
    )
    sessions = result.scalars().all()

    students = []
    completed = answering = not_started = 0
    for session in sessions:
        answers_result = await db.execute(select(func.count(Answer.id)).where(Answer.session_id == session.id, Answer.selected_answer.is_not(None)))
        answered = answers_result.scalar_one()
        if session.status in (SessionStatus.submitted.value, SessionStatus.auto_submitted.value):
            completed += 1
        elif session.status == SessionStatus.in_progress.value and answered > 0:
            answering += 1
        else:
            not_started += 1
        students.append(
            {
                "student_id": session.student.student_id,
                "name": session.student.name,
                "session_id": session.id,
                "answered": answered,
                "total_questions": total_questions,
                "status": session.status,
                "score": session.score,
                "percentage": session.percentage,
            }
        )

    return {
        "quiz_id": quiz.id,
        "quiz_code": quiz.quiz_code,
        "status": quiz.status,
        "total_questions": total_questions,
        "ends_at": assume_utc(quiz.ends_at),
        "joined_count": len(sessions),
        "completed": completed,
        "answering": answering,
        "not_started": not_started,
        "students": students,
    }
