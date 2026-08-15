// ─── §1.7 Security headers — automated verification ──────────────────────────
//
// The middleware applies a full OWASP-grade header set to every response.
// These tests pin the exact policy so a future edit that weakens it
// (e.g. adding 'unsafe-eval' to production script-src) fails CI.

import { describe, it, expect } from "vitest";

import {
  applySecurityHeaders,
  buildCSP,
  buildDevCSP,
  generateCSP,
  generateNonce,
} from "@/lib/security/headers";

const H = (): Headers => new Headers();

describe("generateCSP", () => {
  it("appends the nonce to script-src only", () => {
    const csp = generateCSP({
      nonce: "abc123",
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    });
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("style-src");
  });

  it("omits directives that are not configured", () => {
    const csp = generateCSP({ defaultSrc: ["'self'"] });
    expect(csp).toBe("default-src 'self'");
    expect(csp).not.toContain("object-src");
    expect(csp).not.toContain("frame-ancestors");
  });
});

function directive(csp: string, name: string): string {
  const m = csp.match(new RegExp(`${name}\\s+([^;]+)`));
  return m ? m[1] : "";
}

describe("buildCSP (production)", () => {
  const csp = buildCSP(generateNonce());

  it("never allows unsafe-inline or unsafe-eval in script-src", () => {
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("always carries a nonce for script-src", () => {
    expect(csp).toMatch(
      /script-src 'self' (https:\/\/cdn\.jsdelivr\.net )?'nonce-[A-Za-z0-9+/=]+'/,
    );
  });

  it("blocks framing and object embedding", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
  });

  it("pins base-uri, form-action and default-src to self", () => {
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("allows inline styles (CSS-in-JS needs it; nonce applies to scripts only)", () => {
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe("buildDevCSP", () => {
  it("relaxes script-src for HMR/eval but keeps frame/object restrictions", () => {
    const csp = buildDevCSP();
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("applySecurityHeaders", () => {
  it("sets the complete OWASP header set with correct values", () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production"; // pin prod CSP (nonce) regardless of test env
    const h = H();
    applySecurityHeaders(h, "nonce123");
    env.NODE_ENV = prev;

    expect(h.get("Content-Security-Policy")).toContain("'nonce-nonce123'");
    expect(h.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(h.get("X-DNS-Prefetch-Control")).toBe("off");
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(h.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
  });

  it("honors per-header opt-out via config", () => {
    const h = H();
    applySecurityHeaders(h, "nonce123", {
      contentSecurityPolicy: false,
      strictTransportSecurity: false,
      xFrameOptions: false,
      permissionsPolicy: false,
    });
    expect(h.get("Content-Security-Policy")).toBeNull();
    expect(h.get("Strict-Transport-Security")).toBeNull();
    expect(h.get("X-Frame-Options")).toBeNull();
    expect(h.get("Permissions-Policy")).toBeNull();
    // Non-opt-out headers still present
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("never leaks the nonce across two calls (per-request nonces)", () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production";
    const h1 = H();
    const h2 = H();
    applySecurityHeaders(h1, "nonce-AAA");
    applySecurityHeaders(h2, "nonce-BBB");
    env.NODE_ENV = prev;
    expect(h1.get("Content-Security-Policy")).toContain("'nonce-nonce-AAA'");
    expect(h2.get("Content-Security-Policy")).toContain("'nonce-nonce-BBB'");
    expect(h1.get("Content-Security-Policy")).not.toContain("nonce-BBB");
  });

  it("generates unique nonces", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});
