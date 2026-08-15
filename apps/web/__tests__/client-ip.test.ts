// ─── §19.2 Trusted-proxy client IP extraction — spoofing defense ───────────
//
// Rate-limit keys derived from raw `x-forwarded-for` are spoofable: a client
// can prepend arbitrary addresses. The extraction must use Vercel's
// authoritative header first, then the RIGHTMOST hop of x-forwarded-for
// (client-prepended values sit left of the proxy's own observation).

import { describe, it, expect } from "vitest";

import { getClientIp } from "@/lib/security/client-ip";

const H = (obj: Record<string, string>) => ({
  get: (name: string) => obj[name.toLowerCase()] ?? null,
});

describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for (authoritative, never client-writable)", () => {
    const ip = getClientIp(
      H({
        "x-vercel-forwarded-for": "41.77.244.14",
        "x-forwarded-for": "203.0.113.9, 198.51.100.7, 41.77.244.14",
        "x-real-ip": "198.51.100.7",
      }),
    );
    expect(ip).toBe("41.77.244.14");
  });

  it("takes the RIGHTMOST hop of x-forwarded-for, ignoring spoofed prefixes", () => {
    // Client prepends a fake address; the proxy appends the real one.
    const ip = getClientIp(
      H({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }),
    );
    expect(ip).toBe("198.51.100.7");
  });

  it("handles a single-hop chain", () => {
    expect(getClientIp(H({ "x-forwarded-for": "41.77.244.14" }))).toBe(
      "41.77.244.14",
    );
  });

  it("strips ports, IPv6 brackets, and zone ids", () => {
    expect(getClientIp(H({ "x-forwarded-for": "[2001:db8::1]:443" }))).toBe(
      "2001:db8::1",
    );
    expect(getClientIp(H({ "x-real-ip": "192.0.2.1:8080" }))).toBe("192.0.2.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent or junk", () => {
    expect(getClientIp(H({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(
      getClientIp(H({ "x-forwarded-for": "   ", "x-real-ip": "10.0.0.1" })),
    ).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no usable address exists — never an empty key", () => {
    expect(getClientIp(H({}))).toBe("unknown");
    expect(getClientIp(H({ "x-forwarded-for": "unknown, , [::]" }))).toBe(
      "unknown",
    );
  });

  it("works against a plain object (no .get) for tRPC header records", () => {
    expect(
      getClientIp({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }),
    ).toBe("198.51.100.7");
  });
});
