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

describe("/api/health/deep", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
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
    globalThis.fetch = originalFetch;
  });

  it("returns deep mode indicator", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.mode).toBe("deep");
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it("marks resend as not_configured when API key missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.resend.status).toBe("not_configured");
    expect(body.checks.resend.error).toContain("RESEND_API_KEY");
  });

  it("deep checks Resend API when configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key_123";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.resend.status).toBe("up");
    expect(body.checks.resend.deepChecked).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/domains",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key_123",
        }),
      }),
    );
  });

  it("detects invalid Resend API key (401)", async () => {
    process.env.RESEND_API_KEY = "re_invalid_key";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.resend.status).toBe("down");
    expect(body.checks.resend.error).toContain("401 Unauthorized");
    expect(body.checks.resend.deepChecked).toBe(true);
  });

  it("detects Resend network failure", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.resend.status).toBe("down");
    expect(body.checks.resend.error).toContain("fetch failed");
    expect(body.checks.resend.deepChecked).toBe(true);
  });

  it("deep checks LangFuse API when configured", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-123";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-456";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.langfuse.status).toBe("up");
    expect(body.checks.langfuse.deepChecked).toBe(true);
  });

  it("detects invalid LangFuse credentials (401)", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-invalid";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-invalid";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.langfuse.status).toBe("down");
    expect(body.checks.langfuse.error).toContain("401 Unauthorized");
    expect(body.checks.langfuse.deepChecked).toBe(true);
  });

  it("deep checks Sentry ingest when configured", async () => {
    process.env.SENTRY_DSN = "https://abc123@o1234.ingest.sentry.io/5678";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.sentry.status).toBe("up");
    expect(body.checks.sentry.deepChecked).toBe(true);
    // Should POST to the Sentry ingest endpoint
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("sentry.io"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("marks sentry as not_configured when DSN missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.sentry.status).toBe("not_configured");
    expect(body.checks.sentry.error).toContain("SENTRY_DSN");
  });

  it("marks langfuse as not_configured when keys missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.langfuse.status).toBe("not_configured");
    expect(body.checks.langfuse.error).toContain("LANGFUSE");
  });

  it("marks plaid as not_configured when credentials missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.plaid.status).toBe("not_configured");
    expect(body.checks.plaid.error).toContain("PLAID_CLIENT_ID");
  });

  it("marks mono as not_configured when secret missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.mono.status).toBe("not_configured");
    expect(body.checks.mono.error).toContain("MONO_SECRET_KEY");
  });

  it("marks r2 as not_configured when credentials missing", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.r2.status).toBe("not_configured");
    expect(body.checks.r2.error).toContain("Missing:");
  });

  it("returns all 9 integration checks", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
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
    const { db } = await import("@/lib/db");
    (db.execute as any).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.resend.status).toBe("not_configured");
  });

  it("returns unhealthy when database is down", async () => {
    const { db } = await import("@/lib/db");
    (db.execute as any).mockRejectedValue(new Error("Connection refused"));

    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("down");
    expect(response.status).toBe(503);
  });

  it("does not cache deep check results", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toContain("no-cache");
  });

  it("reports deep check count in header", async () => {
    const { GET } = await import("@/app/api/health/deep/route");
    const response = await GET();
    const header = response.headers.get("X-Deep-Checks");

    // With all env vars deleted, deep checks should be 0 (all not_configured)
    // except database and redis which always do deep checks
    expect(header).toMatch(/^\d+\/9$/);
  });
});
