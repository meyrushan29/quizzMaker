import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { api, downloadReport } from "../../lib/api"
import type { StudentAnalysis as StudentAnalysisData } from "../../lib/types"
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from "../../components/ui"

const TREND_TONE: Record<string, string> = {
  Improving: "text-emerald-600",
  Declining: "text-rose-600",
  Stable: "text-slate-600",
  "No data": "text-slate-400",
}

export default function StudentAnalysis() {
  const { id } = useParams()
  const [data, setData] = useState<StudentAnalysisData | null>(null)

  useEffect(() => {
    if (id) api.get<StudentAnalysisData>(`/api/analytics/students/${id}`).then(setData)
  }, [id])

  if (!data) return <Spinner />

  const chartData = data.trend.map((t, i) => ({ name: `Quiz ${i + 1}`, percentage: t.percentage, title: t.quiz_title }))

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={`Student ID: ${data.student_id}`}
        actions={
          <Button variant="secondary" onClick={() => downloadReport(`/api/reports/students/${id}?format=csv`, `student_report_${data.student_id}.csv`)}>
            Export Report
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Quizzes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.total_quizzes}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Average</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.average_percentage}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Highest</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{data.highest_score}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Lowest</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">{data.lowest_score}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Improvement</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.improvement_percentage > 0 ? "+" : ""}
            {data.improvement_percentage}%
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Trend</p>
          <p className={`mt-1 text-2xl font-semibold ${TREND_TONE[data.trend_status] || "text-slate-900"}`}>{data.trend_status}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Performance Trend</h3>
        {chartData.length === 0 ? (
          <EmptyState title="No completed quizzes yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} labelFormatter={(_, p) => p?.[0]?.payload?.title || ""} />
              <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Quiz History</h3>
          {data.trend.length === 0 ? (
            <p className="text-sm text-slate-400">No quizzes completed yet.</p>
          ) : (
            <Table>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Quiz</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.trend.map((t) => (
                  <tr key={t.quiz_id}>
                    <td className="px-3 py-2 text-slate-800">{t.quiz_title}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {t.score}/{t.total_marks}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{t.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Topic Accuracy</h3>
          {data.weak_topics.length > 0 && (
            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Needs Improvement: {data.weak_topics.map((t) => `${t.topic} (${t.accuracy}%)`).join(", ")}
            </div>
          )}
          {data.topics.length === 0 ? (
            <p className="text-sm text-slate-400">No topic data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topics.map((t) => (
                <div key={t.topic}>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t.topic}</span>
                    <span>{t.accuracy}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${t.accuracy < 70 ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${t.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
