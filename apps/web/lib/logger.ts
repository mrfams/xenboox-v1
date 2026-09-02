import pino from "pino";

/**
 * Resolve the pino log level for the current environment.
 *
 * Order of precedence:
 * 1. Explicit `LOG_LEVEL` env var (validated against pino's levels).
 * 2. Environment-appropriate default — development/staging: `debug`
 *    (visibility wins), test: `silent` (keep CI output clean), anything
 *    else (production): `info` (cost + noise control; `debug` in prod
 *    would log every tRPC query with full params).
 */
export function resolveLogLevel(
  env: Record<string, string | undefined> = process.env,
): pino.LevelWithSilent {
  const explicit = env.LOG_LEVEL;
  if (explicit) {
    const known: pino.LevelWithSilent[] = [
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ];
    if (known.includes(explicit as pino.LevelWithSilent)) {
      return explicit as pino.LevelWithSilent;
    }
    // Invalid value: fall through to the env default rather than crashing
    // the whole app on a typo'd env var.
  }
  switch (env.NODE_ENV) {
    case "development":
      return "debug";
    case "test":
      return "silent";
    default:
      return "info";
  }
}

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
  level: resolveLogLevel(),
  base: { service: "xenboox-web" },
  redact: [
    "password",
    "secret",
    "token",
    "apiKey",
    "api_key",
    "accessKey",
    "access_key",
    "authorization",
    "cookie",
    "sessionId",
    "session_id",
    "AUTH_SECRET",
    "ANTHROPIC_API_KEY",
    "LANGFUSE_SECRET_KEY",
    "DATABASE_URL",
    "RESEND_API_KEY",
    "MONO_SECRET_KEY",
    "UPSTASH_REDIS_REST_TOKEN",
    "R2_*",
    "*secret*",
    "*password*",
    "*key*",
  ],
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// §4.7 — Bridge: send error/fatal logs to Sentry automatically.
// This captures ALL logger.error() and logger.error() calls across the
// codebase (226+ sites) without modifying each call site.
// Only runs server-side (Sentry is initialized in sentry.server.config.ts).
if (typeof window === "undefined") {
  const originalError = logger.error.bind(logger);
  logger.error = function (...args: Parameters<typeof originalError>) {
    originalError(...args);
    // Extract the first argument — could be error object, context object, or message
    try {
      const Sentry = require("@sentry/nextjs");
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg);
      } else if (typeof firstArg === "object" && firstArg !== null) {
        // Pino logger.error({ err }, "message") pattern
        const err = (firstArg as any).err || (firstArg as any).error;
        if (err instanceof Error) {
          Sentry.captureException(err);
        } else {
          Sentry.captureMessage(String(args[1] ?? "Unknown error"), "error");
        }
      } else {
        Sentry.captureMessage(String(firstArg ?? "Unknown error"), "error");
      }
    } catch {
      // Sentry not available — continue with Pino only
    }
  } as typeof logger.error;
}
