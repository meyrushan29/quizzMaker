import statistics
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.config import get_settings
from ..models import Answer, Question, Quiz, QuizSession, SessionStatus, Student
from ..schemas.common import assume_utc

settings = get_settings()
_SUBMITTED = (SessionStatus.submitted.value, SessionStatus.auto_submitted.value)


async def dashboard_stats(db: AsyncSession) -> dict:
    students_result = await db.execute(select(Student).where(Student.status == "active"))
    total_students = len(students_result.scalars().all())

    quizzes_result = await db.execute(select(Quiz).options(selectinload(Quiz.questions)))
    quizzes = quizzes_result.scalars().all()
    total_quizzes = len(quizzes)
    completed_quizzes = sum(1 for q in quizzes if q.status == "completed")

    sessions_result = await db.execute(select(QuizSession).where(QuizSession.status.in_(_SUBMITTED)))
    sessions = sessions_result.scalars().all()
    percentages = [s.percentage for s in sessions if s.percentage is not None]

    sessions_by_quiz: dict[int, list[QuizSession]] = defaultdict(list)
    for s in sessions:
        sessions_by_quiz[s.quiz_id].append(s)

    recent_quizzes = []
    for quiz in sorted(quizzes, key=lambda q: q.created_at, reverse=True)[:10]:
        quiz_sessions = sessions_by_quiz.get(quiz.id, [])
        quiz_percentages = [s.percentage for s in quiz_sessions if s.percentage is not None]
        recent_quizzes.append(
            {
                "id": quiz.id,
                "title": quiz.title,
                "date": assume_utc(quiz.created_at),
                "questions": len(quiz.questions),
                "students": len(quiz_sessions),
                "average_score": round(sum(quiz_percentages) / len(quiz_percentages)) if quiz_percentages else None,
                "status": quiz.status,
            }
        )

    return {
        "total_students": total_students,
        "total_quizzes": total_quizzes,
        "completed_quizzes": completed_quizzes,
        "average_class_score": round(sum(percentages) / len(percentages)) if percentages else 0,
        "highest_score": max(percentages) if percentages else 0,
        "lowest_score": min(percentages) if percentages else 0,
        "recent_quizzes": recent_quizzes,
    }


async def student_analysis(db: AsyncSession, student_id: int) -> dict:
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    result = await db.execute(
        select(QuizSession)
        .where(QuizSession.student_id == student_id, QuizSession.status.in_(_SUBMITTED))
        .options(selectinload(QuizSession.quiz), selectinload(QuizSession.answers).selectinload(Answer.question))
        .order_by(QuizSession.submitted_at)
    )
    sessions = result.scalars().all()

    trend = [
        {
            "quiz_id": s.quiz_id,
            "quiz_title": s.quiz.title,
            "date": assume_utc(s.submitted_at),
            "score": s.score,
            "total_marks": s.quiz.total_marks,
            "percentage": s.percentage,
        }
        for s in sessions
    ]
    percentages = [s.percentage for s in sessions if s.percentage is not None]

    trend_status = "No data"
    improvement_percentage = 0
    if len(percentages) >= 2:
        improvement_percentage = percentages[-1] - percentages[0]
        half = len(percentages) // 2 or 1
        first_half_avg = sum(percentages[:half]) / half
        second_half_avg = sum(percentages[half:]) / max(len(percentages) - half, 1)
        diff = second_half_avg - first_half_avg
        trend_status = "Improving" if diff > 3 else "Declining" if diff < -3 else "Stable"
    elif len(percentages) == 1:
        trend_status = "Stable"

    topic_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    for s in sessions:
        for answer in s.answers:
            topic = answer.question.topic or "General"
            topic_stats[topic]["total"] += 1
            if answer.is_correct:
                topic_stats[topic]["correct"] += 1

    topics = []
    for topic, stats in topic_stats.items():
        accuracy = round((stats["correct"] / stats["total"]) * 100) if stats["total"] else 0
        topics.append({"topic": topic, "questions": stats["total"], "correct": stats["correct"], "accuracy": accuracy})
    topics.sort(key=lambda t: t["accuracy"])
    weak_topics = [t for t in topics if t["accuracy"] < 70]

    return {
        "student_id": student.student_id,
        "name": student.name,
        "total_quizzes": len(sessions),
        "average_percentage": round(sum(percentages) / len(percentages)) if percentages else 0,
        "highest_score": max(percentages) if percentages else 0,
        "lowest_score": min(percentages) if percentages else 0,
        "improvement_percentage": improvement_percentage,
        "trend_status": trend_status,
        "trend": trend,
        "topics": topics,
        "weak_topics": weak_topics,
    }


