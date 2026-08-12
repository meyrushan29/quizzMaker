from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.deps import get_current_teacher
from ..db import get_db
from ..models import Question, Quiz, QuizStatus, User
from ..schemas.question import QuestionCreate, QuestionRead, QuestionReorder, QuestionUpdate

router = APIRouter()


async def _get_editable_quiz(db: AsyncSession, quiz_id: int) -> Quiz:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if quiz.status != QuizStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft quizzes can be edited")
    return quiz


async def _recompute_total_marks(db: AsyncSession, quiz: Quiz) -> None:
    result = await db.execute(select(func.coalesce(func.sum(Question.marks), 0)).where(Question.quiz_id == quiz.id))
    quiz.total_marks = result.scalar_one()


@router.post("/{quiz_id}/questions", response_model=QuestionRead)
async def add_question(quiz_id: int, question_in: QuestionCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_editable_quiz(db, quiz_id)
    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    order_index = count_result.scalar_one()

    question = Question(**question_in.model_dump(), quiz_id=quiz_id, order_index=order_index)
    db.add(question)
    await db.flush()
    await _recompute_total_marks(db, quiz)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/{quiz_id}/questions", response_model=list[QuestionRead])
async def list_questions(quiz_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    result = await db.execute(select(Question).where(Question.quiz_id == quiz_id).order_by(Question.order_index))
    return result.scalars().all()


@router.put("/{quiz_id}/questions/{question_id}", response_model=QuestionRead)
async def update_question(quiz_id: int, question_id: int, question_in: QuestionUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_editable_quiz(db, quiz_id)
    question = await db.get(Question, question_id)
    if question is None or question.quiz_id != quiz_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    for field, value in question_in.model_dump(exclude_none=True).items():
        setattr(question, field, value)
    await _recompute_total_marks(db, quiz)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{quiz_id}/questions/{question_id}")
async def delete_question(quiz_id: int, question_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_editable_quiz(db, quiz_id)
    question = await db.get(Question, question_id)
    if question is None or question.quiz_id != quiz_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(question)
    await db.flush()
    await _recompute_total_marks(db, quiz)
    await db.commit()
    return {"detail": "Question deleted"}


@router.post("/{quiz_id}/questions/{question_id}/duplicate", response_model=QuestionRead)
async def duplicate_question(quiz_id: int, question_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    quiz = await _get_editable_quiz(db, quiz_id)
    question = await db.get(Question, question_id)
    if question is None or question.quiz_id != quiz_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    count_result = await db.execute(select(func.count(Question.id)).where(Question.quiz_id == quiz_id))
    order_index = count_result.scalar_one()
    duplicate = Question(
        quiz_id=quiz_id,
        order_index=order_index,
        question_text=question.question_text,
        option_a=question.option_a,
        option_b=question.option_b,
        option_c=question.option_c,
        option_d=question.option_d,
        correct_answer=question.correct_answer,
        marks=question.marks,
        topic=question.topic,
        difficulty=question.difficulty,
    )
    db.add(duplicate)
    await db.flush()
    await _recompute_total_marks(db, quiz)
    await db.commit()
    await db.refresh(duplicate)
    return duplicate


@router.post("/{quiz_id}/questions/reorder", response_model=list[QuestionRead])
async def reorder_questions(quiz_id: int, payload: QuestionReorder, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)):
    await _get_editable_quiz(db, quiz_id)
    result = await db.execute(select(Question).where(Question.quiz_id == quiz_id))
    questions_by_id = {q.id: q for q in result.scalars().all()}
    if set(payload.order) != set(questions_by_id.keys()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must include every question exactly once")
    for index, question_id in enumerate(payload.order):
        questions_by_id[question_id].order_index = index
    await db.commit()
    result = await db.execute(select(Question).where(Question.quiz_id == quiz_id).order_by(Question.order_index))
    return result.scalars().all()
