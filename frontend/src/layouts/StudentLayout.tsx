import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

const NAV_ITEMS = [
  { to: "/student/app", label: "My Quizzes" },
  { to: "/student/history", label: "Quiz History" },
]

export default function StudentLayout() {
  const { student, studentLogout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    studentLogout()
    navigate("/student")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-lg font-bold text-indigo-600">QuizzMaker</p>
            <p className="text-xs text-slate-400">{student?.name} · {student?.studentId}</p>
          </div>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