async def class_analysis(db: AsyncSession, quiz_id: int) -> dict:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    result = await db.execute(
        select(QuizSession)
        .where(QuizSession.quiz_id == quiz_id, QuizSession.status.in_(_SUBMITTED))
        .options(selectinload(QuizSession.student))
        .order_by(QuizSession.score.desc())
    )
    sessions = result.scalars().all()
    percentages = [s.percentage for s in sessions if s.percentage is not None]

    buckets = {"0-49": 0, "50-59": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90-100": 0}
    for p in percentages:
        if p < 50:
            buckets["0-49"] += 1
        elif p < 60:
            buckets["50-59"] += 1
        elif p < 70:
            buckets["60-69"] += 1
        elif p < 80:
            buckets["70-79"] += 1
        elif p < 90:
            buckets["80-89"] += 1
        else:
            buckets["90-100"] += 1

    passed = sum(1 for p in percentages if p >= quiz.passing_percentage)
    ranking = [
        {
            "rank": i + 1,
            "db_id": s.student_id,
            "student_id": s.student.student_id,
            "name": s.student.name,
            "score": s.score,
            "total_marks": quiz.total_marks,
            "percentage": s.percentage,
            "time_taken_seconds": s.time_taken_seconds,
        }
        for i, s in enumerate(sessions)
    ]

    return {
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "num_students": len(sessions),
        "average": round(sum(percentages) / len(percentages)) if percentages else 0,
        "highest": max(percentages) if percentages else 0,
        "lowest": min(percentages) if percentages else 0,
        "median": round(statistics.median(percentages)) if percentages else 0,
        "pass_rate": round((passed / len(percentages)) * 100) if percentages else 0,
        "fail_rate": round(((len(percentages) - passed) / len(percentages)) * 100) if percentages else 0,
        "score_distribution": buckets,
        "ranking": ranking,
    }


async def question_analysis(db: AsyncSession, quiz_id: int) -> dict:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions_result = await db.execute(select(Question).where(Question.quiz_id == quiz_id).order_by(Question.order_index))
    questions = questions_result.scalars().all()

    session_ids_result = await db.execute(
        select(QuizSession.id).where(QuizSession.quiz_id == quiz_id, QuizSession.status.in_(_SUBMITTED))
    )
    session_ids = [row[0] for row in session_ids_result.all()]
    total_attempts = len(session_ids)

    breakdown = []
    for index, question in enumerate(questions):
        answers_result = await db.execute(
            select(Answer).where(Answer.question_id == question.id, Answer.session_id.in_(session_ids or [-1]))
        )
        answers = answers_result.scalars().all()
        response_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "unanswered": 0}
        correct = 0
        for a in answers:
            if a.selected_answer is None:
                response_counts["unanswered"] += 1
            else:
                response_counts[a.selected_answer] += 1
                if a.is_correct:
                    correct += 1
        unanswered_extra = total_attempts - len(answers)
        response_counts["unanswered"] += max(unanswered_extra, 0)
        accuracy = round((correct / total_attempts) * 100) if total_attempts else 0
        breakdown.append(
            {
                "question_number": index + 1,
                "question_id": question.id,
                "question_text": question.question_text,
                "correct_answer": question.correct_answer,
                "topic": question.topic,
                "difficulty": question.difficulty,
                "response_counts": response_counts,
                "accuracy": accuracy,
            }
        )

    difficult_questions = sorted([b for b in breakdown if b["accuracy"] < 70], key=lambda b: b["accuracy"])
    return {"quiz_id": quiz.id, "total_attempts": total_attempts, "questions": breakdown, "difficult_questions": difficult_questions}


