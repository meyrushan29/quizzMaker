import { useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../lib/api"
import { Button, Field, inputClass } from "../components/ui"

export default function TeacherForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<{ detail: string }>("/api/auth/forgot-password", { email }, "none")
      setMessage(res.detail)
    } catch {
      setMessage("If that email exists, password reset instructions have been sent.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your email and we'll send you reset instructions.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} required />
          </Field>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset instructions"}
          </Button>
        </form>
        <Link to="/teacher/login" className="mt-4 block text-sm text-indigo-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}
