// ─── §20.4 Logger redaction ──────────────────────────────────────────────────
//
// Pino redact must strip sensitive env var names and common secret field
// names from every log line so they never leak into structured logs,
// Sentry breadcrumbs, or LangFuse traces.

import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync } from "node:fs";

import { describe, it, expect } from "vitest";

describe("logger redaction config", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const loggerPath = path.join(__dirname, "..", "lib", "logger.ts");
  const content = readFileSync(loggerPath, "utf-8");

  it("includes known secret env var names in the redact list", () => {
    expect(content).toContain("AUTH_SECRET");
    expect(content).toContain("ANTHROPIC_API_KEY");
    expect(content).toContain("LANGFUSE_SECRET_KEY");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("RESEND_API_KEY");
    expect(content).toContain("MONO_SECRET_KEY");
    expect(content).toContain("UPSTASH_REDIS_REST_TOKEN");
  });

  it("includes common secret field names in the redact list", () => {
    expect(content).toContain("password");
    expect(content).toContain("secret");
    expect(content).toContain("token");
    expect(content).toContain("apiKey");
    expect(content).toContain("authorization");
    expect(content).toContain("cookie");
    expect(content).toContain("sessionId");
  });

  it("includes wildcard patterns for catch-all secret fields", () => {
    expect(content).toContain("*secret*");
    expect(content).toContain("*password*");
    expect(content).toContain("*key*");
  });
});
