/**
 * Centralized app URL resolution.
 *
 * Production: NEXT_PUBLIC_APP_URL MUST be set — this function throws if it's missing.
 * Development: Falls back to http://localhost:3000.
 *
 * Use this instead of hardcoding "https://xenboox.vercel.app" or "http://localhost:3000"
 * anywhere in the codebase. The Vercel preview URL will change on every deploy;
 * a hardcoded value WILL break.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    // Strip trailing slash for consistency
    return url.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set in production — emails, sitemaps, and API docs require a public URL.",
    );
  }
  return "http://localhost:3000";
}

/**
 * Server-side only variant that also checks NEXTAUTH_URL as a fallback.
 * Use in server components, API routes, and tRPC context.
 */
export function getServerAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (url) {
    return url.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or NEXTAUTH_URL must be set in production.",
    );
  }
  return "http://localhost:3000";
}
