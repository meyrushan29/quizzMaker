from pydantic import BaseModel

from .common import OptionalUTCDateTime, UTCDateTime
from .question import QuestionRead


class QuizBase(BaseModel):
    title: str
    subject: str
    grade: str
    chapter: str | None = None
    description: str | None = None
    duration: int = 20
    passing_percentage: int = 50
    randomize_questions: bool = False
    randomize_options: bool = False
    show_result_immediately: bool = True
    allow_retake: bool = False
    allow_late_join: bool = False
    leaderboard_visible: bool = False


class QuizCreate(QuizBase):
    pass


class QuizUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    grade: str | None = None
    chapter: str | None = None
    description: str | None = None
    duration: int | None = None
    passing_percentage: int | None = None
    randomize_questions: bool | None = None
    randomize_options: bool | None = None
    show_result_immediately: bool | None = None
    allow_retake: bool | None = None
    allow_late_join: bool | None = None
    leaderboard_visible: bool | None = None


class QuizRead(QuizBase):
    id: int
    total_marks: int
    quiz_code: str | None
    status: str
    started_at: OptionalUTCDateTime
    ends_at: OptionalUTCDateTime
    created_by: int
    created_at: UTCDateTime
    question_count: int = 0

    class Config:
        from_attributes = True


class QuizDetail(QuizRead):
    questions: list[QuestionRead] = []


class QuizStartResponse(BaseModel):
    quiz_id: int
    quiz_code: str
    status: str
