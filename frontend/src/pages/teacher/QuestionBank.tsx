import { useEffect, useState } from "react"
import { api, ApiError } from "../../lib/api"
import type { BankQuestion, Quiz } from "../../lib/types"
import { Button, Card, EmptyState, ErrorBanner, Field, PageHeader, Spinner, Table, inputClass } from "../../components/ui"

const EMPTY_FORM = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A" as "A" | "B" | "C" | "D",
  marks: 1,
  subject: "Science",
  grade: "Grade 10",
  chapter: "",
  topic: "",
  difficulty: "Easy",
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null)
  const [draftQuizzes, setDraftQuizzes] = useState<Quiz[]>([])
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BankQuestion | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState("")

  async function load() {
    try {
      const query = search ? `?q=${encodeURIComponent(search)}` : ""
      setQuestions(await api.get<BankQuestion[]>(`/api/question-bank/${query}`))
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load question bank")
    }
  }

  useEffect(() => {
    api.get<Quiz[]>("/api/quizzes/?status=draft").then(setDraftQuizzes).catch(() => {})
  }, [])

  useEffect(() => {
    const timeout = setTimeout(load, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(question: BankQuestion) {
    setEditing(question)
    setForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      marks: question.marks,
      subject: question.subject || "",
      grade: question.grade || "",
      chapter: question.chapter || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "Easy",
    })
    setShowForm(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editing) {
      await api.put(`/api/question-bank/${editing.id}`, form)
    } else {
      await api.post("/api/question-bank/", form)
    }
    setShowForm(false)
    await load()
  }

  async function handleDelete(question: BankQuestion) {
    if (!confirm("Remove this question from the bank?")) return
    await api.delete(`/api/question-bank/${question.id}`)
    await load()
  }

  async function handleAddToQuiz(question: BankQuestion, quizId: number) {
    if (!quizId) return
    await api.post(`/api/question-bank/${question.id}/add-to-quiz/${quizId}`)
    setMessage(`Added to "${draftQuizzes.find((q) => q.id === quizId)?.title}".`)
    setTimeout(() => setMessage(""), 3000)
  }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Save reusable questions and add them to any draft quiz."
        actions={<Button onClick={openCreate}>Add Question</Button>}
      />

      {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <ErrorBanner message={error} />}

      <Card className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          className={`${inputClass} max-w-sm`}
        />
      </Card>

      {!questions ? (
        <Spinner />
      ) : questions.length === 0 ? (
        <EmptyState title="Question bank is empty" description="Add a question to reuse it across quizzes." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Add to Quiz</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="max-w-sm px-4 py-3 font-medium text-slate-900">{q.question_text}</td>
                <td className="px-4 py-3 text-slate-500">{q.topic}</td>
                <td className="px-4 py-3 text-slate-500">{q.difficulty}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue=""
                    onChange={(e) => handleAddToQuiz(q, Number(e.target.value))}
                    className={`${inputClass} py-1.5 text-xs`}
                  >
                    <option value="" disabled>
                      Select quiz...
                    </option>
                    {draftQuizzes.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => openEdit(q)} className="text-sm text-indigo-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(q)} className="text-sm text-rose-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit Question" : "Add Question"}</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <Field label="Question">
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
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
                      name="bank_correct_answer"
                      checked={form.correct_answer === letter.toUpperCase()}
                      onChange={() => setForm({ ...form, correct_answer: letter.toUpperCase() as "A" })}
                    />
                    <input
                      value={form[`option_${letter}` as "option_a"]}
                      onChange={(e) => setForm({ ...form, [`option_${letter}`]: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                </Field>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Subject">
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Grade">
                  <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Topic">
                  <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Difficulty">
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className={inputClass}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editing ? "Save Changes" : "Add Question"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
