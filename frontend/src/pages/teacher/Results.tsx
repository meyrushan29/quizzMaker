import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart3 } from "lucide-react"
import { api } from "../../lib/api"
import type { Quiz } from "../../lib/types"
import { Badge, Card, EmptyState, PageHeader, Spinner, Table, inputClass } from "../../components/ui"

export default function Results() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)
  const [grade, setGrade] = useState("")
  const [subject, setSubject] = useState("")
  const [chapter, setChapter] = useState("")

  useEffect(() => {
    api.get<Quiz[]>("/api/quizzes/?status=completed").then(setQuizzes)
  }, [])

  if (!quizzes) return <Spinner />

  const grades = Array.from(new Set(quizzes.map((q) => q.grade)))
  const subjects = Array.from(new Set(quizzes.map((q) => q.subject)))
  const chapters = Array.from(new Set(quizzes.map((q) => q.chapter).filter(Boolean))) as string[]

  const filtered = quizzes.filter(
    (q) => (!grade || q.grade === grade) && (!subject || q.subject === subject) && (!chapter || q.chapter === chapter)
  )

  return (
    <div>
      <PageHeader title="Quiz Results" subtitle="Browse completed quizzes and open detailed results." />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className={`${inputClass} max-w-[10rem]`}>
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} max-w-[10rem]`}>
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={`${inputClass} max-w-[10rem]`}>
            <option value="">All Chapters</option>
            {chapters.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No completed quizzes yet" description="Results appear here once a live quiz has ended." icon={<BarChart3 className="h-5 w-5" />} />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((quiz) => (
              <tr key={quiz.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/teacher/results/${quiz.id}`} className="hover:text-indigo-600">
                    {quiz.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{quiz.chapter}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(quiz.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{quiz.question_count}</td>
                <td className="px-4 py-3">
                  <Badge status={quiz.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
