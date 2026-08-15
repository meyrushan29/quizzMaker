import { Link } from "react-router-dom"
import { ArrowRight, GraduationCap, Presentation } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-slate-50 to-emerald-50 p-6">
      <div className="mx-auto w-full max-w-4xl animate-scale-in rounded-3xl border border-slate-200/60 bg-white p-8 shadow-soft-lg sm:p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-display text-base font-bold text-white shadow-sm">
            Q
          </div>
          <span className="font-display text-base font-bold text-slate-900">QuizzMaker</span>
        </div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-indigo-600">Live Quiz Platform</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-900">Real-time quizzes, real insight</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Run live quizzes for your Grade 10-11 Science class, track every student's progress in real time, and turn each
          quiz into clear performance data.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/teacher/login"
            className="group flex items-start gap-4 rounded-2xl bg-indigo-600 px-6 py-6 text-white shadow-soft transition hover:bg-indigo-700 hover:shadow-soft-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Presentation className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Teacher Login</p>
              <p className="mt-1 text-sm text-indigo-100">Create quizzes, run live sessions, review analytics.</p>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
          <Link
            to="/student"
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 text-slate-900 shadow-soft transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-soft-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Student Login</p>
              <p className="mt-1 text-sm text-slate-500">Join a live quiz with your Student ID and name.</p>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        </div>
      </div>
    </div>
  )
}
