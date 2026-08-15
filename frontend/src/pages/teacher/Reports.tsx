import { useEffect, useState } from "react"
import { Download, FileSpreadsheet } from "lucide-react"
import { api, downloadReport } from "../../lib/api"
import type { Quiz, Student } from "../../lib/types"
import { Button, Card, Field, PageHeader, inputClass } from "../../components/ui"

export default function Reports() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")

  useEffect(() => {
    api.get<Quiz[]>("/api/quizzes/?status=completed").then(setQuizzes)
    api.get<Student[]>("/api/students/").then(setStudents)
  }, [])

  return (
    <div>
      <PageHeader title="Reports" subtitle="Export class, question, topic and student performance reports." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-sm font-semibold text-slate-900">Quiz Report</h3>
          <p className="mt-1 text-sm text-slate-500">Class results, question analysis, and topic breakdown for a completed quiz.</p>
          <div className="mt-4">
            <Field label="Quiz">
              <select value={selectedQuiz} onChange={(e) => setSelectedQuiz(e.target.value)} className={inputClass}>
                <option value="">Select a quiz...</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["class", "questions", "topics"] as const).map((kind) => (
              <div key={kind} className="flex gap-1">
                <Button
                  variant="secondary"
                  disabled={!selectedQuiz}
                  onClick={() => downloadReport(`/api/reports/quizzes/${selectedQuiz}/${kind}?format=csv`, `${kind}_report_${selectedQuiz}.csv`)}
                >
                  <Download className="h-4 w-4" />
                  {kind[0].toUpperCase() + kind.slice(1)} CSV
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedQuiz}
                  onClick={() => downloadReport(`/api/reports/quizzes/${selectedQuiz}/${kind}?format=xlsx`, `${kind}_report_${selectedQuiz}.xlsx`)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-sm font-semibold text-slate-900">Student Report</h3>
          <p className="mt-1 text-sm text-slate-500">Quiz history and performance trend for one student.</p>
          <div className="mt-4">
            <Field label="Student">
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={inputClass}>
                <option value="">Select a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_id})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              disabled={!selectedStudent}
              onClick={() => downloadReport(`/api/reports/students/${selectedStudent}?format=csv`, `student_report_${selectedStudent}.csv`)}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedStudent}
              onClick={() => downloadReport(`/api/reports/students/${selectedStudent}?format=xlsx`, `student_report_${selectedStudent}.xlsx`)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
