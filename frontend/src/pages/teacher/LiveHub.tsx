import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Radio } from "lucide-react"
import { api } from "../../lib/api"
import type { Quiz } from "../../lib/types"
import { Badge, Card, EmptyState, PageHeader, Spinner } from "../../components/ui"

export default function LiveHub() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Quiz[]>("/api/quizzes/?status=draft"),
      api.get<Quiz[]>("/api/quizzes/?status=live_lobby"),
      api.get<Quiz[]>("/api/quizzes/?status=live_active"),
    ]).then(([draft, lobby, active]) => setQuizzes([...active, ...lobby, ...draft]))
  }, [])

  if (!quizzes) return <Spinner />

  return (
    <div>
      <PageHeader title="Live Quiz" subtitle="Start a draft quiz live, or jump back into one already running." />
      {quizzes.length === 0 ? (
        <EmptyState title="No quizzes ready to go live" description="Create a quiz with questions first." icon={<Radio className="h-5 w-5" />} />
      ) : (
        <div className="grid animate-slide-up gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} to={`/teacher/live/${quiz.id}`}>
              <Card interactive className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{quiz.title}</p>
                  <Badge status={quiz.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {quiz.chapter} &middot; {quiz.question_count} questions &middot; {quiz.duration} min
                </p>
                {quiz.quiz_code && <p className="mt-3 font-mono text-sm text-indigo-600">Code: {quiz.quiz_code}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
