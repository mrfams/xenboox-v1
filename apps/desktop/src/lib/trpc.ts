import { createTRPCReact, httpBatchLink } from "@trpc/react-query"
import type { AppRouter } from "@xenboox/api/app-router"
import { getCurrentEntityId, getToken } from "./auth"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  return "http://localhost:3000"
}

export const trpc = createTRPCReact<AppRouter>()

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
