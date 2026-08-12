from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.deps import get_current_teacher
from ..db import get_db
from ..models import User
from ..services import analytics as analytics_service
from ..services.export import rows_response

router = APIRouter()


@router.get("/quizzes/{quiz_id}/class")
async def export_class_report(
    quiz_id: int, format: str = Query("csv"), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)
):
    data = await analytics_service.class_analysis(db, quiz_id)
    headers = ["Rank", "Student ID", "Name", "Score", "Total Marks", "Percentage", "Time Taken (s)"]
    rows = [
        [r["rank"], r["student_id"], r["name"], r["score"], r["total_marks"], r["percentage"], r["time_taken_seconds"]]
        for r in data["ranking"]
    ]
    filename = f"class_report_quiz_{quiz_id}"
    return rows_response(filename, headers, rows, format)


@router.get("/quizzes/{quiz_id}/questions")
async def export_question_report(
    quiz_id: int, format: str = Query("csv"), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)
):
    data = await analytics_service.question_analysis(db, quiz_id)
    headers = ["#", "Question", "Topic", "Difficulty", "Correct Answer", "A", "B", "C", "D", "Unanswered", "Accuracy %"]
    rows = [
        [
            q["question_number"],
            q["question_text"],
            q["topic"],
            q["difficulty"],
            q["correct_answer"],
            q["response_counts"]["A"],
            q["response_counts"]["B"],
            q["response_counts"]["C"],
            q["response_counts"]["D"],
            q["response_counts"]["unanswered"],
            q["accuracy"],
        ]
        for q in data["questions"]
    ]
    filename = f"question_report_quiz_{quiz_id}"
    return rows_response(filename, headers, rows, format)


@router.get("/quizzes/{quiz_id}/topics")
async def export_topic_report(
    quiz_id: int, format: str = Query("csv"), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)
):
    data = await analytics_service.quiz_topic_analysis(db, quiz_id)
    headers = ["Topic", "Questions", "Correct", "Accuracy %"]
    rows = [[t["topic"], t["questions"], t["correct"], t["accuracy"]] for t in data["topics"]]
    filename = f"topic_report_quiz_{quiz_id}"
    return rows_response(filename, headers, rows, format)


@router.get("/students/{student_id}")
async def export_student_report(
    student_id: int, format: str = Query("csv"), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_teacher)
):
    data = await analytics_service.student_analysis(db, student_id)
    headers = ["Quiz", "Date", "Score", "Total Marks", "Percentage"]
    rows = [[t["quiz_title"], t["date"], t["score"], t["total_marks"], t["percentage"]] for t in data["trend"]]
    filename = f"student_report_{data['student_id']}"
    return rows_response(filename, headers, rows, format)
