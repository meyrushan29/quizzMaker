import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { api } from "../../lib/api"
import type { HistoryEntry } from "../../lib/types"
import { Card, EmptyState, PageHeader, Spinner, Table } from "../../components/ui"

export default function StudentHistory() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<HistoryEntry[]>("/api/live/history", "student").then(setHistory)
  }, [])

  if (!history) return <Spinner />

  const chartData = history.map((h, i) => ({ name: `Quiz ${i + 1}`, percentage: h.percentage, title: h.quiz_title }))
  const average = history.length ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length) : 0

  return (
    <div>
      <PageHeader title="My Quiz History" subtitle="Every quiz you've completed and how you performed." />

      {history.length === 0 ? (
        <EmptyState title="No quizzes completed yet" description="Join a live quiz to see your results here." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs uppercase text-slate-500">Quizzes Taken</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{history.length}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Average Score</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{average}%</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Best Score</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">{Math.max(...history.map((h) => h.percentage))}%</p>
            </Card>
          </div>

          <Card className="mb-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} labelFormatter={(_, p) => p?.[0]?.payload?.title || ""} />
                <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Table>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h, i) => (
                <tr
                  key={i}
                  onClick={() => navigate(`/student/result/${h.session_id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{h.quiz_title}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(h.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {h.score}/{h.total_marks}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{h.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  )
}
