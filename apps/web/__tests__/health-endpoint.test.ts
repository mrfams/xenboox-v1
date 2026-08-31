import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all dependencies
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("@/lib/config", () => ({
  APP_CONFIG: { version: "0.1.0" },
}));

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn().mockReturnValue(null),
}));

describe("/api/health", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars to undefined so checks return not_configured
    delete process.env.RESEND_API_KEY;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
    delete process.env.MONO_SECRET_KEY;
    delete process.env.MONO_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns healthy when database is up and all integrations configured", async () => {
    // Mock fetch to avoid hitting real Resend API
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    // Set all env vars so integrations show as "up"
    process.env.RESEND_API_KEY = "re_test_key_123";
    process.env.SENTRY_DSN = "https://abc@o1234.ingest.sentry.io/5678";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key_1234567890";
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-123";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-123";
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-access";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.PLAID_CLIENT_ID = "test-plaid-id";
    process.env.PLAID_SECRET = "test-plaid-secret";
    process.env.MONO_SECRET_KEY = "test-mono-key";
    process.env.MONO_WEBHOOK_SECRET = "test-mono-webhook";

    try {
      const { GET } = await import("@/app/api/health/route");
      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe("healthy");
      expect(body.checks.database.status).toBe("up");
      expect(body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(body.version).toBe("0.1.0");
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns unhealthy when database is down", async () => {
    const { db } = await import("@/lib/db");
    (db.execute as any).mockRejectedValue(new Error("Connection refused"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("down");
    expect(body.checks.database.error).toContain("Connection refused");
    expect(response.status).toBe(503);
  });

  it("marks redis as not_configured when Upstash not set", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.redis.status).toBe("not_configured");
    expect(body.checks.redis.error).toContain("Upstash not configured");
  });

  it("marks resend as not_configured when API key missing", async () => {
    delete process.env.RESEND_API_KEY;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.resend.status).toBe("not_configured");
    expect(body.checks.resend.error).toContain("RESEND_API_KEY");
  });

  it("marks sentry as not_configured when DSN missing", async () => {
    delete process.env.SENTRY_DSN;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.sentry.status).toBe("not_configured");
    expect(body.checks.sentry.error).toContain("SENTRY_DSN");
  });

  it("marks posthog as not_configured when key missing", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.posthog.status).toBe("not_configured");
    expect(body.checks.posthog.error).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  it("marks langfuse as not_configured when keys missing", async () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.langfuse.status).toBe("not_configured");
    expect(body.checks.langfuse.error).toContain("LANGFUSE");
  });

  it("marks r2 as not_configured when credentials missing", async () => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.r2.status).toBe("not_configured");
    expect(body.checks.r2.error).toContain("Missing:");
  });

  it("marks plaid as not_configured when credentials missing", async () => {
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.plaid.status).toBe("not_configured");
    expect(body.checks.plaid.error).toContain("PLAID_CLIENT_ID");
  });

  it("marks mono as not_configured when secret missing", async () => {
    delete process.env.MONO_SECRET_KEY;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.mono.status).toBe("not_configured");
    expect(body.checks.mono.error).toContain("MONO_SECRET_KEY");
  });

  it("returns all 9 integration checks", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(Object.keys(body.checks)).toEqual(
      expect.arrayContaining([
        "database",
        "redis",
        "resend",
        "sentry",
        "posthog",
        "langfuse",
        "r2",
        "plaid",
        "mono",
      ]),
    );
  });

  it("returns healthy when only non-critical services are not_configured", async () => {
    // Explicitly reset database mock to success
    const { db } = await import("@/lib/db");
    (db.execute as any).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.resend.status).toBe("not_configured");
    expect(body.checks.sentry.status).toBe("not_configured");
  });

  it("includes cache header", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toContain("max-age=30");
  });
});
