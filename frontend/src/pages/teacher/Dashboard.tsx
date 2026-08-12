import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, ApiError } from "../../lib/api"
import type { DashboardStats } from "../../lib/types"
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner, StatCard, Table } from "../../components/ui"

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .get<DashboardStats>("/api/analytics/dashboard")
      .then(setStats)
      .catch((exc) => setError(exc instanceof ApiError ? exc.message : "Failed to load dashboard"))
  }, [])

  if (error) return <ErrorBanner message={error} />
  if (!stats) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your classes, quizzes and results."
        actions={
          <>
            <Link to="/teacher/quizzes/new">
              <Button>Create Quiz</Button>
            </Link>
            <Link to="/teacher/live">
              <Button variant="success">Start Live Quiz</Button>
            </Link>
            <Link to="/teacher/students">
              <Button variant="secondary">Manage Students</Button>
            </Link>
            <Link to="/teacher/results">
              <Button variant="secondary">View Results</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Students" value={stats.total_students} />
        <StatCard label="Total Quizzes" value={stats.total_quizzes} />
        <StatCard label="Completed Quizzes" value={stats.completed_quizzes} />
        <StatCard label="Average Score" value={`${stats.average_class_score}%`} />
        <StatCard label="Highest Score" value={`${stats.highest_score}%`} tone="good" />
        <StatCard label="Lowest Score" value={`${stats.lowest_score}%`} tone="bad" />
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Recent Quizzes</h2>
        {stats.recent_quizzes.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No quizzes yet" description="Create your first quiz to get started." />
          </div>
        ) : (
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Average Score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link to={`/teacher/results/${quiz.id}`} className="hover:text-indigo-600">
                        {quiz.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(quiz.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500">{quiz.questions}</td>
                    <td className="px-4 py-3 text-slate-500">{quiz.students}</td>
                    <td className="px-4 py-3 text-slate-500">{quiz.average_score !== null ? `${quiz.average_score}%` : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge status={quiz.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
