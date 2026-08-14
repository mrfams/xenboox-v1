// ─── §1.7 CSRF — cross-site request defense at the edge ──────────────────────
//
// validateOrigin runs in middleware for every state-changing /api request
// (Auth.js tokens are the second layer). These tests exercise the spoofing
// and browser-behavior surface: missing/mismatched origins, port tricks,
// DNS-rebinding, and the content-type carve-outs.

import { describe, it, expect } from "vitest";
import { validateOrigin } from "@/lib/security/origin";

// Duck-typed request: validateOrigin only reads req.headers.get(). Using a
// real Request is env-dependent — happy-dom (the test environment) enforces
// the fetch spec's forbidden-header rules and silently drops a manually set
// `host`, while undici keeps it, so same-origin cases would fail under
// happy-dom and pass under Node.
function req(
  opts: {
    method?: string;
    host?: string;
    origin?: string | null;
    contentType?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (opts.host) headers.set("host", opts.host);
  if (opts.origin !== undefined && opts.origin !== null)
    headers.set("origin", opts.origin);
  if (opts.contentType) headers.set("content-type", opts.contentType);
  return {
    method: opts.method ?? "POST",
    headers: { get: (name: string) => headers.get(name) },
  } as unknown as Request;
}

describe("validateOrigin", () => {
  it("accepts same-origin mutation requests", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          origin: "https://xenboox.com",
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-origin mutation requests (the CSRF vector)", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          origin: "https://evil.example",
        }),
      ),
    ).toBe(false);
  });

  it("rejects host mismatch through a different port", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          origin: "https://xenboox.com:8443",
        }),
      ),
    ).toBe(false);
  });

  it("rejects DNS-rebinding tricks (origin host ≠ Host header)", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          origin: "https://xenboox.com.evil.example",
        }),
      ),
    ).toBe(false);
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          origin: "https://evilxenboox.com",
        }),
      ),
    ).toBe(false);
  });

  it("rejects malformed origin values", () => {
    expect(
      validateOrigin(
        req({ method: "POST", host: "xenboox.com", origin: "not a url" }),
      ),
    ).toBe(false);
    expect(
      validateOrigin(
        req({ method: "POST", host: "xenboox.com", origin: "//xenboox.com" }),
      ),
    ).toBe(false);
    expect(
      validateOrigin(
        req({ method: "POST", host: "xenboox.com", origin: "null" }),
      ),
    ).toBe(false);
  });

  it("rejects requests with no Host header", () => {
    expect(
      validateOrigin(req({ method: "POST", origin: "https://xenboox.com" })),
    ).toBe(false);
  });

  it("blocks cross-site form POSTs that omit Origin (text/plain, urlencoded)", () => {
    // Browsers send Origin on cross-site form posts; its absence with a
    // non-JSON content-type is the CSRF signature.
    expect(
      validateOrigin(
        req({ method: "POST", host: "xenboox.com", contentType: "text/plain" }),
      ),
    ).toBe(false);
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          contentType: "application/x-www-form-urlencoded",
        }),
      ),
    ).toBe(false);
  });

  it("allows origin-less JSON and multipart mutations (same-site fetch paths)", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "xenboox.com",
          contentType: "application/json",
        }),
      ),
    ).toBe(true);
    expect(
      validateOrigin(
        req({
          method: "PUT",
          host: "xenboox.com",
          contentType: "multipart/form-data; boundary=----x",
        }),
      ),
    ).toBe(true);
  });

  it("allows GET/HEAD without an origin", () => {
    expect(validateOrigin(req({ method: "GET", host: "xenboox.com" }))).toBe(
      true,
    );
    expect(validateOrigin(req({ method: "HEAD", host: "xenboox.com" }))).toBe(
      true,
    );
  });

  it("accepts matching origins over http and with subdomains", () => {
    expect(
      validateOrigin(
        req({
          method: "POST",
          host: "app.xenboox.com",
          origin: "http://app.xenboox.com",
        }),
      ),
    ).toBe(true);
  });
});
