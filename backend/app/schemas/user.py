from pydantic import BaseModel, EmailStr

from .common import UTCDateTime


class UserBase(BaseModel):
    email: EmailStr
    role: str


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: UTCDateTime

    class Config:
        from_attributes = True
