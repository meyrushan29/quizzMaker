import { useEffect, useRef, useState } from "react"
import { api, ApiError } from "../../lib/api"
import type { Student } from "../../lib/types"
import { Link } from "react-router-dom"
import { CheckCircle2, Pencil, Trash2, Upload, UserPlus, Users } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  Spinner,
  Table,
  inputClass,
} from "../../components/ui"

const EMPTY_FORM = { student_id: "", name: "", grade: "Grade 10", class_name: "", subject: "Science", status: "active" }

export default function Students() {
  const [students, setStudents] = useState<Student[] | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState("")
  const [importMessage, setImportMessage] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const data = await api.get<Student[]>(`/api/students/${search ? `?q=${encodeURIComponent(search)}` : ""}`)
      setStudents(data)
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Failed to load students")
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError("")
    setShowForm(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm({
      student_id: student.student_id,
      name: student.name,
      grade: student.grade || "",
      class_name: student.class_name || "",
      subject: student.subject || "",
      status: student.status,
    })
    setFormError("")
    setShowForm(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")
    try {
      if (editing) {
        await api.put(`/api/students/${editing.id}`, {
          name: form.name,
          grade: form.grade,
          class_name: form.class_name,
          subject: form.subject,
          status: form.status,
        })
      } else {
        await api.post("/api/students/", form)
      }
      setShowForm(false)
      await load()
    } catch (exc) {
      setFormError(exc instanceof ApiError ? exc.message : "Failed to save student")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/students/${deleteTarget.id}`)
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const result = await api.upload<{ created: number; skipped: number }>("/api/students/import", formData)
      setImportMessage(`Imported ${result.created} students, skipped ${result.skipped}.`)
      await load()
    } catch (exc) {
      setImportMessage(exc instanceof ApiError ? exc.message : "Import failed")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const filtered = (students || []).filter((s) => {
    if (gradeFilter && s.grade !== gradeFilter) return false
    if (statusFilter && s.status !== statusFilter) return false
    return true
  })
  const grades = Array.from(new Set((students || []).map((s) => s.grade).filter(Boolean))) as string[]

  return (
    <div>
      <PageHeader
        title="Student Management"
        subtitle="Add, edit and import students. Student IDs must be unique."
        actions={
          <>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </>
        }
      />

      {importMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {importMessage}
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student ID"
            className={`${inputClass} max-w-xs`}
          />
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className={`${inputClass} max-w-[10rem]`}>
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} max-w-[10rem]`}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {!students ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No students found" description="Add a student or adjust your filters." icon={<Users className="h-5 w-5" />} />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((student) => (
              <tr key={student.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{student.student_id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/teacher/students/${student.id}`} className="hover:text-indigo-600">
                    {student.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{student.grade}</td>
                <td className="px-4 py-3 text-slate-500">{student.class_name}</td>
                <td className="px-4 py-3 text-slate-500">{student.subject}</td>
                <td className="px-4 py-3">
                  <Badge status={student.status} />
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(student.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(student)} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label={`Edit ${student.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(student)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${student.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Student" : "Add Student"}>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Student ID">
            <input
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className={inputClass}
              disabled={!!editing}
              required
            />
          </Field>
          <Field label="Full Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade">
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Class">
              <input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <Field label="Subject">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
          </Field>
          {editing && (
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          )}
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Student"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete student?"
        description={deleteTarget ? `Delete ${deleteTarget.name} (${deleteTarget.student_id})? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        busy={deleting}
      />
    </div>
  )
}
