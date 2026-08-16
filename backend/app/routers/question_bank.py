from fastapi import APIRouter, Depends, HTTPException, Query, status
from openai import OpenAIError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.deps import get_current_teacher
from ..core.rate_limit import mcq_parse_rate_limiter
from ..db import get_db
from ..models import Question, QuestionBank, Quiz, QuizStatus, User
from ..schemas.question import QuestionRead
from ..schemas.question_bank import (
    ParsedQuestionDraft,
    ParseTextRequest,
    QuestionBankCreate,
    QuestionBankRead,
    QuestionBankUpdate,
)
from ..services.mcq_parser import parse_mcq_text

router = APIRouter()


@router.post("/", response_model=QuestionBankRead)
async def create_bank_question(payload: QuestionBankCreate, db: AsyncSession = Depends(get_db), teacher: User = Depends(get_current_teacher)):
    question = QuestionBank(**payload.model_dump(), created_by=teacher.id)
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.post("/parse", response_model=list[ParsedQuestionDraft], dependencies=[Depends(mcq_parse_rate_limiter)])
async def parse_bank_questions(payload: ParseTextRequest, _: User = Depends(get_current_teacher)):
    try:
        return await parse_mcq_text(payload.text)
    except OpenAIError as exc:
        # Raised as a plain OpenAIError (not an HTTPException), an unhandled exception here
        # would otherwise propagate past CORSMiddleware and reach the browser as an opaque
        # CORS failure instead of a readable error - see e.g. a missing OPENAI_API_KEY.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI parsing failed: {exc}") from exc


@router.get("/", response_model=list[QuestionBankRead])
async def list_bank_questions(
    subject: str | None = None,
    grade: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_teacher),
):
    query = select(QuestionBank)
    if subject:
        query = query.where(QuestionBank.subject == subject)
    if grade:
        query = query.where(QuestionBank.grade == grade)
    if topic:
        query = query.where(QuestionBank.topic == topic)
    if difficulty:
        query = query.where(QuestionBank.difficulty == difficulty)
    if q:
        query = query.where(QuestionBank.question_text.ilike(f"%{q}%"))
    query = query.order_by(QuestionBank.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{question_id}", response_model=QuestionBankRead)
async def update_bank_question(question_id: int, payload: QuestionBankUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    question = await db.get(QuestionBank, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{question_id}")
async def delete_bank_question(question_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    question = await db.get(QuestionBank, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(question)
    await db.commit()
    return {"detail": "Question removed from bank"}


@router.post("/{question_id}/add-to-quiz/{quiz_id}", response_model=QuestionRead)
async def add_bank_question_to_quiz(question_id: int, quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    bank_question = await db.get(QuestionBank, question_id)
    if bank_question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank question not found")
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if quiz.status != QuizStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft quizzes can be edited")

    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    order_index = count_result.scalar_one()
    question = Question(
        quiz_id=quiz_id,
        order_index=order_index,
        question_text=bank_question.question_text,
        option_a=bank_question.option_a,
        option_b=bank_question.option_b,
        option_c=bank_question.option_c,
        option_d=bank_question.option_d,
        correct_answer=bank_question.correct_answer,
        marks=bank_question.marks,
        topic=bank_question.topic,
        difficulty=bank_question.difficulty,
    )
    db.add(question)
    await db.flush()
    marks_result = await db.execute(select(func.coalesce(func.sum(Question.marks), 0)).where(Question.quiz_id == quiz_id))
    quiz.total_marks = marks_result.scalar_one()
    await db.commit()
    await db.refresh(question)
    return question
