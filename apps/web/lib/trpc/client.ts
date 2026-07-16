"use client"

import { createTRPCReact, httpBatchLink } from "@trpc/react-query"
import type { AppRouter } from "@/server/routers/_app"

export const trpc = createTRPCReact<AppRouter>()

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        headers() {
          const entityId = localStorage.getItem("currentEntityId")
          return {
            "x-entity-id": entityId || "",
            "x-idempotency-key": generateIdempotencyKey(),
          }
        }
      })
    ]
  })
}
