// ─── Next.js 15 Instrumentation Hook ──────────────────────────────────────
//
// Runs once at server boot before any request is handled.
// Registers the OTel TracerProvider so all subsequent spans are captured.
// Also registers the Sentry `onRequestError` hook so errors raised in nested
// React Server Components / route handlers reach Sentry (the SDK can't hook
// these itself — Next must hand them over, see Sentry's Next.js manual setup:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { initOtel, shutdownOtel } from "@xenboox/models/otel";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
