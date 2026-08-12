import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api, ApiError } from "../../lib/api"
import type { MonitorState, Quiz } from "../../lib/types"
import { useAuth } from "../../lib/auth"
import { useLiveSocket } from "../../lib/useLiveSocket"
import { Badge, Button, Card, ErrorBanner, PageHeader, Spinner, Table } from "../../components/ui"

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) {
      setRemaining(null)
      return
    }
    const end = new Date(endsAt).getTime()
    const tick = () => setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endsAt])
  return remaining
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function LiveControl() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { teacher } = useAuth()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [monitor, setMonitor] = useState<MonitorState | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const loadQuiz = useCallback(async () => {
    if (!quizId) return
    try {
      const data = await api.get<Quiz>(`/api/quizzes/${quizId}`)
      setQuiz(data)
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load quiz")
    }
  }, [quizId])

  const loadMonitor = useCallback(async () => {
    if (!quizId) return
    try {
      const data = await api.get<MonitorState>(`/api/quizzes/${quizId}/monitor`)
      setMonitor(data)
    } catch {
      // transient errors are fine, the next poll will retry
    }
  }, [quizId])

  useEffect(() => {
    loadQuiz()
  }, [loadQuiz])

  useEffect(() => {
    if (!quiz || quiz.status === "draft") return
    loadMonitor()
    const interval = setInterval(loadMonitor, 3000)
    return () => clearInterval(interval)
  }, [quiz, loadMonitor])

  useLiveSocket(quiz?.quiz_code, "teacher", teacher?.token, () => {
    loadMonitor()
  })

  const remaining = useCountdown(quiz?.status === "live_active" ? quiz.ends_at : null)

  useEffect(() => {
    if (remaining === 0) {
      loadQuiz()
      loadMonitor()
    }
  }, [remaining, loadQuiz, loadMonitor])

  async function handleStart() {
    if (!quizId) return
    setBusy(true)
    setError("")
    try {
      await api.post(`/api/quizzes/${quizId}/start`)
      await loadQuiz()
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to start quiz")
    } finally {
      setBusy(false)
    }
  }

  async function handleBegin() {
    if (!quizId) return
    setBusy(true)
    setError("")
    try {
      await api.post(`/api/quizzes/${quizId}/begin`)
      await loadQuiz()
      await loadMonitor()
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to start quiz")
    } finally {
      setBusy(false)
    }
  }

  async function handleEnd() {
    if (!quizId || !confirm("End this quiz now? All active students will be auto-submitted.")) return
    setBusy(true)
    setError("")
    try {
      await api.post(`/api/quizzes/${quizId}/end`)
      navigate(`/teacher/results/${quizId}`)
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to end quiz")
    } finally {
      setBusy(false)
    }
  }

  if (!quiz) return <Spinner />

  return (
    <div>
      <PageHeader title={quiz.title} subtitle={`${quiz.chapter || ""} · ${quiz.question_count} questions`} actions={<Badge status={quiz.status} />} />
      {error && <ErrorBanner message={error} />}

      {quiz.status === "draft" && (
        <Card className="text-center">
          <p className="text-slate-600">This quiz hasn't gone live yet.</p>
          <Button className="mt-4" onClick={handleStart} disabled={busy}>
            Start Live Quiz
          </Button>
        </Card>
      )}

      {quiz.status === "live_lobby" && (
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-500">Quiz Code</p>
            <p className="mt-1 text-5xl font-bold tracking-widest text-indigo-600">{quiz.quiz_code}</p>
            <p className="mt-2 text-sm text-slate-400">Students enter this code on the student portal to join.</p>
          </div>

          <div className="mt-8">
            <p className="text-lg font-semibold text-slate-900">{monitor?.joined_count ?? 0} Students Joined</p>
            {monitor && monitor.students.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {monitor.students.map((s) => (
                  <span key={s.session_id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Button variant="success" onClick={handleBegin} disabled={busy || !monitor?.joined_count}>
              START QUIZ
            </Button>
            {!monitor?.joined_count && <p className="mt-2 text-xs text-slate-400">Waiting for at least one student to join...</p>}
          </div>
        </Card>
      )}

      {quiz.status === "live_active" && monitor && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Time Remaining</p>
                <p className="text-3xl font-bold text-slate-900">{remaining !== null ? formatTime(remaining) : "--:--"}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-semibold text-emerald-600">{monitor.completed}</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-blue-600">{monitor.answering}</p>
                  <p className="text-xs text-slate-500">Answering</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-400">{monitor.not_started}</p>
                  <p className="text-xs text-slate-500">Not Started</p>
                </div>
              </div>
              <Button variant="danger" onClick={handleEnd} disabled={busy}>
                End Quiz
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Students ({monitor.joined_count}/{monitor.joined_count})
            </h3>
            <Table>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitor.students.map((s) => (
                  <tr key={s.session_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.answered}/{s.total_questions}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {quiz.status === "completed" && (
        <Card className="text-center">
          <p className="text-slate-600">This quiz has ended.</p>
          <Button className="mt-4" onClick={() => navigate(`/teacher/results/${quiz.id}`)}>
            View Results
          </Button>
        </Card>
      )}
    </div>
  )
}
