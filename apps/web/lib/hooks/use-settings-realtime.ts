"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type RealtimeState = {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastEvent: {
    type: string
    timestamp: string
  } | null
  settings: Record<string, unknown> | null
}

type RealtimeEvent = {
  type: "connected" | "heartbeat" | "settings_changed" | "error"
  settings?: Record<string, unknown>
  timestamp?: string
  clientId?: string
  message?: string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettingsRealtime(onSettingsChanged?: (settings: Record<string, unknown>) => void) {
  const { data: session } = useSession()
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
    settings: null,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10

  // ── Connect to SSE stream ──

  const connect = useCallback(() => {
    if (!session?.user?.id) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    const eventSource = new EventSource("/api/settings/stream")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      reconnectAttempts.current = 0
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }))
    }

    eventSource.onmessage = (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data)

        setState((prev) => ({
          ...prev,
          lastEvent: {
            type: data.type,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        }))

        switch (data.type) {
          case "connected":
            // Initial connection confirmed
            break

          case "heartbeat":
            // Keep-alive received
            break

          case "settings_changed":
            if (data.settings) {
              setState((prev) => ({
                ...prev,
                settings: data.settings!,
              }))
              onSettingsChanged?.(data.settings)
            }
            break

          case "error":
            setState((prev) => ({
              ...prev,
              error: data.message || "Unknown error",
            }))
            break
        }
      } catch {
        // Parse error, ignore
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null

      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: "Connection lost",
      }))

      // Exponential backoff reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30_000)
        reconnectAttempts.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }
  }, [session?.user?.id, onSettingsChanged])

  // ── Disconnect ──

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastEvent: null,
      settings: null,
    })
  }, [])

  // ── Auto-connect on mount ──

  useEffect(() => {
    if (session?.user?.id) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [session?.user?.id, connect, disconnect])

  // ── Visibility change: reconnect when tab becomes visible ──

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session?.user?.id) {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connect()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [session?.user?.id, connect])

  return {
    ...state,
    connect,
    disconnect,
  }
}
