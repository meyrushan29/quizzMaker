from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "QuizzMaker"

    # Default to a local SQLite database (via aiosqlite) so the app runs out of
    # the box without a PostgreSQL server. Point DATABASE_URL at a Postgres
    # instance for production - the code contains no SQLite-specific logic.
    database_url: str = "sqlite+aiosqlite:///./quizzmaker.db"

    secret_key: str = "dev-secret-key-change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    student_token_expire_minutes: int = 60 * 6

    allow_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Creates the teacher@example.com / Password123! demo account + sample quizzes on
    # first boot. Keep this True for local dev, but set SEED_DEMO_DATA=false in production
    # (e.g. Railway) so a publicly-known login isn't created against real data.
    seed_demo_data: bool = True

    default_passing_percentage: int = 50
    at_risk_threshold_percentage: int = 50

    # Used by services/mcq_parser.py to parse pasted MCQ text via Google's free-tier
    # Gemini API (get a key at aistudio.google.com). Leave empty in environments that
    # don't need the paste-to-MCQ feature.
    gemini_api_key: str = ""

    @field_validator("database_url", mode="before")
    @classmethod
    def _use_asyncpg_driver(cls, value: str) -> str:
        # Managed Postgres providers (Render, Heroku, ...) hand out
        # "postgres://" or "postgresql://" URLs, but SQLAlchemy's async engine
        # needs the asyncpg driver spelled out explicitly.
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            return "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value

    @field_validator("allow_origins", mode="before")
    @classmethod
    def _split_comma_separated_origins(cls, value: str | list[str]) -> str | list[str]:
        # Lets ALLOW_ORIGINS be set as a plain comma-separated string in
        # dashboards (Render, etc.) instead of requiring JSON-array syntax.
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
