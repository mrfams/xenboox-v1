// AppRouter type export for tRPC clients (mobile, desktop)
// This re-exports the AppRouter type from the web app's tRPC router.
// Used by createTRPCReact<AppRouter>() for full type safety.

export type { AppRouter } from "../../apps/web/server/routers/_app"
