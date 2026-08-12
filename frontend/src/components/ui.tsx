import type { ButtonHTMLAttributes, ReactNode } from "react"

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900"
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-3xl font-semibold ${toneClass}`}>{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </Card>
  )
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const badgeTones: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  live_lobby: "bg-amber-100 text-amber-700",
  live_active: "bg-emerald-100 text-emerald-700",
  completed: "bg-indigo-100 text-indigo-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  waiting: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-emerald-100 text-emerald-700",
  auto_submitted: "bg-emerald-100 text-emerald-700",
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  live_lobby: "Waiting Room",
  live_active: "Live",
  completed: "Completed",
  active: "Active",
  inactive: "Inactive",
  waiting: "Waiting",
  in_progress: "Answering",
  submitted: "Submitted",
  auto_submitted: "Auto-submitted",
}

export function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[status] || "bg-slate-100 text-slate-600"}`}>
      {statusLabels[status] || status}
    </span>
  )
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
