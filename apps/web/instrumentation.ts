// ─── Next.js 15 Instrumentation Hook ──────────────────────────────────────
//
// Runs once at server boot before any request is handled.
// Registers the OTel TracerProvider so all subsequent spans are captured.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { initOtel, shutdownOtel } from "@xenboox/models/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    initOtel();

    // Graceful shutdown
    const gracefulShutdown = async () => {
      await shutdownOtel();
      process.exit(0);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }
}
