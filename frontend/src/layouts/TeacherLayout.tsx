import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  BarChart3,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings as SettingsIcon,
  TrendingUp,
  Users,
} from "lucide-react"
import { useAuth } from "../lib/auth"

const NAV_ITEMS = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/quizzes", label: "Quizzes", icon: FileText },
  { to: "/teacher/question-bank", label: "Question Bank", icon: Layers },
  { to: "/teacher/students", label: "Students", icon: Users },
  { to: "/teacher/live", label: "Live Quiz", icon: Radio },
  { to: "/teacher/results", label: "Results", icon: BarChart3 },
  { to: "/teacher/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/teacher/reports", label: "Reports", icon: FileText },
  { to: "/teacher/settings", label: "Settings", icon: SettingsIcon },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-display text-base font-bold text-white shadow-sm">
        Q
      </div>
      <div>
        <p className="font-display text-base font-bold leading-tight text-slate-900">QuizzMaker</p>
        <p className="text-xs text-slate-400">Teacher Console</p>
      </div>
    </div>
  )
}

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
        <div className="mb-6 px-1">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="truncate px-2 text-xs text-slate-400">{teacher?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Brand />
          <button onClick={handleLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 lg:hidden">
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
              <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
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
