import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, ApiError } from "../../lib/api"
import type { ResultData } from "../../lib/types"
import { Button, Card, ErrorBanner, Spinner } from "../../components/ui"

const PERFORMANCE_TONE: Record<string, string> = {
  Excellent: "text-emerald-600",
  "Very Good": "text-indigo-600",
  Good: "text-amber-600",
  "Needs Improvement": "text-rose-600",
}

export default function StudentResult() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<ResultData | { detail: string } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!sessionId) return
    api
      .get<ResultData | { detail: string }>(`/api/live/session/${sessionId}/result`, "student")
      .then(setResult)
      .catch((exc) => setError(exc instanceof ApiError ? exc.message : "Failed to load result"))
  }, [sessionId])

  if (error) return <ErrorBanner message={error} />
  if (!result) return <Spinner />

  if ("detail" in result) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <p className="text-lg font-medium text-slate-700">{result.detail}</p>
          <Link to="/student/app" className="mt-4 inline-block">
            <Button variant="secondary">Back to My Quizzes</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const minutes = result.time_taken_seconds ? Math.floor(result.time_taken_seconds / 60) : 0
  const seconds = result.time_taken_seconds ? result.time_taken_seconds % 60 : 0

  return (
    <div className="mx-auto max-w-lg">
      <Card className="text-center">
        <p className="text-sm font-medium text-slate-500">Quiz Completed!</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{result.quiz_title}</h1>
        <p className="mt-4 text-6xl font-bold text-slate-900">
          {result.score}/{result.total_marks}
        </p>
        <p className="mt-2 text-4xl font-bold text-indigo-600">{result.percentage}%</p>
        <p className={`mt-3 text-lg font-semibold ${PERFORMANCE_TONE[result.performance_message] || "text-slate-600"}`}>
          {result.performance_message}
        </p>
        <p className={`mt-1 text-sm ${result.passed ? "text-emerald-600" : "text-rose-600"}`}>
          {result.passed ? "You passed this quiz." : "You did not reach the passing score."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-lg font-semibold text-emerald-700">{result.correct}</p>
            <p className="text-xs text-emerald-600">Correct</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-lg font-semibold text-rose-700">{result.wrong}</p>
            <p className="text-xs text-rose-600">Wrong</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-lg font-semibold text-slate-700">{result.unanswered}</p>
            <p className="text-xs text-slate-500">Unanswered</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3">
            <p className="text-lg font-semibold text-indigo-700">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-indigo-600">Time</p>
          </div>
        </div>

        <Link to="/student/history" className="mt-6 inline-block">
          <Button variant="secondary">View Quiz History</Button>
        </Link>
      </Card>

      {result.answers.length > 0 && <AnswerReview answers={result.answers} />}
    </div>
  )
}

function AnswerReview({ answers }: { answers: ResultData["answers"] }) {
  const missed = answers.filter((a) => !a.is_correct)

  if (missed.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-center font-medium text-emerald-700">You answered every question correctly. Great job!</p>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <h2 className="text-lg font-semibold text-slate-900">Review your answers</h2>
      <p className="mt-1 text-sm text-slate-500">
        {missed.length} of {answers.length} question{answers.length === 1 ? "" : "s"} to review
      </p>
      <div className="mt-4 space-y-4">
        {missed.map((item, i) => (
          <div key={item.question_id} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              {i + 1}. {item.question_text}
              {item.topic && <span className="ml-2 text-xs font-normal text-slate-500">({item.topic})</span>}
            </p>
            <div className="mt-3 space-y-1.5">
              {item.options.map((opt) => {
                const isCorrect = opt.key === item.correct_answer
                const isSelected = opt.key === item.selected_answer
                return (
                  <div
                    key={opt.key}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      isCorrect
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : isSelected
                          ? "border-rose-300 bg-rose-100 text-rose-800"
                          : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span className="font-semibold">{opt.key}.</span> {opt.text}
                    {isCorrect && <span className="ml-2 text-xs font-medium">Correct answer</span>}
                    {isSelected && !isCorrect && <span className="ml-2 text-xs font-medium">Your answer</span>}
                  </div>
                )
              })}
              {!item.selected_answer && <p className="text-xs italic text-slate-500">You did not answer this question.</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
