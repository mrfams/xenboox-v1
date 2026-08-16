// §15.1 — API base URL resolution. Never hardcode an environment.
//
// The desktop webview is served from a custom protocol (tauri://localhost),
// so relative URLs do NOT work — the API origin must be absolute.
//
// Resolution order:
//   1. `VITE_API_URL` — set at build time (`vite build --mode production`)
//      to the deployed Xenboox API origin (e.g. https://xenboox.vercel.app).
//   2. Dev fallback: http://localhost:3000 (local `pnpm dev` web server).
//   3. Production with no VITE_API_URL: throw a clear build-time error
//      instead of silently pointing at localhost (mirrors the web app's
//      `getAppUrl()` behavior).

export function getApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:3000";
  throw new Error(
    "VITE_API_URL is not set. Set it to the deployed Xenboox API origin " +
      "(e.g. https://xenboox.vercel.app) when building the desktop app.",
  );
}
