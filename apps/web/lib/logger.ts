import pino from "pino";

/**
 * Xenboox web logger.
 *
 * IMPORTANT: We intentionally do NOT use pino's `transport` option (worker
 * threads, e.g. `target: "pino-pretty"`). Worker transports cannot be
 * resolved inside Next.js's webpack server bundle and crash module
 * evaluation with `unable to determine transport target for "pino-pretty"`.
 * That crash propagates to every route importing the logger — including
 * `/api/auth/*` — which took down sign-in entirely.
 *
 * Plain JSON output is also the correct enterprise choice for web server
 * logs: structured, greppable, and ingestible by any log pipeline
 * (CloudWatch, Datadog, Grafana Loki, etc.).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "xenboox-web" },
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
