import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";

import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/lib/trpc/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ module: "trpc" });

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      const entityId = req.headers.get("x-entity-id") || undefined;
      return {
        ...createTRPCContext(),
        entityId,
        headers: Object.fromEntries(req.headers.entries()),
      };
    },
    onError: ({ error, path }: { error: Error; path?: string }) => {
      if (error instanceof TRPCError) {
        log.warn({ code: error.code, path }, error.message);
      } else {
        log.error({ path, err: error }, "Unhandled tRPC error");
      }
    },
  });

export { handler as GET, handler as POST };
