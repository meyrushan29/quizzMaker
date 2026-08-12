import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-slate-50 to-emerald-50 p-6">
      <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Live Quiz Platform</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">QuizzMaker</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Run live quizzes for your Grade 10-11 Science class, track every student's progress in real time, and turn each
          quiz into clear performance data.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link to="/teacher/login" className="rounded-2xl bg-indigo-600 px-6 py-6 text-white shadow transition hover:bg-indigo-700">
            <p className="text-lg font-semibold">Teacher Login</p>
            <p className="mt-1 text-sm text-indigo-100">Create quizzes, run live sessions, review analytics.</p>
          </Link>
          <Link to="/student" className="rounded-2xl border border-slate-200 bg-white px-6 py-6 text-slate-900 shadow transition hover:bg-slate-50">
            <p className="text-lg font-semibold">Student Login</p>
            <p className="mt-1 text-sm text-slate-500">Join a live quiz with your Student ID and name.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
