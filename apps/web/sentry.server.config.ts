import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV || "development",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,

  // §3.4 — No Prisma integration. We use Drizzle ORM (Neon PostgreSQL).
  // Drizzle errors propagate through standard JS throw/catch and are
  // captured by Sentry's automatic exception listeners — no ORM-specific
  // integration needed.
  integrations: [],

  // §4.7 — Strip PII and sensitive data before sending to Sentry.
  beforeSend(event) {
    // Remove sensitive request headers
    if (event.request?.headers) {
      const sensitive = ["authorization", "cookie", "x-api-key", "x-entity-id"];
      for (const key of sensitive) {
        delete event.request.headers[key];
      }
    }
    // Remove sensitive data from extra
    if (event.extra) {
      delete event.extra.password;
      delete event.extra.secret;
      delete event.extra.token;
      delete event.extra.apiKey;
    }
    return event;
  },
});
