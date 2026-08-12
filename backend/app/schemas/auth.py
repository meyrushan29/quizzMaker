from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StudentLoginRequest(BaseModel):
    student_id: str
    name: str


class StudentToken(BaseModel):
    access_token: str
    token_type: str
    role: str
    student_id: str
    name: str
    id: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