async def quiz_topic_analysis(db: AsyncSession, quiz_id: int) -> dict:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    result = await db.execute(
        select(Answer)
        .join(Question, Answer.question_id == Question.id)
        .join(QuizSession, Answer.session_id == QuizSession.id)
        .where(Question.quiz_id == quiz_id, QuizSession.status.in_(_SUBMITTED))
        .options(selectinload(Answer.question))
    )
    answers = result.scalars().all()

    topic_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    for a in answers:
        topic = a.question.topic or "General"
        topic_stats[topic]["total"] += 1
        if a.is_correct:
            topic_stats[topic]["correct"] += 1

    topics = [
        {
            "topic": topic,
            "questions": stats["total"],
            "correct": stats["correct"],
            "accuracy": round((stats["correct"] / stats["total"]) * 100) if stats["total"] else 0,
        }
        for topic, stats in topic_stats.items()
    ]
    topics.sort(key=lambda t: t["accuracy"])
    return {"quiz_id": quiz.id, "topics": topics, "needs_improvement": [t for t in topics if t["accuracy"] < 70]}


async def overview(db: AsyncSession) -> dict:
    result = await db.execute(
        select(QuizSession)
        .where(QuizSession.status.in_(_SUBMITTED))
        .options(selectinload(QuizSession.student), selectinload(QuizSession.answers).selectinload(Answer.question))
    )
    sessions = result.scalars().all()
    percentages = [s.percentage for s in sessions if s.percentage is not None]
    passed = sum(1 for p in percentages if p >= settings.default_passing_percentage)

    topic_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    student_scores: dict[int, list[int]] = defaultdict(list)
    student_names: dict[int, tuple[str, str]] = {}
    for s in sessions:
        student_scores[s.student_id].append(s.percentage or 0)
        student_names[s.student_id] = (s.student.student_id, s.student.name)
        for answer in s.answers:
            topic = answer.question.topic or "General"
            topic_stats[topic]["total"] += 1
            if answer.is_correct:
                topic_stats[topic]["correct"] += 1

    topic_performance = [
        {"topic": topic, "accuracy": round((stats["correct"] / stats["total"]) * 100) if stats["total"] else 0}
        for topic, stats in topic_stats.items()
    ]
    topic_performance.sort(key=lambda t: t["accuracy"])

    student_performance = []
    at_risk = []
    for student_id, scores in student_scores.items():
        student_id_str, name = student_names[student_id]
        avg = round(sum(scores) / len(scores))
        trend_status = "Stable"
        if len(scores) >= 2:
            diff = scores[-1] - scores[0]
            trend_status = "Improving" if diff > 3 else "Declining" if diff < -3 else "Stable"
        entry = {
            "student_id": student_id_str,
            "name": name,
            "average": avg,
            "highest": max(scores),
            "lowest": min(scores),
            "trend": trend_status,
        }
        student_performance.append(entry)
        if avg < settings.at_risk_threshold_percentage:
            at_risk.append(entry)

    student_performance.sort(key=lambda e: e["average"])

    return {
        "average_score": round(sum(percentages) / len(percentages)) if percentages else 0,
        "pass_rate": round((passed / len(percentages)) * 100) if percentages else 0,
        "students_needing_attention": len(at_risk),
        "topic_performance": topic_performance,
        "student_performance": student_performance,
        "at_risk_students": at_risk,
        "at_risk_threshold": settings.at_risk_threshold_percentage,
    }
