import random
from datetime import datetime

from ..models import Answer, Question, Quiz, QuizSession

_KEYS = ["A", "B", "C", "D"]


def question_order(session: QuizSession, quiz: Quiz, questions: list[Question]) -> list[int]:
    """Deterministic, persisted-on-first-use order of question ids for this attempt."""
    if session.question_order:
        return session.question_order
    ids = [q.id for q in questions]
    if quiz.randomize_questions:
        random.Random(f"order-{session.id}").shuffle(ids)
    session.question_order = ids
    return ids


def option_display_map(session_id: int, question_id: int, randomize: bool) -> dict[str, str]:
    """Maps the letter shown to the student -> the question's real option key."""
    if not randomize:
        return {k: k for k in _KEYS}
    shuffled = _KEYS.copy()
    random.Random(f"opt-{session_id}-{question_id}").shuffle(shuffled)
    return dict(zip(_KEYS, shuffled))


def option_texts(question: Question) -> dict[str, str]:
    return {"A": question.option_a, "B": question.option_b, "C": question.option_c, "D": question.option_d}


def build_question_payload(session: QuizSession, quiz: Quiz, question: Question, selected_answer: str | None) -> dict:
    display_map = option_display_map(session.id, question.id, quiz.randomize_options)
    texts = option_texts(question)
    reverse_map = {orig: disp for disp, orig in display_map.items()}
    return {
        "id": question.id,
        "question_text": question.question_text,
        "marks": question.marks,
        "options": [{"key": disp, "text": texts[orig]} for disp, orig in display_map.items()],
        "selected_answer": reverse_map.get(selected_answer) if selected_answer else None,
    }


def grade_answer(session_id: int, question: Question, selected_display_answer: str, randomize: bool) -> bool:
    display_map = option_display_map(session_id, question.id, randomize)
    original_key = display_map.get(selected_display_answer)
    return original_key == question.correct_answer


def finalize_scoring(session: QuizSession, quiz: Quiz, questions: list[Question], answers_by_qid: dict[int, Answer]) -> None:
    correct = wrong = unanswered = 0
    score = 0
    for question in questions:
        answer = answers_by_qid.get(question.id)
        if answer is None or answer.selected_answer is None:
            unanswered += 1
            continue
        if answer.is_correct:
            correct += 1
            score += question.marks
        else:
            wrong += 1

    total_marks = sum(q.marks for q in questions) or 1
    percentage = round((score / total_marks) * 100)

    session.correct_count = correct
    session.wrong_count = wrong
    session.unanswered_count = unanswered
    session.score = score
    session.percentage = percentage

    if session.started_at:
        elapsed = (session.submitted_at - session.started_at).total_seconds()
        session.time_taken_seconds = max(0, int(elapsed))


def performance_message(percentage: int) -> str:
    if percentage >= 90:
        return "Excellent"
    if percentage >= 75:
        return "Very Good"
    if percentage >= 50:
        return "Good"
    return "Needs Improvement"
