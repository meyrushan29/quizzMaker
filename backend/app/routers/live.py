from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.deps import get_current_student
from ..db import get_db
from ..models import Answer, Question, Quiz, QuizStatus, QuizSession, SessionStatus, Student
from ..schemas.common import assume_utc
from ..schemas.live import (
    AnswerSubmitRequest,
    JoinQuizRequest,
    JoinQuizResponse,
    QuestionOption,
    ResultResponse,
    SessionStateResponse,
    StudentQuestionView,
)
from ..services.live_manager import live_manager
from ..services.quiz_lifecycle import finalize_quiz
from ..services.scoring import build_question_payload, finalize_scoring, grade_answer, performance_message, question_order

router = APIRouter()


async def _get_quiz_with_questions(db: AsyncSession, quiz_id: int) -> Quiz:
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions)))
    quiz = result.scalars().first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


async def _get_own_session(db: AsyncSession, session_id: int, student: Student) -> QuizSession:
    session = await db.get(QuizSession, session_id)
    if session is None or session.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")
    return session


async def _maybe_expire(db: AsyncSession, quiz: Quiz, session: QuizSession) -> bool:
    """Lazily enforces the server-side deadline. Returns True if the session got auto-submitted."""
    if session.status != SessionStatus.in_progress.value:
        return False
    if quiz.ends_at and datetime.utcnow() >= quiz.ends_at:
        await finalize_quiz(db, quiz)
        await db.commit()
        return True
    return False


