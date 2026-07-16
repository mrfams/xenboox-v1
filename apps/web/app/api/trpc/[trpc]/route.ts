import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { TRPCError } from "@trpc/server"
import { appRouter } from "@/server/routers/_app"
import { createTRPCContext } from "@/lib/trpc/server"

export const dynamic = "force-dynamic"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      const entityId = req.headers.get("x-entity-id") || undefined
      return {
        ...createTRPCContext(),
        entityId,
        headers: Object.fromEntries(req.headers.entries())
      }
    },
    onError: ({ error, path }: { error: Error; path?: string }) => {
      if (error instanceof TRPCError) {
        console.warn(`tRPC [${error.code}] on ${path}: ${error.message}`)
      } else {
        console.error(`tRPC unhandled error on ${path}:`, error)
      }
    }
  })

export { handler as GET, handler as POST }