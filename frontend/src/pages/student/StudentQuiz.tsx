import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Check, Clock, WifiOff } from "lucide-react"
import { api, ApiError } from "../../lib/api"
import type { SessionState } from "../../lib/types"
import { useAuth } from "../../lib/auth"
import { useLiveSocket } from "../../lib/useLiveSocket"
import { Button, Card, ConfirmDialog, ErrorBanner, Spinner } from "../../components/ui"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function StudentQuiz() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { student } = useAuth()

  const [session, setSession] = useState<SessionState | null>(null)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const submittedRef = useRef(false)

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await api.get<SessionState>(`/api/live/session/${sessionId}`, "student")
      setSession(data)
      if (data.session_status === "in_progress") {
        setIndex((prev) => Math.min(prev, Math.max(data.questions.length - 1, 0)))
      }
      if (data.session_status === "submitted" || data.session_status === "auto_submitted") {
        navigate(`/student/result/${sessionId}`, { replace: true })
      }
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load quiz session")
    }
  }, [sessionId, navigate])

  useEffect(() => {
    loadSession()
    const interval = setInterval(loadSession, 5000)
    return () => clearInterval(interval)
  }, [loadSession])

  useEffect(() => {
    function goOnline() {
      setOnline(true)
    }
    function goOffline() {
      setOnline(false)
    }
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  // Push channel for instant "quiz started" / "quiz ended" updates; the 5s
  // poll above is the fallback in case a socket message is missed.
  useLiveSocket(session?.quiz_code, "student", student?.token, () => {
    loadSession()
  })

  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!session?.ends_at) {
      setRemaining(null)
      return
    }
    const end = new Date(session.ends_at).getTime()
    const tick = () => setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [session?.ends_at])

  const handleSubmit = useCallback(async () => {
    if (!sessionId || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      await api.post(`/api/live/session/${sessionId}/submit`, undefined, "student")
    } catch {
      // even on error (e.g. already auto-submitted server-side), fall through to results
    } finally {
      navigate(`/student/result/${sessionId}`, { replace: true })
    }
  }, [sessionId, navigate])

  useEffect(() => {
    if (remaining === 0 && session?.session_status === "in_progress") {
      handleSubmit()
    }
  }, [remaining, session, handleSubmit])

  async function handleSelect(questionId: number, letter: string) {
    if (!sessionId || !session) return
    setSession({
      ...session,
      questions: session.questions.map((q) => (q.id === questionId ? { ...q, selected_answer: letter } : q)),
    })
    try {
      await api.post(`/api/live/session/${sessionId}/answer`, { question_id: questionId, selected_answer: letter }, "student")
    } catch (exc) {
      if (exc instanceof ApiError && exc.status === 410) {
        handleSubmit()
      }
    }
  }

  if (error) return <ErrorBanner message={error} />
  if (!session) return <Spinner />

  if (session.session_status === "waiting") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md animate-scale-in text-center">
          <p className="text-sm text-slate-500">{session.quiz_title}</p>
          <div className="mx-auto mt-4 flex h-3 w-3 items-center justify-center">
            <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-500" />
          </div>
          <p className="mt-3 text-lg font-medium text-slate-700">Waiting for teacher to start the quiz...</p>
          <p className="mt-2 text-xs text-slate-400">Keep this page open. The quiz will begin automatically.</p>
        </Card>
      </div>
    )
  }

  const question = session.questions[index]
  const answeredCount = session.questions.filter((q) => q.selected_answer).length

  return (
    <div className="mx-auto max-w-2xl">
      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <WifiOff className="h-4 w-4 shrink-0" />
          Internet connection lost. Your answers are saved as soon as you're back online.
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Question {index + 1} of {session.questions.length}
          </p>
          <p className="text-xs text-slate-400">{answeredCount} answered</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-lg font-bold transition-colors ${remaining !== null && remaining < 60 ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}
        >
          <Clock className="h-4 w-4" />
          {remaining !== null ? formatTime(remaining) : "--:--"}
        </div>
      </div>

      <div className="mb-4 h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-indigo-600 transition-all"
          style={{ width: `${((index + 1) / session.questions.length) * 100}%` }}
        />
      </div>

      {question && (
        <Card className="animate-fade-in">
          <p className="text-lg font-medium text-slate-900">{question.question_text}</p>
          <div className="mt-5 space-y-3">
            {question.options.map((option) => (
              <button
                key={option.key}
                onClick={() => handleSelect(question.id, option.key)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base transition-colors ${
                  question.selected_answer === option.key
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    question.selected_answer === option.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {question.selected_answer === option.key ? <Check className="h-4 w-4" /> : option.key}
                </span>
                {option.text}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Previous
        </Button>
        {index < session.questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}>Next</Button>
        ) : (
          <Button
            variant="success"
            loading={submitting}
            onClick={() => {
              if (answeredCount < session.questions.length) {
                setConfirmSubmit(true)
                return
              }
              handleSubmit()
            }}
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {session.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setIndex(i)}
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
              i === index ? "bg-indigo-600 text-white" : q.selected_answer ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => {
          setConfirmSubmit(false)
          handleSubmit()
        }}
        title="Submit with unanswered questions?"
        description={`You've answered ${answeredCount}/${session.questions.length} questions. Once submitted, you can't change your answers.`}
        confirmLabel="Submit Anyway"
        variant="success"
      />
    </div>
  )
}
