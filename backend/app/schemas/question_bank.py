from pydantic import BaseModel, Field

from .common import UTCDateTime


class QuestionBankBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(pattern="^[ABCD]$")
    marks: int = 1
    subject: str | None = None
    grade: str | None = None
    chapter: str | None = None
    topic: str | None = None
    difficulty: str | None = None


class QuestionBankCreate(QuestionBankBase):
    pass


class QuestionBankUpdate(BaseModel):
    question_text: str | None = None
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_answer: str | None = Field(default=None, pattern="^[ABCD]$")
    marks: int | None = None
    subject: str | None = None
    grade: str | None = None
    chapter: str | None = None
    topic: str | None = None
    difficulty: str | None = None


class QuizRef(BaseModel):
    id: int
    title: str


class QuestionBankRead(QuestionBankBase):
    id: int
    created_by: int
    created_at: UTCDateTime
    added_to_quizzes: list[QuizRef] = []

    class Config:
        from_attributes = True


class ParseTextRequest(BaseModel):
    text: str


class ParsedQuestionDraft(BaseModel):
    """One MCQ extracted from pasted text. `correct_answer` is nullable because the
    source text may not contain an answer key - the teacher must fill it in before
    the draft can be saved."""

    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str | None = Field(default=None, pattern="^[ABCD]$")
    marks: int = 1
    topic: str | None = None
