from pydantic import BaseModel

from .common import UTCDateTime


class StudentBase(BaseModel):
    student_id: str
    name: str
    grade: str | None = None
    class_name: str | None = None
    subject: str | None = None
    status: str | None = "active"


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = None
    grade: str | None = None
    class_name: str | None = None
    subject: str | None = None
    status: str | None = None


class StudentRead(StudentBase):
    id: int
    created_at: UTCDateTime

    class Config:
        from_attributes = True
