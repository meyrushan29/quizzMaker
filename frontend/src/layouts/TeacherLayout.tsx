import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

const NAV_ITEMS = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/teacher/quizzes", label: "Quizzes", icon: "📝" },
  { to: "/teacher/question-bank", label: "Question Bank", icon: "🗂️" },
  { to: "/teacher/students", label: "Students", icon: "🧑‍🎓" },
  { to: "/teacher/live", label: "Live Quiz", icon: "🔴" },
  { to: "/teacher/results", label: "Results", icon: "📊" },
  { to: "/teacher/analytics", label: "Analytics", icon: "📈" },
  { to: "/teacher/reports", label: "Reports", icon: "📄" },
  { to: "/teacher/settings", label: "Settings", icon: "⚙️" },
]

export default function TeacherLayout() {
  const { teacher, teacherLogout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    teacherLogout()
    navigate("/teacher/login")
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold text-indigo-600">QuizzMaker</p>
          <p className="text-xs text-slate-400">Teacher Console</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="truncate px-2 text-xs text-slate-400">{teacher?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="text-lg font-bold text-indigo-600">QuizzMaker</p>
          <button onClick={handleLogout} className="text-sm text-slate-500">
            Log out
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
