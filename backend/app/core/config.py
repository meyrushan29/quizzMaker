from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "QuizzMaker"

    # Default to a local SQLite database (via aiosqlite) so the app runs out of
    # the box without a PostgreSQL server. Point DATABASE_URL at a Postgres
    # instance (e.g. postgresql+asyncpg://user:pass@host/db) for production -
    # the code contains no SQLite-specific logic.
    database_url: str = "sqlite+aiosqlite:///./quizzmaker.db"

    secret_key: str = "dev-secret-key-change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    student_token_expire_minutes: int = 60 * 6

    allow_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    default_passing_percentage: int = 50
    at_risk_threshold_percentage: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
