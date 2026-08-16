// ─── §2.1 Sentry source-map upload contract ────────────────────────────────
//
// next.config must be wired for automated source-map upload at build time
// (Vercel build → @sentry/nextjs webpack plugin) and must never ship source
// maps to the browser. Pins the config so a refactor that disables upload or
// drops the auth token wiring fails CI.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cfg = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("§2.1 — Sentry source-map upload is wired", () => {
  it("withSentryConfig is configured with org/project/authToken from env", () => {
    expect(cfg).toMatch(/withSentryConfig/);
    expect(cfg).toMatch(/SENTRY_ORG/);
    expect(cfg).toMatch(/SENTRY_PROJECT/);
    expect(cfg).toMatch(/SENTRY_AUTH_TOKEN/);
  });

  it("release is pinned to the commit SHA for deploy↔map alignment", () => {
    expect(cfg).toMatch(/VERCEL_GIT_COMMIT_SHA/);
    expect(cfg).toMatch(/release/);
  });

  it("source maps are deleted from the bundle after upload", () => {
    expect(cfg).toMatch(/deleteSourcemapsAfterUpload:\s*true/);
  });
});