@router.post("/join", response_model=JoinQuizResponse)
async def join_quiz(payload: JoinQuizRequest, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    result = await db.execute(
        select(Quiz).where(Quiz.quiz_code == payload.quiz_code.strip().upper()).options(selectinload(Quiz.questions))
    )
    quiz = result.scalars().first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz code is invalid.")

    if quiz.status == QuizStatus.completed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz has already ended.")
    if quiz.status == QuizStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has not started yet.")

    existing_result = await db.execute(
        select(QuizSession)
        .where(QuizSession.quiz_id == quiz.id, QuizSession.student_id == student.id)
        .order_by(QuizSession.attempt_number.desc())
    )
    existing_sessions = existing_result.scalars().all()
    active_session = next((s for s in existing_sessions if s.status in (SessionStatus.waiting.value, SessionStatus.in_progress.value)), None)

    if active_session is None and existing_sessions:
        latest = existing_sessions[0]
        if not quiz.allow_retake:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted this quiz.")
        active_session = None  # fall through to create a new attempt

    if active_session is not None:
        session = active_session
    else:
        if quiz.status == QuizStatus.live_active.value and not quiz.allow_late_join:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz has already started. Late joining is not allowed.")
        now = datetime.utcnow()
        session = QuizSession(
            quiz_id=quiz.id,
            student_id=student.id,
            attempt_number=(existing_sessions[0].attempt_number + 1) if existing_sessions else 1,
            joined_at=now,
            status=SessionStatus.waiting.value if quiz.status == QuizStatus.live_lobby.value else SessionStatus.in_progress.value,
            started_at=now if quiz.status == QuizStatus.live_active.value else None,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    joined_count_result = await db.execute(select(QuizSession).where(QuizSession.quiz_id == quiz.id))
    await live_manager.broadcast(
        quiz.quiz_code,
        {
            "type": "student_joined",
            "student_id": student.student_id,
            "name": student.name,
            "joined_count": len(joined_count_result.scalars().all()),
        },
    )

    return JoinQuizResponse(
        session_id=session.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        quiz_status=quiz.status,
        session_status=session.status,
        duration=quiz.duration,
        total_questions=len(quiz.questions),
        ends_at=quiz.ends_at,
    )


@router.get("/session/{session_id}", response_model=SessionStateResponse)
async def get_session_state(session_id: int, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    session = await _get_own_session(db, session_id, student)
    quiz = await _get_quiz_with_questions(db, session.quiz_id)
    await _maybe_expire(db, quiz, session)

    questions: list[StudentQuestionView] = []
    current_index = 0
    if session.status in (SessionStatus.in_progress.value,) and quiz.questions:
        answers_result = await db.execute(select(Answer).where(Answer.session_id == session.id))
        answers_by_qid = {a.question_id: a for a in answers_result.scalars().all()}
        ordered_ids = question_order(session, quiz, quiz.questions)
        await db.commit()  # persist question_order if it was just generated
        questions_by_id = {q.id: q for q in quiz.questions}
        for qid in ordered_ids:
            q = questions_by_id[qid]
            answer = answers_by_qid.get(qid)
            payload = build_question_payload(session, quiz, q, answer.selected_answer if answer else None)
            questions.append(StudentQuestionView(**payload))
        current_index = next((i for i, qv in enumerate(questions) if qv.selected_answer is None), len(questions) - 1)

    return SessionStateResponse(
        session_id=session.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        quiz_code=quiz.quiz_code,
        quiz_status=quiz.status,
        session_status=session.status,
        duration=quiz.duration,
        ends_at=quiz.ends_at,
        current_index=max(current_index, 0),
        questions=questions,
    )


@router.post("/session/{session_id}/answer")
async def submit_answer(session_id: int, payload: AnswerSubmitRequest, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    session = await _get_own_session(db, session_id, student)
    quiz = await _get_quiz_with_questions(db, session.quiz_id)

    if await _maybe_expire(db, quiz, session):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Time is up. Your quiz has been submitted.")
    if session.status != SessionStatus.in_progress.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz is not currently active for you.")

    question = next((q for q in quiz.questions if q.id == payload.question_id), None)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found in this quiz.")

    result = await db.execute(select(Answer).where(Answer.session_id == session.id, Answer.question_id == question.id))
    answer = result.scalars().first()
    is_correct = grade_answer(session.id, question, payload.selected_answer, quiz.randomize_options)
    if answer is None:
        answer = Answer(session_id=session.id, question_id=question.id)
        db.add(answer)
    answer.selected_answer = payload.selected_answer
    answer.is_correct = is_correct
    answer.answered_at = datetime.utcnow()
    await db.commit()

    answered_result = await db.execute(
        select(Answer).where(Answer.session_id == session.id, Answer.selected_answer.is_not(None))
    )
    answered_count = len(answered_result.scalars().all())
    if quiz.quiz_code:
        await live_manager.broadcast(
            quiz.quiz_code,
            {
                "type": "progress_update",
                "student_id": student.student_id,
                "name": student.name,
                "answered": answered_count,
                "total_questions": len(quiz.questions),
                "status": session.status,
            },
        )
    return {"detail": "Answer saved", "question_id": question.id}


@router.post("/session/{session_id}/submit", response_model=ResultResponse | dict)
async def submit_quiz(session_id: int, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    session = await _get_own_session(db, session_id, student)
    quiz = await _get_quiz_with_questions(db, session.quiz_id)

    if session.status in (SessionStatus.submitted.value, SessionStatus.auto_submitted.value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted this quiz.")
    if await _maybe_expire(db, quiz, session):
        pass  # already finalized as auto_submitted below
    else:
        if session.status != SessionStatus.in_progress.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz is not currently active for you.")
        answers_result = await db.execute(select(Answer).where(Answer.session_id == session.id))
        answers_by_qid = {a.question_id: a for a in answers_result.scalars().all()}
        session.submitted_at = datetime.utcnow()
        session.status = SessionStatus.submitted.value
        finalize_scoring(session, quiz, quiz.questions, answers_by_qid)
        await db.commit()

    if quiz.quiz_code:
        await live_manager.broadcast(
            quiz.quiz_code,
            {"type": "student_submitted", "student_id": student.student_id, "name": student.name},
        )

    if not quiz.show_result_immediately and quiz.status != QuizStatus.completed.value:
        return {"detail": "Submitted. Your teacher will publish results shortly."}

    return _build_result(session, quiz, student)


@router.get("/session/{session_id}/result", response_model=ResultResponse | dict)
async def get_result(session_id: int, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    session = await _get_own_session(db, session_id, student)
    quiz = await _get_quiz_with_questions(db, session.quiz_id)

    if session.status not in (SessionStatus.submitted.value, SessionStatus.auto_submitted.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must submit the quiz before viewing results.")
    if not quiz.show_result_immediately and quiz.status != QuizStatus.completed.value:
        return {"detail": "Results are not available yet. Your teacher will publish them shortly."}
    return _build_result(session, quiz, student)


@router.get("/session/{session_id}/leaderboard")
async def get_leaderboard(session_id: int, db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    session = await _get_own_session(db, session_id, student)
    quiz = await db.get(Quiz, session.quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if not quiz.leaderboard_visible:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The leaderboard is not available for this quiz.")

    result = await db.execute(
        select(QuizSession)
        .where(QuizSession.quiz_id == quiz.id, QuizSession.status.in_([SessionStatus.submitted.value, SessionStatus.auto_submitted.value]))
        .options(selectinload(QuizSession.student))
        .order_by(QuizSession.score.desc())
    )
    sessions = result.scalars().all()
    return [
        {"rank": i + 1, "name": s.student.name, "score": s.score, "percentage": s.percentage, "is_you": s.student_id == student.id}
        for i, s in enumerate(sessions)
    ]


@router.get("/history")
async def my_history(db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    result = await db.execute(
        select(QuizSession)
        .where(
            QuizSession.student_id == student.id,
            QuizSession.status.in_([SessionStatus.submitted.value, SessionStatus.auto_submitted.value]),
        )
        .options(selectinload(QuizSession.quiz))
        .order_by(QuizSession.submitted_at)
    )
    sessions = result.scalars().all()
    return [
        {
            "quiz_id": s.quiz_id,
            "quiz_title": s.quiz.title,
            "subject": s.quiz.subject,
            "chapter": s.quiz.chapter,
            "date": assume_utc(s.submitted_at),
            "score": s.score,
            "total_marks": s.quiz.total_marks,
            "percentage": s.percentage,
        }
        for s in sessions
    ]


@router.get("/quizzes/available")
async def available_quizzes(db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    """Live quizzes a student could currently join (lobby open, or active with late-join allowed)."""
    result = await db.execute(
        select(Quiz).where(Quiz.status.in_([QuizStatus.live_lobby.value, QuizStatus.live_active.value]))
    )
    quizzes = result.scalars().all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "subject": q.subject,
            "chapter": q.chapter,
            "quiz_code": q.quiz_code,
            "status": q.status,
            "duration": q.duration,
        }
        for q in quizzes
        if q.status == QuizStatus.live_lobby.value or q.allow_late_join
    ]


def _build_result(session: QuizSession, quiz: Quiz, student: Student) -> ResultResponse:
    percentage = session.percentage or 0
    return ResultResponse(
        session_id=session.id,
        student_name=student.name,
        student_id=student.student_id,
        quiz_title=quiz.title,
        score=session.score or 0,
        total_marks=quiz.total_marks,
        percentage=percentage,
        correct=session.correct_count or 0,
        wrong=session.wrong_count or 0,
        unanswered=session.unanswered_count or 0,
        time_taken_seconds=session.time_taken_seconds,
        performance_message=performance_message(percentage),
        passed=percentage >= quiz.passing_percentage,
    )
