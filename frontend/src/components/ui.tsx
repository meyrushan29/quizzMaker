import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react"
import { useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, Inbox, Loader2, X } from "lucide-react"

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ${
        interactive ? "transition hover:-translate-y-0.5 hover:shadow-soft-lg" : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: "default" | "good" | "bad"
  icon?: ReactNode
}) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900"
  const iconToneClass = tone === "good" ? "bg-emerald-50 text-emerald-600" : tone === "bad" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconToneClass}`}>{icon}</span>}
      </div>
      <span className={`font-display text-3xl font-semibold ${toneClass}`}>{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </Card>
  )
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
}

export function Button({
  variant = "primary",
  className = "",
  children,
  loading = false,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
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

const badgeDotTones: Record<string, string> = {
  draft: "bg-slate-400",
  live_lobby: "bg-amber-500",
  live_active: "bg-emerald-500",
  completed: "bg-indigo-500",
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  waiting: "bg-amber-500",
  in_progress: "bg-blue-500",
  submitted: "bg-emerald-500",
  auto_submitted: "bg-emerald-500",
}

const pulseStatuses = new Set(["live_active", "in_progress", "waiting", "live_lobby"])

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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[status] || "bg-slate-100 text-slate-600"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${badgeDotTones[status] || "bg-slate-400"} ${pulseStatuses.has(status) ? "animate-pulse" : ""}`} />
      {statusLabels[status] || status}
    </span>
  )
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-indigo-600 ${className}`} role="status" aria-label="Loading" />
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
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
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"

export function IconInput({ icon, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">{icon}</span>
      <input className={`${inputClass} pl-10 ${className}`} {...rest} />
    </div>
  )
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md animate-scale-in rounded-3xl border border-slate-200/80 bg-white p-8 shadow-soft-lg">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-display text-base font-bold text-white shadow-sm">
            Q
          </div>
          <span className="font-display text-base font-bold text-slate-900">QuizzMaker</span>
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-soft-lg animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  variant?: ButtonVariant
  busy?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant={variant} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
