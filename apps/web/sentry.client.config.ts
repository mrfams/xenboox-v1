import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV || "development",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,

  ignoreErrors: [
    "AbortError",
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "NetworkError",
    "Failed to fetch",
  ],
});
