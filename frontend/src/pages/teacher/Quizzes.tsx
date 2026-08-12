import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api, ApiError } from "../../lib/api"
import type { Quiz } from "../../lib/types"
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, Spinner, Table } from "../../components/ui"

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const navigate = useNavigate()

  async function load() {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : ""
      setQuizzes(await api.get<Quiz[]>(`/api/quizzes/${query}`))
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load quizzes")
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function handleDuplicate(quiz: Quiz) {
    await api.post(`/api/quizzes/${quiz.id}/duplicate`)
    await load()
  }

  async function handleDelete(quiz: Quiz) {
    if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return
    await api.delete(`/api/quizzes/${quiz.id}`)
    await load()
  }

  async function handleStart(quiz: Quiz) {
    navigate(`/teacher/live/${quiz.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle="Create and manage your quiz library."
        actions={
          <Link to="/teacher/quizzes/new">
            <Button>Create Quiz</Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-2">
        {["", "draft", "live_lobby", "live_active", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!quizzes ? (
        <Spinner />
      ) : quizzes.length === 0 ? (
        <EmptyState title="No quizzes found" description="Create your first quiz to get started." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {quiz.status === "draft" ? (
                    <Link to={`/teacher/quizzes/${quiz.id}`} className="hover:text-indigo-600">
                      {quiz.title}
                    </Link>
                  ) : (
                    quiz.title
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{quiz.chapter}</td>
                <td className="px-4 py-3 text-slate-500">{quiz.question_count}</td>
                <td className="px-4 py-3 text-slate-500">{quiz.duration} min</td>
                <td className="px-4 py-3">
                  <Badge status={quiz.status} />
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  {quiz.status === "draft" && (
                    <button onClick={() => handleStart(quiz)} className="text-sm text-emerald-600 hover:underline">
                      Start Live
                    </button>
                  )}
                  {(quiz.status === "live_lobby" || quiz.status === "live_active") && (
                    <Link to={`/teacher/live/${quiz.id}`} className="text-sm text-emerald-600 hover:underline">
                      Monitor
                    </Link>
                  )}
                  {quiz.status === "completed" && (
                    <Link to={`/teacher/results/${quiz.id}`} className="text-sm text-indigo-600 hover:underline">
                      Results
                    </Link>
                  )}
                  <button onClick={() => handleDuplicate(quiz)} className="text-sm text-slate-500 hover:underline">
                    Duplicate
                  </button>
                  <button onClick={() => handleDelete(quiz)} className="text-sm text-rose-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
