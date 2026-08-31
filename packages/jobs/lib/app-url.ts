/**
 * Resolve the app URL for background jobs.
 *
 * Jobs run in production — NEXT_PUBLIC_APP_URL MUST be set.
 * Unlike the web app (which falls back to localhost in dev), jobs
 * should fail loudly if the URL is missing to avoid sending broken links.
 */
export function getJobAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    return url.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set in production — background jobs need a public URL for emails and links.",
    );
  }
  return "http://localhost:3000";
}
