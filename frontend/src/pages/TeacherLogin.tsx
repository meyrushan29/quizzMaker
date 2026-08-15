import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Lock, Mail } from "lucide-react"
import { useAuth } from "../lib/auth"
import { ApiError } from "../lib/api"
import { AuthCard, Button, ErrorBanner, Field, IconInput } from "../components/ui"

export default function TeacherLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { teacherLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      await teacherLogin(email, password)
      navigate("/teacher/dashboard")
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : "Login failed. Check email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Teacher Login" subtitle="Sign in to manage your classes and quizzes.">
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Email">
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="teacher@example.com"
            required
          />
        </Field>
        <Field label="Password">
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link to="/teacher/forgot-password" className="font-medium text-indigo-600 hover:underline">
          Forgot password?
        </Link>
        <Link to="/" className="text-slate-400 hover:underline">
          Back home
        </Link>
      </div>
    </AuthCard>
  )
}
