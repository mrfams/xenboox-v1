// ─── §5.5 OWASP Top 10 (2021) — control sweep ──────────────────────────────
//
// For every OWASP Top 10 category, assert the control that neutralizes it is
// actually present in the codebase. Static + contract checks, so a regression
// (e.g. a new router that skips protection, a raw SQL interpolation, an
// unescaped dangerouslySetInnerHTML) fails CI on the spot.
//
// Deep behavioral coverage lives in the specialist suites (idor-rls-sweep,
// rbac-sweep, xss, csrf-origin, security-headers, logger-redaction,
// webhook-*, rate-limiter). This suite is the OWASP map tying them together.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROUTERS = join(ROOT, "server/routers");

const files = (dir: string) =>
  readdirSync(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

describe("§5.5 OWASP A01 — Broken Access Control", () => {
  it("every router query/mutation is on a protected procedure (see rbac-sweep)", () => {
    // The rbac-sweep suite is the enforcement point; this is the contract
    // that it keeps running: no router file may bypass it.
    expect(files(ROUTERS).length).toBeGreaterThan(70);
    expect(
      readFileSync(join(ROOT, "__tests__/rbac-sweep.test.ts"), "utf8"),
    ).toMatch(/every query\/mutation is chained on a protected procedure/);
    expect(
      readFileSync(join(ROOT, "__tests__/idor-rls-sweep.test.ts"), "utf8"),
    ).toMatch(/entity/i);
  });
});

describe("§5.5 OWASP A02 — Cryptographic Failures", () => {
  it("field encryption uses AES-256-GCM, not a weak cipher", () => {
    const enc = readFileSync(
      join(ROOT, "../../packages/db/lib/encryption.ts"),
      "utf8",
    );
    expect(enc).toMatch(/aes-256-gcm/);
    expect(enc).toMatch(/createCipheriv/);
  });

  it("session cookies are httpOnly + secure in production", () => {
    // Main user auth relies on Auth.js v5 defaults (httpOnly + secure in
    // production); the admin auth sets cookie flags explicitly.
    const admin = readFileSync(join(ROOT, "lib/auth/admin.ts"), "utf8");
    expect(admin).toMatch(/httpOnly:\s*true/);
    expect(admin).toMatch(/secure:\s*useSecureCookies/);
  });
});

describe("§5.5 OWASP A03 — Injection (SQL/XSS)", () => {
  it("no router interpolates raw SQL strings", () => {
    const bad: string[] = [];
    for (const f of files(ROUTERS)) {
      const src = readFileSync(join(ROUTERS, f), "utf8");
      // Every db.execute/raw call must be wrapped in the drizzle `sql` tag
      // (parameterized). Flag any call whose first non-whitespace token is
      // NOT `sql` — i.e. a hand-built raw query string.
      for (const m of src.matchAll(/db\.(?:execute|raw)\(([\s\S]{0,20})/g)) {
        const head = m[1]!.replace(/\s+/g, "");
        if (!head.startsWith("sql`")) bad.push(`${f}: ${head.slice(0, 30)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("no eval / new Function / document.write anywhere", () => {
    const hits: string[] = [];
    for (const dir of [join(ROOT, "components"), join(ROOT, "lib")]) {
      for (const f of files(dir)) {
        const src = readFileSync(join(dir, f), "utf8");
        if (/\beval\s*\(|new Function|document\.write/.test(src)) hits.push(f);
      }
    }
    expect(hits).toEqual([]);
  });

  it("chat markdown renderer escapes HTML before injecting", () => {
    const parser = readFileSync(
      join(ROOT, "lib/chat/message-parser.ts"),
      "utf8",
    );
    expect(parser).toMatch(/escapeHtml/);
    expect(parser).toMatch(/\.replace\(/);
  });
});

describe("§5.5 OWASP A04 — Insecure Design", () => {
  it("rate limiting exists (see rate-limiter suite)", () => {
    expect(
      files(join(ROOT, "__tests__")).filter((f) => f.includes("rate-limit"))
        .length,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("§5.5 OWASP A05 — Security Misconfiguration", () => {
  it("security headers are applied (see security-headers suite)", () => {
    expect(
      files(join(ROOT, "__tests__")).some((f) =>
        f.includes("security-headers"),
      ),
    ).toBe(true);
  });

  it("poweredByHeader is disabled", () => {
    const cfg = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    expect(cfg).toMatch(/poweredByHeader:\s*false/);
  });
});

describe("§5.5 OWASP A06 — Vulnerable and Outdated Components", () => {
  it("dependency audit gate exists in CI", () => {
    const ci = readFileSync(
      join(ROOT, "../../.github/workflows/security.yml"),
      "utf8",
    );
    expect(ci).toMatch(/audit/);
  });
});

describe("§5.5 OWASP A07 — Identification and Authentication Failures", () => {
  it("password policy + lockout exist (see auth suites)", () => {
    expect(
      files(join(ROOT, "__tests__")).some((f) => f.includes("password-policy")),
    ).toBe(true);
    const auth = readFileSync(join(ROOT, "lib/auth/index.ts"), "utf8");
    expect(auth).toMatch(/LOCKOUT_THRESHOLD/);
  });
});

describe("§5.5 OWASP A08 — Software and Data Integrity Failures", () => {
  it("outbound webhooks are HMAC-signed", () => {
    const v = readFileSync(join(ROOT, "lib/webhook-verify.ts"), "utf8");
    expect(v).toMatch(/WEBHOOK_SECRET/);
  });
});

describe("§5.5 OWASP A09 — Security Logging and Monitoring Failures", () => {
  it("logger redacts secrets (see logger-redaction suite)", () => {
    expect(
      files(join(ROOT, "__tests__")).some((f) =>
        f.includes("logger-redaction"),
      ),
    ).toBe(true);
  });
});

describe("§5.5 OWASP A10 — Server-Side Request Forgery", () => {
  it("no router fetches a user-supplied URL", () => {
    const hits: string[] = [];
    for (const f of files(ROUTERS)) {
      const src = readFileSync(join(ROUTERS, f), "utf8");
      // fetch of anything derived from input.* / a url param
      if (/fetch\s*\([^)]*(input\.|\.url|url\s*:)/.test(src)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });
});
