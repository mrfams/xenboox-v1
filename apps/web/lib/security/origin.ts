/**
 * CSRF-style origin validation for state-changing requests.
 *
 * Strategy (defense-in-depth — Auth.js provides its own CSRF tokens; this
 * rejects cross-site requests at the edge before they reach any handler):
 * - No `host` header → reject (HTTP/1.0 or malformed client).
 * - Missing `origin` → allow only for GET/HEAD or requests that carry a
 *   content-type only browsers send on same-site fetches (JSON, form-data).
 *   A cross-site HTML form POST always sends `Origin`; absence on a POST of
 *   `text/plain`/`application/x-www-form-urlencoded` is the classic CSRF
 *   signature and is rejected.
 * - `origin` present → host must equal the request `host` (port-compared),
 *   which defeats DNS-rebinding and cross-origin form submissions.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!host) return false;
  if (!origin) {
    const method = req.method;
    if (method === "GET" || method === "HEAD") return true;
    const contentType = req.headers.get("content-type") ?? "";
    if (
      contentType.includes("application/json") ||
      contentType.includes("multipart/form-data")
    )
      return true;
    return false;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
