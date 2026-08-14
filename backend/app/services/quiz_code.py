import random
import re
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Quiz, Student

GUEST_STUDENT_PREFIX = "GUEST-"


def _subject_prefix(subject: str) -> str:
    letters = re.sub(r"[^A-Za-z]", "", subject).upper()
    return (letters[:3] or "QZ").ljust(3, "X")


async def generate_quiz_code(db: AsyncSession, subject: str) -> str:
    prefix = _subject_prefix(subject)
    for _ in range(50):
        candidate = f"{prefix}{''.join(random.choices(string.digits, k=3))}"
        existing = await db.execute(select(Quiz).where(Quiz.quiz_code == candidate))
        if existing.scalars().first() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique quiz code")


def guest_prefix_for(quiz_code: str) -> str:
    """student_id prefix used for self-registered (quick-join) students of a given quiz."""
    return f"{GUEST_STUDENT_PREFIX}{quiz_code}-"


async def generate_guest_student_id(db: AsyncSession, quiz_code: str) -> str:
    prefix = guest_prefix_for(quiz_code)
    for _ in range(50):
        candidate = f"{prefix}{''.join(random.choices(string.digits, k=6))}"
        existing = await db.execute(select(Student).where(Student.student_id == candidate))
        if existing.scalars().first() is None:
            return candidate
    raise RuntimeError("Unable to generate a unique guest student id")
