import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, Download } from "lucide-react"
import { api, downloadReport } from "../../lib/api"
import type { ClassAnalysis, QuestionAnalysis, TopicAnalysis } from "../../lib/types"
import { Badge, Button, Card, PageHeader, Spinner, Table } from "../../components/ui"

type Tab = "class" | "ranking" | "questions" | "topics"

export default function ResultDetail() {
  const { quizId } = useParams()
  const [tab, setTab] = useState<Tab>("class")
  const [classData, setClassData] = useState<ClassAnalysis | null>(null)
  const [questionData, setQuestionData] = useState<QuestionAnalysis | null>(null)
  const [topicData, setTopicData] = useState<TopicAnalysis | null>(null)

  useEffect(() => {
    if (!quizId) return
    api.get<ClassAnalysis>(`/api/analytics/quizzes/${quizId}/class`).then(setClassData)
    api.get<QuestionAnalysis>(`/api/analytics/quizzes/${quizId}/questions`).then(setQuestionData)
    api.get<TopicAnalysis>(`/api/analytics/quizzes/${quizId}/topics`).then(setTopicData)
  }, [quizId])

  if (!classData) return <Spinner />

  const distributionData = Object.entries(classData.score_distribution).map(([range, count]) => ({ range, count }))

  return (
    <div>
      <PageHeader
        title={classData.quiz_title}
        subtitle="Class results, question performance and topic breakdown."
        actions={
          <>
            <Button variant="secondary" onClick={() => downloadReport(`/api/reports/quizzes/${quizId}/class?format=csv`, `class_report_${quizId}.csv`)}>
              <Download className="h-4 w-4" />
              Export Class CSV
            </Button>
            <Button variant="secondary" onClick={() => downloadReport(`/api/reports/quizzes/${quizId}/questions?format=csv`, `question_report_${quizId}.csv`)}>
              <Download className="h-4 w-4" />
              Export Question CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Students", classData.num_students],
          ["Average", `${classData.average}%`],
          ["Highest", `${classData.highest}%`],
          ["Lowest", `${classData.lowest}%`],
          ["Median", `${classData.median}%`],
          ["Pass Rate", `${classData.pass_rate}%`],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {(["class", "ranking", "questions", "topics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 animate-fade-in">
        {tab === "class" && (
          <Card>
            <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {tab === "ranking" && (
          <Table>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Time Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classData.ranking.map((r) => (
                <tr key={r.student_id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">#{r.rank}</td>
                  <td className="px-4 py-3">
                    <Link to={`/teacher/students/${r.db_id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {r.name}
                    </Link>
                    <span className="ml-1 text-xs text-slate-400">{r.student_id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.score}/{r.total_marks}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.percentage}%</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.time_taken_seconds !== null ? `${Math.floor(r.time_taken_seconds / 60)}m ${r.time_taken_seconds % 60}s` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {tab === "questions" && questionData && (
          <div className="space-y-4">
            {questionData.difficult_questions.length > 0 && (
              <Card>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                  Difficult Questions
                </h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {questionData.difficult_questions.map((q) => (
                    <li key={q.question_number}>
                      Q{q.question_number} - {q.accuracy}% accuracy
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {questionData.questions.map((q) => (
              <Card key={q.question_id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      Q{q.question_number}. {q.question_text}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Correct answer: {q.correct_answer} {q.topic && `· ${q.topic}`} {q.difficulty && `· ${q.difficulty}`}
                    </p>
                  </div>
                  <span className={`text-lg font-semibold ${q.accuracy < 70 ? "text-rose-600" : "text-emerald-600"}`}>{q.accuracy}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">
                  {(["A", "B", "C", "D"] as const).map((k) => (
                    <div key={k} className={`rounded-lg p-2 ${q.correct_answer === k ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}`}>
                      <p className="font-semibold">{k}</p>
                      <p>{q.response_counts[k]}</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
                    <p className="font-semibold">-</p>
                    <p>{q.response_counts.unanswered}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "topics" && topicData && (
          <div className="space-y-4">
            {topicData.needs_improvement.length > 0 && (
              <Card>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                  Needs Improvement
                </h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {topicData.needs_improvement.map((t) => (
                    <li key={t.topic}>
                      {t.topic} - {t.accuracy}%
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Table>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topicData.topics.map((t) => (
                  <tr key={t.topic} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.topic}</td>
                    <td className="px-4 py-3 text-slate-500">{t.questions}</td>
                    <td className="px-4 py-3 text-slate-500">{t.correct}</td>
                    <td className="px-4 py-3">
                      <Badge status={t.accuracy < 70 ? "waiting" : "submitted"} />
                      <span className="ml-2">{t.accuracy}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
