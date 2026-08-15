import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Hash, Radio } from "lucide-react"
import { api, ApiError } from "../../lib/api"
import { Button, Card, EmptyState, ErrorBanner, Field, IconInput, PageHeader, Spinner } from "../../components/ui"

interface AvailableQuiz {
  id: number
  title: string
  subject: string
  chapter: string | null
  quiz_code: string
  status: string
  duration: number
}

export default function StudentHome() {
  const [available, setAvailable] = useState<AvailableQuiz[] | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [joining, setJoining] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get<AvailableQuiz[]>("/api/live/quizzes/available", "student")
      .then(setAvailable)
      .catch(() => setAvailable([]))
  }, [])

  async function handleJoin(quizCode: string) {
    setError("")
    setJoining(true)
    try {
      const res = await api.post<{ session_id: number }>("/api/live/join", { quiz_code: quizCode }, "student")
      localStorage.setItem("student_session_id", String(res.session_id))
      navigate(`/student/quiz/${res.session_id}`)
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Unable to join quiz.")
    } finally {
      setJoining(false)
    }
  }

  function handleSubmitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim()) handleJoin(code.trim().toUpperCase())
  }

  return (
    <div>
      <PageHeader title="My Quizzes" subtitle="Join a live quiz using the code your teacher shares in class." />

      <Card className="mb-6">
        <h3 className="font-display text-sm font-semibold text-slate-900">Join with a Quiz Code</h3>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={handleSubmitCode}>
          <Field label="Quiz Code">
            <IconInput
              icon={<Hash className="h-4 w-4" />}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-48 text-center font-mono text-lg tracking-widest"
              placeholder="SCI742"
            />
          </Field>
          <Button type="submit" variant="success" loading={joining}>
            {joining ? "Joining..." : "Join Quiz"}
          </Button>
        </form>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} />
          </div>
        )}
      </Card>

      <h3 className="mb-3 font-display text-sm font-semibold text-slate-900">Available Live Quizzes</h3>
      {!available ? (
        <Spinner />
      ) : available.length === 0 ? (
        <EmptyState
          title="No live quizzes right now"
          description="Ask your teacher to start a quiz, then refresh this page."
          icon={<Radio className="h-5 w-5" />}
        />
      ) : (
        <div className="grid animate-slide-up gap-4 sm:grid-cols-2">
          {available.map((quiz) => (
            <Card key={quiz.id} interactive>
              <p className="font-semibold text-slate-900">{quiz.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {quiz.subject} {quiz.chapter && `· ${quiz.chapter}`} · {quiz.duration} min
              </p>
              <Button className="mt-3" onClick={() => handleJoin(quiz.quiz_code)} disabled={joining}>
                Join Now
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
