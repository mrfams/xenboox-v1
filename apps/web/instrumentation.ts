// ─── Next.js 15 Instrumentation Hook ──────────────────────────────────────
//
// Runs once at server boot before any request is handled.
// Registers the OTel TracerProvider so all subsequent spans are captured.
// Also registers the Sentry `onRequestError` hook so errors raised in nested
// React Server Components / route handlers reach Sentry (the SDK can't hook
// these itself — Next must hand them over, see Sentry's Next.js manual setup:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// ⚠️ EDGE RUNTIME SAFETY — why OTel is imported dynamically:
// Next.js compiles this same file into BOTH the Node.js and the Edge
// instrumentation entries (`server/instrumentation.js` and
// `server/edge-instrumentation.js`). A static top-level import of
// `@xenboox/models/otel` would drag `@opentelemetry/sdk-node` and its
// `@grpc/grpc-js` chain into the edge bundle, where the Node builtins
// (`stream`, `fs`, `tls`, `net`) don't exist — "Module not found: Can't
// resolve 'stream'". Per the Next.js docs, runtime-specific code must be
// imported inside `register()` guarded by `NEXT_RUNTIME`. `register()` is
// a no-op on edge (NEXT_RUNTIME === "edge"), so the OTel SDK is never
// loaded there, and `next.config.ts` additionally externalizes the
// NodeSDK chain for edge bundles so webpack never even attempts to
// bundle it.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initOtel, shutdownOtel } = await import("@xenboox/models/otel");
    await initOtel();

    // Graceful shutdown
    const gracefulShutdown = async () => {
      await shutdownOtel();
      process.exit(0);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }
}

// §3.4 — Sentry: capture errors from nested React Server Components and
// route handlers. Next.js 15 calls this hook for every request-scoped error
// that bubbles past the component boundary; without it, RSC render failures
// are silently dropped even with Sentry.init() configured.
export const onRequestError = Sentry.captureRequestError;
