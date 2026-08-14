// ─── tRPC Tracing Middleware ───────────────────────────────────────────────
//
// Creates an OTel span for every tRPC procedure call.
// Captures: procedure path, type (query/mutation), entity_id, user_id, duration.
//
// Wired as the OUTERMOST middleware on every procedure chain in lib/trpc/server.ts
// so the span covers auth, entity scoping, rate limiting, and the resolver body.
// When no OTel provider is registered (dev, no collector), `trace.getTracer`
// returns the no-op tracer and span creation is free.

import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { AnyMiddlewareFunction } from "@trpc/server";

const tracer = trace.getTracer("xenboox-trpc");

export const tracingMiddleware: AnyMiddlewareFunction = async ({
  next,
  path,
  type,
  ctx,
}) => {
  const span = tracer.startSpan(`trpc.${path}`, {
    attributes: {
      "trpc.procedure": path ?? "unknown",
      "trpc.type": type,
      "user.id": ctx.session?.user?.id ?? "anonymous",
      "entity.id": ctx.entityId ?? "unknown",
    },
  });

  try {
    const result = await next({ ctx });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
};
