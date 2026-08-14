import type { TRPCError } from "@trpc/server";

/**
 * §19.4 — Standard rate-limit response headers.
 *
 * The tRPC rate-limit middleware stores the current window's state on
 * `ctx.rateLimitInfo`; this pure function turns it into the conventional
 * X-RateLimit-Limit/Remaining/Reset headers on every response, plus a
 * Retry-After (in seconds) when the request was actually rejected with 429.
 *
 * Kept dependency-free (no tRPC imports) so it is trivially unit-testable.
 */

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset: number;
};

export type RateLimitResponseMetaInput = {
  ctx?: { rateLimitInfo?: RateLimitInfo } | null;
  errors: Array<{ code: string }>;
};

export function rateLimitResponseMeta({
  ctx,
  errors,
}: RateLimitResponseMetaInput): { headers: Record<string, string> } {
  const headers: Record<string, string> = {};

  if (ctx?.rateLimitInfo) {
    headers["x-ratelimit-limit"] = String(ctx.rateLimitInfo.limit);
    headers["x-ratelimit-remaining"] = String(ctx.rateLimitInfo.remaining);
    headers["x-ratelimit-reset"] = String(ctx.rateLimitInfo.reset);
  }

  const rejected = errors.find((e) => e.code === "TOO_MANY_REQUESTS");
  if (rejected && ctx?.rateLimitInfo) {
    const retryAfter = Math.max(
      1,
      ctx.rateLimitInfo.reset - Math.floor(Date.now() / 1000),
    );
    headers["retry-after"] = String(retryAfter);
  }

  return { headers };
}

/** Re-exported for convenience where a TRPCError array is already in hand. */
export function hasRateLimitRejection(
  errors: Array<Pick<TRPCError, "code">>,
): boolean {
  return errors.some((e) => e.code === "TOO_MANY_REQUESTS");
}
