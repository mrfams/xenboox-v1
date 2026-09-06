// ─── Batch 3 / G3 security hardening: N21–N24 ───────────────────────────────
// Authored RED-first; Run Phase pending.

import { describe, it, expect } from "vitest";
import { readFileSync as _rfs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// vitest runs with cwd=apps/web; resolve repo-root-relative fixtures.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFileSync = (p: string, enc: BufferEncoding = "utf8") =>
  _rfs(path.join(REPO_ROOT, p), enc);

describe("N21 Financial Pulse honest states", () => {
  const page = readFileSync(
    "apps/web/app/dashboard/financial-pulse/page.tsx",
    "utf8",
  );

  it("extracts loading AND error state from the core queries", () => {
    expect(page).toContain("isLoading: dashboardLoading");
    expect(page).toContain("isError: dashboardError");
    expect(page).toContain("isLoading: pnlLoading");
    expect(page).toContain("isError: pnlError");
  });

  it("the KPI strip renders a skeleton while loading — never zeros", () => {
    const section = page.slice(
      page.indexOf('aria-label="Key metrics"'),
      page.indexOf("aria-label=\"Key metrics\"") + 3000,
    );
    expect(section).toContain("pulseMetricsLoading");
    expect(section).toContain("animate-pulse");
    expect(section).toContain("aria-busy");
  });

  it("a failed query shows an explicit error — not a placeholder value", () => {
    expect(page).toContain("pulseMetricsError");
    expect(page).toContain("Nothing here is a placeholder value");
  });
});

describe("N22 tokens hashed at rest", () => {
  const auth = readFileSync("apps/web/server/routers/auth.ts", "utf8");

  it("defines hashToken and stores hashes for every token", () => {
    expect(auth).toContain("function hashToken(token: string): string");
    expect(auth).toContain("token: hashToken(verificationToken)");
    expect(auth).toContain("resetPasswordToken: hashToken(resetToken)");
  });

  it("looks tokens up by hash at consumption — raw tokens never queried", () => {
    expect(auth).toContain("eq(users.resetPasswordToken, hashToken(input.token))");
    expect(auth).toContain("eq(verificationTokens.token, hashToken(input.token))");
    expect(auth).not.toContain("eq(users.resetPasswordToken, input.token)");
    expect(auth).not.toContain("eq(verificationTokens.token, input.token)");
  });

  it("the raw token still goes to the user's email link", () => {
    expect(auth).toContain("reset-password?token=${resetToken}");
    expect(auth).toContain("verify-email?token=${verificationToken}");
  });
});

describe("N23 MFA attempt throttle", () => {
  const auth = readFileSync("apps/web/server/routers/auth.ts", "utf8");

  it("completeMfaChallenge rejects locked accounts before verifying", () => {
    const fn = auth.slice(
      auth.indexOf("completeMfaChallenge: publicProcedure"),
      auth.indexOf("disableMfa: protectedProcedure"),
    );
    expect(fn).toContain("lockoutUntil");
    expect(fn).toContain("TOO_MANY_REQUESTS");
  });

  it("counts failures durably on the user row with the same lockout policy", () => {
    const fn = auth.slice(
      auth.indexOf("completeMfaChallenge: publicProcedure"),
      auth.indexOf("disableMfa: protectedProcedure"),
    );
    expect(fn).toContain("recordMfaFailure");
    expect(fn).toContain("LOCKOUT_THRESHOLD");
    expect(fn).toContain("LOCKOUT_DURATION_MS");
  });

  it("success (TOTP and backup code) resets the counter", () => {
    const fn = auth.slice(
      auth.indexOf("completeMfaChallenge: publicProcedure"),
      auth.indexOf("disableMfa: protectedProcedure"),
    );
    const matches = fn.match(/failedLoginAttempts: 0/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("N24 SCIM constant-time compare", () => {
  const scim = readFileSync("apps/web/app/api/scim/v2/route.ts", "utf8");

  it("uses timingSafeEqual, never === on tokens", () => {
    expect(scim).toContain("timingSafeEqual(a, b)");
    expect(scim).not.toContain("return token === configuredToken");
  });

  it("equalizes timing for wrong-length guesses", () => {
    expect(scim).toContain("Buffer.alloc(a.length, \"x\")");
  });
});
