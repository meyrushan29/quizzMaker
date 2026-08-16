from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class UserRole(str, PyEnum):
    teacher = "teacher"
    student = "student"


class QuizStatus(str, PyEnum):
    draft = "draft"
    live_lobby = "live_lobby"
    live_active = "live_active"
    completed = "completed"


class SessionStatus(str, PyEnum):
    waiting = "waiting"
    in_progress = "in_progress"
    submitted = "submitted"
    auto_submitted = "auto_submitted"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String(32), nullable=False, default=UserRole.teacher.value)
    preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    quizzes = relationship("Quiz", back_populates="creator")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    grade = Column(String(64), nullable=True)
    class_name = Column(String(64), nullable=True)
    subject = Column(String(128), nullable=True)
    status = Column(String(32), default="active", nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    sessions = relationship("QuizSession", back_populates="student")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(128), nullable=False)
    grade = Column(String(64), nullable=False)
    chapter = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=False, default=20)  # minutes
    total_marks = Column(Integer, nullable=False, default=0)
    passing_percentage = Column(Integer, nullable=False, default=50)

    randomize_questions = Column(Boolean, nullable=False, default=False)
    randomize_options = Column(Boolean, nullable=False, default=False)
    show_result_immediately = Column(Boolean, nullable=False, default=True)
    allow_retake = Column(Boolean, nullable=False, default=False)
    allow_late_join = Column(Boolean, nullable=False, default=False)
    leaderboard_visible = Column(Boolean, nullable=False, default=False)

    quiz_code = Column(String(16), unique=True, nullable=True, index=True)
    status = Column(String(32), nullable=False, default=QuizStatus.draft.value)
    started_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    creator = relationship("User", back_populates="quizzes")
    questions = relationship(
        "Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order_index"
    )
    sessions = relationship("QuizSession", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_answer = Column(String(1), nullable=False)
    marks = Column(Integer, nullable=False, default=1)
    topic = Column(String(128), nullable=True)
    difficulty = Column(String(32), nullable=True)
    # Tracks which question-bank entry this was copied from (add-to-quiz), so the
    # bank can show teachers which quizzes already contain a given question.
    bank_question_id = Column(Integer, ForeignKey("question_bank.id", ondelete="SET NULL"), nullable=True)

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class QuizSession(Base):
    """A single student's attempt at a quiz (join -> in-progress -> submitted)."""

    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    attempt_number = Column(Integer, nullable=False, default=1)
    question_order = Column(JSON, nullable=True)  # list[int] of question ids, persisted for randomization

    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    score = Column(Integer, nullable=True)
    percentage = Column(Integer, nullable=True)
    correct_count = Column(Integer, nullable=True)
    wrong_count = Column(Integer, nullable=True)
    unanswered_count = Column(Integer, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)

    status = Column(String(32), nullable=False, default=SessionStatus.waiting.value)

    quiz = relationship("Quiz", back_populates="sessions")
    student = relationship("Student", back_populates="sessions")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer = Column(String(1), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    answered_at = Column(DateTime, nullable=True)

    session = relationship("QuizSession", back_populates="answers")
    question = relationship("Question", back_populates="answers")


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_answer = Column(String(1), nullable=False)
    marks = Column(Integer, nullable=False, default=1)
    subject = Column(String(128), nullable=True)
    grade = Column(String(64), nullable=True)
    chapter = Column(String(128), nullable=True)
    topic = Column(String(128), nullable=True)
    difficulty = Column(String(32), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    creator = relationship("User")
