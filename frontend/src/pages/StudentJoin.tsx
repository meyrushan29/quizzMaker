import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Hash, IdCard, User } from "lucide-react"
import { useAuth } from "../lib/auth"
import { api, ApiError } from "../lib/api"
import { AuthCard, Button, ErrorBanner, Field, IconInput } from "../components/ui"

export default function StudentJoin() {
  const [mode, setMode] = useState<"quick" | "roster">("quick")

  return (
    <AuthCard title="Student Login" subtitle="Join a live quiz or sign in with your Student ID.">
      <div className="mt-5 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`flex-1 rounded-lg py-2 transition-colors ${mode === "quick" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          Join a Quiz
        </button>
        <button
          type="button"
          onClick={() => setMode("roster")}
          className={`flex-1 rounded-lg py-2 transition-colors ${mode === "roster" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          Student ID Login
        </button>
      </div>

      {mode === "quick" ? <QuickJoinForm /> : <RosterLoginForm />}

      <Link to="/" className="mt-4 block text-sm text-slate-400 hover:underline">
        Back home
      </Link>
    </AuthCard>
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
          <IconInput
            icon={<Hash className="h-4 w-4" />}
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
            className="text-center font-mono text-lg tracking-widest"
            placeholder="SCI742"
          />
        </Field>
        <Field label="Your Name">
          <IconInput icon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavin Raj" />
        </Field>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" variant="success" className="w-full" loading={loading}>
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
          <IconInput
            icon={<IdCard className="h-4 w-4" />}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="STU001"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Student Name">
          <IconInput icon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavin Raj" />
        </Field>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" variant="success" className="w-full" loading={loading}>
          {loading ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </>
  )
}
