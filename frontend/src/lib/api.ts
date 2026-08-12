const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type AuthMode = "teacher" | "student" | "none"

function getToken(auth: AuthMode): string | null {
  if (auth === "teacher") return localStorage.getItem("teacher_token")
  if (auth === "student") return localStorage.getItem("student_token")
  return null
}

async function request<T>(path: string, options: RequestInit = {}, auth: AuthMode = "teacher"): Promise<T> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) }
  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json"
  }
  const token = getToken(auth)
  if (token) headers["Authorization"] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError("Unable to connect to the server. Please check your connection.", 0)
  }

  if (!res.ok) {
    let detail = res.statusText || "Something went wrong."
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      // response had no JSON body
    }
    if (res.status === 401 && auth !== "none") {
      if (auth === "teacher") localStorage.removeItem("teacher_token")
      if (auth === "student") localStorage.removeItem("student_token")
    }
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return (await res.json()) as T
  return undefined as T
}

export const api = {
  get: <T,>(path: string, auth: AuthMode = "teacher") => request<T>(path, { method: "GET" }, auth),
  post: <T,>(path: string, body?: unknown, auth: AuthMode = "teacher") =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, auth),
  put: <T,>(path: string, body?: unknown, auth: AuthMode = "teacher") =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }, auth),
  delete: <T,>(path: string, auth: AuthMode = "teacher") => request<T>(path, { method: "DELETE" }, auth),
  postForm: <T,>(path: string, form: URLSearchParams, auth: AuthMode = "teacher") =>
    request<T>(path, { method: "POST", body: form }, auth),
  upload: <T,>(path: string, form: FormData, auth: AuthMode = "teacher") => request<T>(path, { method: "POST", body: form }, auth),
}

export async function downloadReport(path: string, filename: string, auth: AuthMode = "teacher") {
  const token = getToken(auth)
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new ApiError("Failed to generate report.", res.status)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function wsUrl(path: string): string {
  return `${import.meta.env.VITE_WS_URL}${path}`
}
