import { describe, it, expect } from "vitest";
import { rateLimitResponseMeta } from "@/lib/trpc/rate-limit-headers";

describe("§19.4 rate-limit response headers", () => {
  it("emits X-RateLimit headers when ctx.rateLimitInfo is present", () => {
    const { headers } = rateLimitResponseMeta({
      ctx: {
        rateLimitInfo: { limit: 500, remaining: 412, reset: 1_700_000_000 },
      },
      errors: [],
    });
    expect(headers["x-ratelimit-limit"]).toBe("500");
    expect(headers["x-ratelimit-remaining"]).toBe("412");
    expect(headers["x-ratelimit-reset"]).toBe("1700000000");
  });

  it("emits Retry-After on 429 rejection, seconds until window reset", () => {
    // Simulate a window reset 45s in the future.
    const futureReset = Math.floor(Date.now() / 1000) + 45;
    const { headers } = rateLimitResponseMeta({
      ctx: { rateLimitInfo: { limit: 500, remaining: 0, reset: futureReset } },
      errors: [{ code: "TOO_MANY_REQUESTS" }],
    });
    expect(headers["retry-after"]).toBe("45");
    expect(headers["x-ratelimit-remaining"]).toBe("0");
  });

  it("does not emit Retry-After when the rejection is not a rate limit", () => {
    const { headers } = rateLimitResponseMeta({
      ctx: {
        rateLimitInfo: { limit: 500, remaining: 100, reset: 1_700_000_000 },
      },
      errors: [{ code: "UNAUTHORIZED" }],
    });
    expect(headers["retry-after"]).toBeUndefined();
    expect(headers["x-ratelimit-limit"]).toBe("500");
  });

  it("never emits a sub-second Retry-After (floors at 1)", () => {
    // Reset in the past relative to now → Retry-After must still be ≥ 1.
    const pastReset = Math.floor(Date.now() / 1000) - 5;
    const { headers } = rateLimitResponseMeta({
      ctx: { rateLimitInfo: { limit: 200, remaining: 0, reset: pastReset } },
      errors: [{ code: "TOO_MANY_REQUESTS" }],
    });
    expect(Number(headers["retry-after"])).toBeGreaterThanOrEqual(1);
  });

  it("returns no headers when ctx.rateLimitInfo is absent", () => {
    const { headers } = rateLimitResponseMeta({ ctx: null, errors: [] });
    expect(Object.keys(headers)).toHaveLength(0);
  });
});
