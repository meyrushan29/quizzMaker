import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { History, LogOut, NotebookText } from "lucide-react"
import { useAuth } from "../lib/auth"

const NAV_ITEMS = [
  { to: "/student/app", label: "My Quizzes", icon: NotebookText },
  { to: "/student/history", label: "Quiz History", icon: History },
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
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-display text-base font-bold text-white shadow-sm">
              Q
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight text-slate-900">QuizzMaker</p>
              <p className="truncate text-xs text-slate-400">
                {student?.name} · {student?.studentId}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>Log out</span>
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
            aria-label="Log out"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 sm:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
