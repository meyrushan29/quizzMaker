import { useEffect, useRef } from "react"
import { wsUrl } from "./api"

/**
 * Server-push only channel: the socket delivers lobby/progress/timer events,
 * every mutation still goes through REST. If the socket drops (e.g. the
 * student's connection blips), we reconnect and the UI simply keeps relying
 * on its last REST-fetched state until the next push arrives.
 */
export function useLiveSocket(
  quizCode: string | null | undefined,
  role: "teacher" | "student",
  token: string | null | undefined,
  onMessage: (message: Record<string, unknown>) => void
) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!quizCode || !token) return
    let closedByEffect = false
    let socket: WebSocket
    let retryTimer: ReturnType<typeof setTimeout>
    let pingTimer: ReturnType<typeof setInterval>

    function connect() {
      socket = new WebSocket(wsUrl(`/ws/live/${quizCode}?role=${role}&token=${encodeURIComponent(token!)}`))
      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data))
        } catch {
          // ignore malformed frames
        }
      }
      socket.onclose = () => {
        if (!closedByEffect) retryTimer = setTimeout(connect, 2000)
      }
      pingTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("ping")
      }, 25000)
    }

    connect()
    return () => {
      closedByEffect = true
      clearTimeout(retryTimer)
      clearInterval(pingTimer)
      socket?.close()
    }
  }, [quizCode, role, token])
}
