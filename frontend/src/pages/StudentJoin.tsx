import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"
import { ApiError } from "../lib/api"
import { Button, Field, inputClass } from "../components/ui"

export default function StudentJoin() {
  const [studentId, setStudentId] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { studentLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!studentId.trim() || !name.trim()) {
      setError("Please complete all fields.")
      return
    }
    setLoading(true)
    try {
      await studentLogin(studentId.trim(), name.trim())
      navigate("/student/app")
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-slate-900">Student Login</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the Student ID and name your teacher gave you.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Student ID">
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={inputClass}
              placeholder="STU001"
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Student Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Kavin Raj" />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" variant="success" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </Button>
        </form>
        <Link to="/" className="mt-4 block text-sm text-slate-400 hover:underline">
          Back home
        </Link>
      </div>
    </div>
  )
}
