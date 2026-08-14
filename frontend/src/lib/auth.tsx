import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { api } from "./api"

interface TeacherAuth {
  token: string
  email: string
}

interface StudentAuth {
  token: string
  id: number
  studentId: string
  name: string
}

interface AuthContextValue {
  teacher: TeacherAuth | null
  student: StudentAuth | null
  teacherLogin: (email: string, password: string) => Promise<void>
  teacherLogout: () => void
  studentLogin: (studentId: string, name: string) => Promise<void>
  quickJoin: (quizCode: string, name: string) => Promise<void>
  studentLogout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadTeacher(): TeacherAuth | null {
  const token = localStorage.getItem("teacher_token")
  const email = localStorage.getItem("teacher_email")
  if (!token || !email) return null
  return { token, email }
}

function loadStudent(): StudentAuth | null {
  const token = localStorage.getItem("student_token")
  const id = localStorage.getItem("student_db_id")
  const studentId = localStorage.getItem("student_student_id")
  const name = localStorage.getItem("student_name")
  if (!token || !id || !studentId || !name) return null
  return { token, id: Number(id), studentId, name }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<TeacherAuth | null>(loadTeacher)
  const [student, setStudent] = useState<StudentAuth | null>(loadStudent)

  async function teacherLogin(email: string, password: string) {
    const data = await api.postForm<{ access_token: string }>(
      "/api/auth/login",
      new URLSearchParams({ username: email, password }),
      "none"
    )
    localStorage.setItem("teacher_token", data.access_token)
    localStorage.setItem("teacher_email", email)
    setTeacher({ token: data.access_token, email })
  }

  function teacherLogout() {
    localStorage.removeItem("teacher_token")
    localStorage.removeItem("teacher_email")
    setTeacher(null)
  }

  async function studentLogin(studentId: string, name: string) {
    const data = await api.post<{ access_token: string; id: number; student_id: string; name: string }>(
      "/api/auth/student-login",
      { student_id: studentId, name },
      "none"
    )
    localStorage.setItem("student_token", data.access_token)
    localStorage.setItem("student_db_id", String(data.id))
    localStorage.setItem("student_student_id", data.student_id)
    localStorage.setItem("student_name", data.name)
    setStudent({ token: data.access_token, id: data.id, studentId: data.student_id, name: data.name })
  }

  async function quickJoin(quizCode: string, name: string) {
    const data = await api.post<{ access_token: string; id: number; student_id: string; name: string }>(
      "/api/auth/quick-join",
      { quiz_code: quizCode, name },
      "none"
    )
    localStorage.setItem("student_token", data.access_token)
    localStorage.setItem("student_db_id", String(data.id))
    localStorage.setItem("student_student_id", data.student_id)
    localStorage.setItem("student_name", data.name)
    setStudent({ token: data.access_token, id: data.id, studentId: data.student_id, name: data.name })
  }

  function studentLogout() {
    localStorage.removeItem("student_token")
    localStorage.removeItem("student_db_id")
    localStorage.removeItem("student_student_id")
    localStorage.removeItem("student_name")
    localStorage.removeItem("student_session_id")
    setStudent(null)
  }

  useEffect(() => {
    setTeacher(loadTeacher())
    setStudent(loadStudent())
  }, [])

  return (
    <AuthContext.Provider value={{ teacher, student, teacherLogin, teacherLogout, studentLogin, quickJoin, studentLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function RequireTeacher({ children }: { children: ReactNode }) {
  const { teacher } = useAuth()
  const location = useLocation()
  if (!teacher) return <Navigate to="/teacher/login" replace state={{ from: location }} />
  return <>{children}</>
}

export function RequireStudent({ children }: { children: ReactNode }) {
  const { student } = useAuth()
  const location = useLocation()
  if (!student) return <Navigate to="/student" replace state={{ from: location }} />
  return <>{children}</>
}
