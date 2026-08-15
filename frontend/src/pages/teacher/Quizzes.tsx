import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Copy, FileText, PlusCircle, Trash2 } from "lucide-react"
import { api, ApiError } from "../../lib/api"
import type { Quiz } from "../../lib/types"
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBanner, PageHeader, Spinner, Table } from "../../components/ui"

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/quizzes/${deleteTarget.id}`)
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
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
            <Button>
              <PlusCircle className="h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "draft", "live_lobby", "live_active", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              statusFilter === s ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300"
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
        <EmptyState title="No quizzes found" description="Create your first quiz to get started." icon={<FileText className="h-5 w-5" />} />
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
              <tr key={quiz.id} className="transition-colors hover:bg-slate-50">
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
                    <button onClick={() => handleStart(quiz)} className="text-sm font-medium text-emerald-600 hover:underline">
                      Start Live
                    </button>
                  )}
                  {(quiz.status === "live_lobby" || quiz.status === "live_active") && (
                    <Link to={`/teacher/live/${quiz.id}`} className="text-sm font-medium text-emerald-600 hover:underline">
                      Monitor
                    </Link>
                  )}
                  {quiz.status === "completed" && (
                    <Link to={`/teacher/results/${quiz.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                      Results
                    </Link>
                  )}
                  <button onClick={() => handleDuplicate(quiz)} className="inline-flex items-center gap-1 rounded-lg p-1.5 align-middle text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Duplicate ${quiz.title}`}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(quiz)} className="inline-flex items-center gap-1 rounded-lg p-1.5 align-middle text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${quiz.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete quiz?"
        description={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        busy={deleting}
      />
    </div>
  )
}
