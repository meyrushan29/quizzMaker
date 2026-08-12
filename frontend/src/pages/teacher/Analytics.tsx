import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { api } from "../../lib/api"
import type { Overview } from "../../lib/types"
import { Card, EmptyState, PageHeader, Spinner, StatCard, Table } from "../../components/ui"

const TREND_TONE: Record<string, string> = {
  Improving: "text-emerald-600",
  Declining: "text-rose-600",
  Stable: "text-slate-500",
}

export default function Analytics() {
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    api.get<Overview>("/api/analytics/overview").then(setData)
  }, [])

  if (!data) return <Spinner />

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Cross-quiz performance, weak topics, and students who need support." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Average Score" value={`${data.average_score}%`} />
        <StatCard label="Pass Rate" value={`${data.pass_rate}%`} tone="good" />
        <StatCard label="Students Needing Attention" value={data.students_needing_attention} tone={data.students_needing_attention > 0 ? "bad" : "default"} />
      </div>

      <Card className="mt-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Topic Performance</h3>
        {data.topic_performance.length === 0 ? (
          <EmptyState title="No data yet" description="Topic performance appears once quizzes are completed." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.topic_performance.length * 40)}>
            <BarChart data={data.topic_performance} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 12 }} width={110} />
              <Tooltip formatter={(value: number) => [`${value}%`, "Accuracy"]} />
              <Bar dataKey="accuracy" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Student Performance</h3>
        {data.student_performance.length === 0 ? (
          <p className="text-sm text-slate-400">No completed quizzes yet.</p>
        ) : (
          <Table>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Average</th>
                <th className="px-4 py-3">Highest</th>
                <th className="px-4 py-3">Lowest</th>
                <th className="px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.student_performance.map((s) => (
                <tr key={s.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.name} <span className="text-xs text-slate-400">{s.student_id}</span>
                  </td>
                  <td className="px-4 py-3">{s.average}%</td>
                  <td className="px-4 py-3 text-emerald-600">{s.highest}%</td>
                  <td className="px-4 py-3 text-rose-600">{s.lowest}%</td>
                  <td className={`px-4 py-3 font-medium ${TREND_TONE[s.trend] || "text-slate-500"}`}>{s.trend}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {data.at_risk_students.length > 0 && (
        <Card className="mt-6 border-rose-200 bg-rose-50">
          <h3 className="mb-2 text-sm font-semibold text-rose-700">Students Below {data.at_risk_threshold}%</h3>
          <ul className="space-y-1 text-sm text-rose-700">
            {data.at_risk_students.map((s) => (
              <li key={s.student_id}>
                {s.name} ({s.student_id}) &middot; {s.average}% average
              </li>
            ))}
          </ul>
          <Link to="/teacher/students" className="mt-3 inline-block text-sm font-medium text-rose-700 hover:underline">
            Review students &rarr;
          </Link>
        </Card>
      )}
    </div>
  )
}
