from openai import AsyncOpenAI
from pydantic import BaseModel

from ..core.config import get_settings
from ..schemas.question_bank import ParsedQuestionDraft

SYSTEM_PROMPT = """You extract multiple-choice questions from raw text pasted by a teacher.

Reformat only what is already present in the text - never invent a question, option, or
answer that isn't there. Each question must have exactly four options (A-D). If a
question's correct answer isn't indicated anywhere in the source text, set
correct_answer to null rather than guessing. Ignore anything in the text that isn't a
multiple-choice question (headers, instructions, page numbers, etc)."""


class _ParsedMCQBatch(BaseModel):
    questions: list[ParsedQuestionDraft]


async def parse_mcq_text(text: str) -> list[ParsedQuestionDraft]:
    # Uses Google's free-tier Gemini API through its OpenAI-compatible endpoint, so the
    # rest of this file (and the openai SDK dependency) stays unchanged.
    client = AsyncOpenAI(
        api_key=get_settings().gemini_api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    response = await client.chat.completions.parse(
        model="gemini-flash-latest",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format=_ParsedMCQBatch,
    )
    return response.choices[0].message.parsed.questions
