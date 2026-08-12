from pydantic import BaseModel, Field

from .common import OptionalUTCDateTime


class JoinQuizRequest(BaseModel):
    quiz_code: str


class JoinQuizResponse(BaseModel):
    session_id: int
    quiz_id: int
    quiz_title: str
    quiz_status: str
    session_status: str
    duration: int
    total_questions: int
    ends_at: OptionalUTCDateTime


class AnswerSubmitRequest(BaseModel):
    question_id: int
    selected_answer: str = Field(pattern="^[ABCD]$")


class QuestionOption(BaseModel):
    key: str
    text: str


class StudentQuestionView(BaseModel):
    id: int
    question_text: str
    marks: int
    options: list[QuestionOption]
    selected_answer: str | None


class SessionStateResponse(BaseModel):
    session_id: int
    quiz_id: int
    quiz_title: str
    quiz_code: str | None
    quiz_status: str
    session_status: str
    duration: int
    ends_at: OptionalUTCDateTime
    current_index: int
    questions: list[StudentQuestionView] = []


class ResultResponse(BaseModel):
    session_id: int
    student_name: str
    student_id: str
    quiz_title: str
    score: int
    total_marks: int
    percentage: int
    correct: int
    wrong: int
    unanswered: int
    time_taken_seconds: int | None
    performance_message: str
    passed: bool
