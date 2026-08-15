import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV || "development",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,

  // §4.7 — Core Web Vitals (LCP/CLS/INP/FCP/TTFB) are captured as browser
  // spans only when tracing is active. Without this integration Sentry
  // reports errors but NO performance data — the Web Vitals dashboard stays
  // empty. Enables navigation spans + vitals instrumentation automatically.
  integrations: [Sentry.browserTracingIntegration()],

  ignoreErrors: [
    "AbortError",
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "NetworkError",
    "Failed to fetch",
  ],
});
