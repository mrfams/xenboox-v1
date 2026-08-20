import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { userSettings } from "@xenboox/db/schema/user-settings"

// ─── In-memory store for connected clients ────────────────────────────────────

type Client = {
  id: string
  userId: string
  controller: ReadableStreamDefaultController
  lastSeen: Date
}

const clients = new Map<string, Client>()

// ─── Cleanup stale clients every 30 seconds ──────────────────────────────────

setInterval(() => {
  const now = new Date()
  for (const [id, client] of clients.entries()) {
    const age = now.getTime() - client.lastSeen.getTime()
    if (age > 60_000) { // 60 seconds stale
      try {
        client.controller.close()
      } catch {
        // Already closed
      }
      clients.delete(id)
    }
  }
}, 30_000)

// ─── GET: SSE stream ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  const clientId = `${userId}-${Date.now()}`

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const data = JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      })
      controller.enqueue(`data: ${data}\n\n`)

      // Register client
      clients.set(clientId, {
        id: clientId,
        userId,
        controller,
        lastSeen: new Date(),
      })

      // Send heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          const ping = JSON.stringify({ type: "heartbeat" })
          controller.enqueue(`data: ${ping}\n\n`)

          // Update last seen
          const client = clients.get(clientId)
          if (client) {
            client.lastSeen = new Date()
          }
        } catch {
          clearInterval(heartbeat)
          clients.delete(clientId)
        }
      }, 15_000)

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        clients.delete(clientId)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}

// ─── Helper: Notify clients of settings change ────────────────────────────────

export function notifySettingsChange(userId: string, settings: Record<string, unknown>) {
  const message = JSON.stringify({
    type: "settings_changed",
    settings,
    timestamp: new Date().toISOString(),
  })

  for (const [id, client] of clients.entries()) {
    if (client.userId === userId) {
      try {
        client.controller.enqueue(`data: ${message}\n\n`)
        client.lastSeen = new Date()
      } catch {
        clients.delete(id)
      }
    }
  }
}

// ─── Helper: Get connected client count ───────────────────────────────────────

export function getConnectedClients(userId: string): number {
  let count = 0
  for (const client of clients.values()) {
    if (client.userId === userId) count++
  }
  return count
}
