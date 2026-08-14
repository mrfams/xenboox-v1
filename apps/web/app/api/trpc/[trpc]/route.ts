import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";
import type { ResponseMetaFn } from "@trpc/server/http";

import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/lib/trpc/server";
import { rateLimitResponseMeta } from "@/lib/trpc/rate-limit-headers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ module: "trpc" });

// §19.4 — standard rate-limit headers. The rate-limit middleware stores the
// current window's state on ctx.rateLimitInfo; emit it as the conventional
// X-RateLimit-Limit/Remaining/Reset headers on every response, plus
// Retry-After (in seconds) when the request was actually rejected with 429.
const responseMeta: ResponseMetaFn<typeof appRouter> = ({ ctx, errors }) =>
  rateLimitResponseMeta({
    ctx: ctx as {
      rateLimitInfo?: { limit: number; remaining: number; reset: number };
    } | null,
    errors: errors as Array<{ code: string }>,
  });

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    responseMeta,
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
