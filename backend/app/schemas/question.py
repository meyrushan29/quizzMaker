from pydantic import BaseModel, Field


class QuestionBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(pattern="^[ABCD]$")
    marks: int = 1
    topic: str | None = None
    difficulty: str | None = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question_text: str | None = None
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_answer: str | None = Field(default=None, pattern="^[ABCD]$")
    marks: int | None = None
    topic: str | None = None
    difficulty: str | None = None


class QuestionRead(QuestionBase):
    id: int
    quiz_id: int
    order_index: int

    class Config:
        from_attributes = True


class QuestionReorder(BaseModel):
    order: list[int]
