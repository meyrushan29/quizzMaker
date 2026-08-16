from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .db import engine, AsyncSessionLocal
from .models import Base
from .routers import analytics, auth, live, question_bank, questions, quizzes, reports, settings as settings_router, students, users, ws

settings = get_settings()

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _add_bank_question_id_column(conn) -> None:
    # create_all() only creates missing tables, not missing columns on tables that
    # already exist - needed so existing dev/prod databases pick up the new
    # questions.bank_question_id column added for the question-bank "already added"
    # feature without requiring a full migration tool.
    if conn.dialect.name == "sqlite":
        result = await conn.exec_driver_sql("PRAGMA table_info(questions)")
        columns = [row[1] for row in result.fetchall()]
        if "bank_question_id" not in columns:
            await conn.exec_driver_sql("ALTER TABLE questions ADD COLUMN bank_question_id INTEGER REFERENCES question_bank(id)")
    else:
        await conn.exec_driver_sql(
            "ALTER TABLE questions ADD COLUMN IF NOT EXISTS bank_question_id INTEGER REFERENCES question_bank(id)"
        )


@app.on_event("startup")
async def startup_event() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _add_bank_question_id_column(conn)

    if settings.seed_demo_data:
        async with AsyncSessionLocal() as session:
            from .seed import seed_demo_data

            await seed_demo_data(session)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(questions.router, prefix="/api/quizzes", tags=["questions"])
app.include_router(question_bank.router, prefix="/api/question-bank", tags=["question-bank"])
app.include_router(live.router, prefix="/api/live", tags=["live"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
app.include_router(ws.router, tags=["websocket"])
