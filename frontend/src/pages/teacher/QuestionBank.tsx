import { useEffect, useState } from "react"
import { CheckCircle2, ClipboardPaste, Layers, Pencil, PlusCircle, Trash2 } from "lucide-react"
import { api, ApiError } from "../../lib/api"
import type { BankQuestion, ParsedDraftQuestion, Quiz } from "../../lib/types"
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, Table, inputClass } from "../../components/ui"

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
  const [deleteTarget, setDeleteTarget] = useState<BankQuestion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState("")
  const [drafts, setDrafts] = useState<ParsedDraftQuestion[] | null>(null)
  const [savingDrafts, setSavingDrafts] = useState(false)

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/question-bank/${deleteTarget.id}`)
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddToQuiz(question: BankQuestion, quizId: number) {
    if (!quizId) return
    await api.post(`/api/question-bank/${question.id}/add-to-quiz/${quizId}`)
    setMessage(`Added to "${draftQuizzes.find((q) => q.id === quizId)?.title}".`)
    setTimeout(() => setMessage(""), 3000)
  }

  function openPaste() {
    setPasteText("")
    setDrafts(null)
    setParseError("")
    setShowPaste(true)
  }

  async function handleParse() {
    if (!pasteText.trim()) return
    setParsing(true)
    setParseError("")
    try {
      const parsed = await api.post<ParsedDraftQuestion[]>("/api/question-bank/parse", { text: pasteText })
      if (parsed.length === 0) {
        setParseError("No multiple-choice questions were found in that text.")
      } else {
        setDrafts(parsed)
      }
    } catch (exc) {
      setParseError(exc instanceof ApiError ? exc.message : "Failed to parse the pasted text")
    } finally {
      setParsing(false)
    }
  }

  function updateDraft(index: number, patch: Partial<ParsedDraftQuestion>) {
    setDrafts((current) => current && current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  }

  function removeDraft(index: number) {
    setDrafts((current) => current && current.filter((_, i) => i !== index))
  }

  async function handleConfirmDrafts() {
    if (!drafts || drafts.length === 0) return
    setSavingDrafts(true)
    try {
      for (const draft of drafts) {
        await api.post("/api/question-bank/", draft)
      }
      setShowPaste(false)
      setDrafts(null)
      setMessage(`Added ${drafts.length} question${drafts.length === 1 ? "" : "s"} to the bank.`)
      setTimeout(() => setMessage(""), 3000)
      await load()
    } catch (exc) {
      setParseError(exc instanceof ApiError ? exc.message : "Failed to save the reviewed questions")
    } finally {
      setSavingDrafts(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Save reusable questions and add them to any draft quiz."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openPaste}>
              <ClipboardPaste className="h-4 w-4" />
              Paste &amp; Parse
            </Button>
            <Button onClick={openCreate}>
              <PlusCircle className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        }
      />

      {message && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
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
        <EmptyState title="Question bank is empty" description="Add a question to reuse it across quizzes." icon={<Layers className="h-5 w-5" />} />
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
              <tr key={q.id} className="transition-colors hover:bg-slate-50">
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
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(q)} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Edit question">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(q)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete question">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Question" : "Add Question"} maxWidth="max-w-lg">
        <form className="space-y-3" onSubmit={handleSubmit}>
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
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={inputClass}>
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
      </Modal>

      <Modal
        open={showPaste}
        onClose={() => setShowPaste(false)}
        title={drafts ? "Review parsed questions" : "Paste & Parse"}
        maxWidth={drafts ? "max-w-2xl" : "max-w-lg"}
      >
        {!drafts ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Paste MCQs copied from a Word doc, PDF, or exam paper. Only questions already present in the text are
              extracted &mdash; nothing is invented.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className={inputClass}
              rows={10}
              placeholder={"1. What is 2 + 2?\na) 3  b) 4  c) 5  d) 6\nAnswer: B"}
            />
            {parseError && <ErrorBanner message={parseError} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowPaste(false)}>
                Cancel
              </Button>
              <Button type="button" loading={parsing} onClick={handleParse}>
                Parse
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Review each question before adding it to the bank. Questions missing a correct answer are highlighted
              &mdash; pick one to enable adding.
            </p>
            <div className="max-h-112 space-y-3 overflow-y-auto pr-1">
              {drafts.map((draft, index) => {
                const missingAnswer = draft.correct_answer === null
                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-3 ${missingAnswer ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <textarea
                        value={draft.question_text}
                        onChange={(e) => updateDraft(index, { question_text: e.target.value })}
                        className={inputClass}
                        rows={2}
                      />
                      <button
                        type="button"
                        onClick={() => removeDraft(index)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {missingAnswer && (
                      <p className="mb-2 text-xs font-medium text-rose-700">
                        No answer key found in the pasted text &mdash; select the correct option below.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(["a", "b", "c", "d"] as const).map((letter) => (
                        <div key={letter} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`draft_${index}_correct_answer`}
                            checked={draft.correct_answer === letter.toUpperCase()}
                            onChange={() => updateDraft(index, { correct_answer: letter.toUpperCase() as "A" })}
                          />
                          <input
                            value={draft[`option_${letter}` as "option_a"]}
                            onChange={(e) => updateDraft(index, { [`option_${letter}`]: e.target.value } as Partial<ParsedDraftQuestion>)}
                            className={`${inputClass} py-1.5 text-sm`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        value={draft.topic ?? ""}
                        onChange={(e) => updateDraft(index, { topic: e.target.value || null })}
                        placeholder="Topic (optional)"
                        className={`${inputClass} py-1.5 text-sm`}
                      />
                      <input
                        type="number"
                        min={1}
                        value={draft.marks}
                        onChange={(e) => updateDraft(index, { marks: Number(e.target.value) || 1 })}
                        placeholder="Marks"
                        className={`${inputClass} py-1.5 text-sm`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {parseError && <ErrorBanner message={parseError} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDrafts(null)}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowPaste(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                loading={savingDrafts}
                disabled={drafts.length === 0 || drafts.some((d) => d.correct_answer === null)}
                onClick={handleConfirmDrafts}
              >
                Add {drafts.length} to bank
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove question?"
        description="Remove this question from the bank? This cannot be undone."
        confirmLabel="Remove"
        busy={deleting}
      />
    </div>
  )
}
