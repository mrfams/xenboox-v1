// ─── §20.1 Idle session timeout ────────────────────────────────────────────
//
// JWT sessions expire on an absolute `maxAge`. Layering an idle timeout on
// top requires stamping `lastActivity` into the token on every request and
// invalidating (the jwt callback returns `null`) when the idle window elapses
// without activity.
//
// The stamp is throttled (at most once per IDLE_REFRESH_THROTTLE_MS) so a
// per-request Set-Cookie isn't emitted on every API call, which would defeat
// CDN caching. The effective timeout is therefore the configured window plus
// up to one throttle tick — acceptable for a 60-minute financial-app default.

export const IDLE_TIMEOUT_MS =
  (Number.parseInt(process.env.AUTH_IDLE_TIMEOUT_MINUTES ?? "60", 10) || 60) *
  60 *
  1000;

/** Minimum gap between lastActivity stamps — avoids Set-Cookie on every request. */
export const IDLE_REFRESH_THROTTLE_MS = 60 * 1000;

export type IdleAwareToken = {
  lastActivity?: number;
  [key: string]: unknown;
};

/**
 * Returns the token with a fresh `lastActivity` stamp, or `null` when the
 * idle window has elapsed (the caller must return null from the jwt callback
 * to invalidate the session).
 */
export function applyIdleTimeout(
  token: IdleAwareToken,
  now: number = Date.now(),
): IdleAwareToken | null {
  const last = token.lastActivity;
  if (last === undefined) {
    // Token without a stamp (e.g. issued before this feature) — treat as
    // fresh and stamp it so the timeout counts from here.
    token.lastActivity = now;
    return token;
  }
  if (now - last > IDLE_TIMEOUT_MS) return null;
  if (now - last >= IDLE_REFRESH_THROTTLE_MS) {
    token.lastActivity = now;
  }
  return token;
}
