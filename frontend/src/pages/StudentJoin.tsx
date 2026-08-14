import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"
import { api, ApiError } from "../lib/api"
import { Button, Field, inputClass } from "../components/ui"

export default function StudentJoin() {
  const [mode, setMode] = useState<"quick" | "roster">("quick")

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-slate-900">Student Login</h1>

        <div className="mt-5 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`flex-1 rounded-lg py-2 transition ${mode === "quick" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
          >
            Join a Quiz
          </button>
          <button
            type="button"
            onClick={() => setMode("roster")}
            className={`flex-1 rounded-lg py-2 transition ${mode === "roster" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
          >
            Student ID Login
          </button>
        </div>

        {mode === "quick" ? <QuickJoinForm /> : <RosterLoginForm />}

        <Link to="/" className="mt-4 block text-sm text-slate-400 hover:underline">
          Back home
        </Link>
      </div>
    </div>
  )
}

function QuickJoinForm() {
  const [quizCode, setQuizCode] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { quickJoin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!quizCode.trim() || !name.trim()) {
      setError("Please complete all fields.")
      return
    }
    setLoading(true)
    try {
      const code = quizCode.trim().toUpperCase()
      await quickJoin(code, name.trim())
      const res = await api.post<{ session_id: number }>("/api/live/join", { quiz_code: code }, "student")
      localStorage.setItem("student_session_id", String(res.session_id))
      navigate(`/student/quiz/${res.session_id}`)
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <p className="mt-4 text-sm text-slate-500">Enter the quiz code your teacher shared and your name to join instantly.</p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <Field label="Quiz Code">
          <input
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
            className={`${inputClass} text-center font-mono text-lg tracking-widest`}
            placeholder="SCI742"
          />
        </Field>
        <Field label="Your Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Kavin Raj" />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="success" className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Join Quiz"}
        </Button>
      </form>
    </>
  )
}

function RosterLoginForm() {
  const [studentId, setStudentId] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { studentLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!studentId.trim() || !name.trim()) {
      setError("Please complete all fields.")
      return
    }
    setLoading(true)
    try {
      await studentLogin(studentId.trim(), name.trim())
      navigate("/student/app")
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <p className="mt-4 text-sm text-slate-500">Enter the Student ID and name your teacher gave you.</p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <Field label="Student ID">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputClass}
            placeholder="STU001"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Student Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Kavin Raj" />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="success" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </>
  )
}
