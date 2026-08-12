import random
import re
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Quiz


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
