import { useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Mail } from "lucide-react"
import { api } from "../lib/api"
import { AuthCard, Button, Field, IconInput } from "../components/ui"

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
    <AuthCard title="Forgot Password" subtitle="Enter your email and we'll send you reset instructions.">
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Email">
          <IconInput icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </Field>
        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? "Sending..." : "Send reset instructions"}
        </Button>
      </form>
      <Link to="/teacher/login" className="mt-4 block text-sm font-medium text-indigo-600 hover:underline">
        Back to login
      </Link>
    </AuthCard>
  )
}
