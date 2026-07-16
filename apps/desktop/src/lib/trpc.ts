// @ts-nocheck — Placeholder AppRouter type until shared API package exports the real one
import { createTRPCReact, httpBatchLink } from "@trpc/react-query"
import { getCurrentEntityId, getToken } from "./auth"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  return "http://localhost:3000"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact<any>()

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          const token = await getToken()
          const entityId = await getCurrentEntityId()

          return {
            Authorization: token ? `Bearer ${token}` : "",
            "x-entity-id": entityId || ""
          }
        }
      })
    ]
  })
}
