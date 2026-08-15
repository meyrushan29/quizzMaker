import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronDown, ChevronUp, Copy, Pencil, PlusCircle, Trash2 } from "lucide-react"
import { api, ApiError } from "../../lib/api"
import type { Question, QuizDetail } from "../../lib/types"
import { Button, Card, ConfirmDialog, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass } from "../../components/ui"

interface QuizFormState {
  title: string
  subject: string
  grade: string
  chapter: string
  description: string
  duration: number
  passing_percentage: number
  randomize_questions: boolean
  randomize_options: boolean
  show_result_immediately: boolean
  allow_retake: boolean
  allow_late_join: boolean
  leaderboard_visible: boolean
}

const DEFAULT_FORM: QuizFormState = {
  title: "",
  subject: "Science",
  grade: "Grade 10",
  chapter: "",
  description: "",
  duration: 20,
  passing_percentage: 50,
  randomize_questions: false,
  randomize_options: false,
  show_result_immediately: true,
  allow_retake: false,
  allow_late_join: false,
  leaderboard_visible: false,
}

const EMPTY_QUESTION = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A" as "A" | "B" | "C" | "D",
  marks: 1,
  topic: "",
  difficulty: "Easy",
}

export default function QuizEditor() {
  const { id } = useParams()
  const isNew = !id || id === "new"
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [form, setForm] = useState<QuizFormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION)
  const [questionError, setQuestionError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadQuiz(quizId: string) {
    setLoading(true)
    try {
      const data = await api.get<QuizDetail>(`/api/quizzes/${quizId}`)
      setQuiz(data)
      setForm({
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        chapter: data.chapter || "",
        description: data.description || "",
        duration: data.duration,
        passing_percentage: data.passing_percentage,
        randomize_questions: data.randomize_questions,
        randomize_options: data.randomize_options,
        show_result_immediately: data.show_result_immediately,
        allow_retake: data.allow_retake,
        allow_late_join: data.allow_late_join,
        leaderboard_visible: data.leaderboard_visible,
      })
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load quiz")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isNew && id) loadQuiz(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (isNew) {
        const created = await api.post<QuizDetail>("/api/quizzes/", form)
        navigate(`/teacher/quizzes/${created.id}`, { replace: true })
      } else if (quiz) {
        const updated = await api.put<QuizDetail>(`/api/quizzes/${quiz.id}`, form)
        setQuiz({ ...quiz, ...updated })
      }
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  function openAddQuestion() {
    setEditingQuestion(null)
    setQuestionForm(EMPTY_QUESTION)
    setQuestionError("")
    setShowQuestionForm(true)
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question)
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      marks: question.marks,
      topic: question.topic || "",
      difficulty: question.difficulty || "Easy",
    })
    setQuestionError("")
    setShowQuestionForm(true)
  }

  async function handleSaveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quiz) return
    setQuestionError("")
    try {
      if (editingQuestion) {
        await api.put(`/api/quizzes/${quiz.id}/questions/${editingQuestion.id}`, questionForm)
      } else {
        await api.post(`/api/quizzes/${quiz.id}/questions`, questionForm)
      }
      setShowQuestionForm(false)
      await loadQuiz(String(quiz.id))
    } catch (exc) {
      setQuestionError(exc instanceof ApiError ? exc.message : "Failed to save question")
    }
  }

  async function handleDeleteQuestion() {
    if (!quiz || !deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/quizzes/${quiz.id}/questions/${deleteTarget.id}`)
      setDeleteTarget(null)
      await loadQuiz(String(quiz.id))
    } finally {
      setDeleting(false)
    }
  }

  async function handleDuplicateQuestion(question: Question) {
    if (!quiz) return
    await api.post(`/api/quizzes/${quiz.id}/questions/${question.id}/duplicate`)
    await loadQuiz(String(quiz.id))
  }

  async function moveQuestion(question: Question, direction: -1 | 1) {
    if (!quiz) return
    const sorted = [...quiz.questions].sort((a, b) => a.order_index - b.order_index)
    const index = sorted.findIndex((q) => q.id === question.id)
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= sorted.length) return
    const order = sorted.map((q) => q.id)
    ;[order[index], order[swapIndex]] = [order[swapIndex], order[index]]
    await api.post(`/api/quizzes/${quiz.id}/questions/reorder`, { order })
    await loadQuiz(String(quiz.id))
  }

  if (loading) return <Spinner />

  const isEditable = isNew || quiz?.status === "draft"
  const sortedQuestions = quiz ? [...quiz.questions].sort((a, b) => a.order_index - b.order_index) : []

  return (
    <div>
      <PageHeader
        title={isNew ? "Create Quiz" : quiz?.title || "Edit Quiz"}
        subtitle={isNew ? "Set up quiz information, then add questions." : "Edit quiz settings and manage questions."}
      />
      {error && <ErrorBanner message={error} />}
      {!isEditable && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This quiz is live or completed and can no longer be edited. Duplicate it to make changes.
        </div>
      )}

      <Card className="mb-6">
        <h2 className="font-display text-lg font-semibold text-slate-900">Quiz Information</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSaveSettings}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quiz Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                disabled={!isEditable}
                required
              />
            </Field>
            <Field label="Subject">
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass}
                disabled={!isEditable}
                required
              />
            </Field>
            <Field label="Grade">
              <input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className={inputClass}
                disabled={!isEditable}
                required
              />
            </Field>
            <Field label="Chapter">
              <input
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                className={inputClass}
                disabled={!isEditable}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              rows={2}
              disabled={!isEditable}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className={inputClass}
                disabled={!isEditable}
              />
            </Field>
            <Field label="Passing Percentage">
              <input
                type="number"
                min={0}
                max={100}
                value={form.passing_percentage}
                onChange={(e) => setForm({ ...form, passing_percentage: Number(e.target.value) })}
                className={inputClass}
                disabled={!isEditable}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["randomize_questions", "Randomize Questions"],
                ["randomize_options", "Randomize Answer Options"],
                ["show_result_immediately", "Show Result Immediately"],
                ["allow_retake", "Allow Retake"],
                ["allow_late_join", "Allow Late Join"],
                ["leaderboard_visible", "Leaderboard Visible to Students"],
              ] as [keyof QuizFormState, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  disabled={!isEditable}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                {label}
              </label>
            ))}
          </div>
          {isEditable && (
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Quiz & Add Questions" : "Save Settings"}
            </Button>
          )}
        </form>
      </Card>

      {quiz && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Questions ({quiz.questions.length}) &middot; {quiz.total_marks} marks
              </h2>
            </div>
            {isEditable && (
              <Button onClick={openAddQuestion}>
                <PlusCircle className="h-4 w-4" />
                Add Question
              </Button>
            )}
          </div>

          {sortedQuestions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No questions yet. Add your first question above.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedQuestions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {index + 1}. {question.question_text}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 sm:grid-cols-4">
                        {(["A", "B", "C", "D"] as const).map((letter) => (
                          <span
                            key={letter}
                            className={question.correct_answer === letter ? "font-semibold text-emerald-600" : ""}
                          >
                            {letter}. {question[`option_${letter.toLowerCase()}` as "option_a"]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2 text-xs text-slate-400">
                        <span>{question.marks} marks</span>
                        {question.topic && <span>&middot; {question.topic}</span>}
                        {question.difficulty && <span>&middot; {question.difficulty}</span>}
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => moveQuestion(question, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={index === 0} aria-label="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => moveQuestion(question, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={index === sortedQuestions.length - 1} aria-label="Move down">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditQuestion(question)} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Edit question">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDuplicateQuestion(question)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Duplicate question">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(question)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete question">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={showQuestionForm}
        onClose={() => setShowQuestionForm(false)}
        title={editingQuestion ? "Edit Question" : "Add Question"}
        maxWidth="max-w-lg"
      >
        <form className="space-y-3" onSubmit={handleSaveQuestion}>
          <Field label="Question">
            <textarea
              value={questionForm.question_text}
              onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
              className={inputClass}
              rows={2}
              required
            />
          </Field>
          {(["a", "b", "c", "d"] as const).map((letter) => (
            <Field key={letter} label={`Option ${letter.toUpperCase()}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={questionForm.correct_answer === letter.toUpperCase()}
                  onChange={() => setQuestionForm({ ...questionForm, correct_answer: letter.toUpperCase() as "A" })}
                />
                <input
                  value={questionForm[`option_${letter}` as "option_a"]}
                  onChange={(e) => setQuestionForm({ ...questionForm, [`option_${letter}`]: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </Field>
          ))}
          <p className="text-xs text-slate-400">Select the radio button next to the correct answer.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Marks">
              <input
                type="number"
                min={1}
                value={questionForm.marks}
                onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Topic">
              <input value={questionForm.topic} onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Difficulty">
              <select
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                className={inputClass}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </Field>
          </div>
          {questionError && <ErrorBanner message={questionError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowQuestionForm(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingQuestion ? "Save Question" : "Add Question"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteQuestion}
        title="Delete question?"
        description="This cannot be undone."
        confirmLabel="Delete"
        busy={deleting}
      />
    </div>
  )
}
