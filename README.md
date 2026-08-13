# QuizzMaker

Live Quiz & Student Performance Analysis platform for teachers running online/live classes
(built for Grade 10-11 O/L Science, flexible for other subjects/grades).

- **Backend:** Python, FastAPI, SQLAlchemy (async), JWT auth, WebSockets
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Database:** SQLite by default (zero setup), swap in PostgreSQL via one env var for production

## Demo Login

- **Teacher:** `teacher@example.com` / `Password123!`
- **Student:** Student ID `STU001` / Name `Kavin Raj` (or `STU002`.."STU010", see `backend/app/seed.py`)

Seed data includes 10 students and 3 quizzes (2 completed with real graded results across
multiple students, 1 left in `draft` so you can walk through the full "Start Live Quiz" flow
yourself).

## Backend Setup

1. Install Python 3.11+.
2. Create a virtual environment and install dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt
```

3. (Optional) Point at PostgreSQL instead of the default local SQLite file by creating
   `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/quizzmaker
SECRET_KEY=change-me-in-production
```

4. Run the backend (tables + demo seed data are created automatically on first boot):

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

## Frontend Setup

1. Install Node.js 20+.
2. Install dependencies and run the dev server:

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Android App (Capacitor)

The `frontend/android` project wraps the live Vercel deployment in a native shell
(`capacitor.config.ts` points `server.url` at production, so it loads the live site
rather than a bundled copy - frontend updates ship instantly without a new Play
Store release).

```powershell
cd frontend
npx cap sync android   # after changing capacitor.config.ts or native plugins
cd android
./gradlew assembleDebug
```

Debug APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
Requires a `frontend/android/local.properties` with `sdk.dir` pointing at your
Android SDK (gitignored, machine-specific).

## What's Implemented

- Teacher auth (JWT) + student auth (Student ID + name, no password) with rate limiting
- Teacher dashboard, student management (CRUD + CSV import), quiz builder, question bank
- Live quiz workflow: generate quiz code -> waiting room -> start -> real-time answering ->
  submit -> results, all pushed over WebSockets with REST as the source of truth
- Server-authoritative timer: quiz deadline is a shared UTC timestamp; the server auto-submits
  every in-progress attempt when time is up (background task) and re-validates on every answer/
  submit call, so a student can never out-run the clock from the browser
- Automatic scoring, per-question and per-topic breakdowns, class analysis (average/median/pass
  rate/score distribution), student ranking, individual student trend + weak-topic detection,
  cross-quiz analytics with an at-risk student list
- CSV/Excel export for class, question, topic and student reports
- Reconnect-safe sessions: refreshing the browser (student or teacher) restores state from the
  server rather than losing progress

## Project Structure

```
backend/app/
  core/        settings, JWT + password hashing, auth dependencies, rate limiting
  models.py    SQLAlchemy models (users, students, quizzes, questions, sessions, answers, ...)
  routers/     REST endpoints, grouped by resource
  schemas/     Pydantic request/response models
  services/    business logic (scoring, live-quiz lifecycle, analytics, exports)
  seed.py      demo data

frontend/src/
  pages/teacher/   dashboard, students, quizzes, question bank, live control, results, ...
  pages/student/   join, live quiz, result, history
  layouts/         sidebar/nav shells for each portal
  lib/             API client, auth context, shared types, WebSocket hook
```
