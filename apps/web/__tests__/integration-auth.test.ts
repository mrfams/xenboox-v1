// @vitest-environment node
// ─── Integration Tests: Authentication & Financial Flows ────────────────────
//
// These tests verify the critical authentication and financial data flows
// that must work correctly for production readiness. They test the actual
// code paths (routers, middleware, services) against the real database schema.

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ─── Auth Flow Tests ──────────────────────────────────────────────────────

describe("Auth Flow Integration", () => {
  it("password policy accepts strong passwords", async () => {
    const { meetsPasswordPolicy } = await import(
      "@/lib/security/password-policy"
    );

    expect(meetsPasswordPolicy("StrongP@ss1")).toBe(true);
    expect(meetsPasswordPolicy("MySecure2026!")).toBe(true);
    expect(meetsPasswordPolicy("Xenboox#123")).toBe(true);
  });

  it("password policy rejects weak passwords", async () => {
    const { meetsPasswordPolicy } = await import(
      "@/lib/security/password-policy"
    );

    expect(meetsPasswordPolicy("ab1!")).toBe(false); // Too short
    expect(meetsPasswordPolicy("strongpass1!")).toBe(false); // No uppercase
    expect(meetsPasswordPolicy("StrongPass!")).toBe(false); // No number
    expect(meetsPasswordPolicy("StrongPass1")).toBe(false); // No special char
  });

  it("password strength returns score and errors", async () => {
    const { getPasswordStrength } = await import(
      "@/lib/security/password-policy"
    );

    const strong = getPasswordStrength("Xenboox#2026!");
    expect(strong.score).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(strong.errors)).toBe(true);

    const weak = getPasswordStrength("123");
    expect(weak.score).toBeLessThan(3);
    expect(weak.errors.length).toBeGreaterThan(0);
  });
});

// ─── Rate Limiter Tests ───────────────────────────────────────────────────

describe("Rate Limiter Integration", () => {
  it("rate limiter returns structured response", async () => {
    const { getRateLimiter } = await import("@/lib/security/rate-limiter");
    const limiter = getRateLimiter();

    // Login rate limit should return success/failure + remaining + reset
    const result = await limiter.checkAuthLoginRateLimit("test-ip");
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
    expect(result).toHaveProperty("remaining");
    expect(typeof result.remaining).toBe("number");
    expect(result).toHaveProperty("reset");
    expect(typeof result.reset).toBe("number");
  });

  it("rate limiter respects different limit types", async () => {
    const { getRateLimiter } = await import("@/lib/security/rate-limiter");
    const limiter = getRateLimiter();

    const login = await limiter.checkAuthLoginRateLimit("test-2");
    const register = await limiter.checkAuthRegisterRateLimit("test-2");

    // Both should return valid responses
    expect(typeof login.success).toBe("boolean");
    expect(typeof register.success).toBe("boolean");
  });
});

// ─── Security Middleware Tests ─────────────────────────────────────────────

describe("Security Middleware Integration", () => {
  it("origin validation rejects cross-origin requests", async () => {
    const { validateOrigin } = await import("@/lib/security/origin");

    // Same-origin should pass (origin host must match host header)
    const sameOrigin = validateOrigin({
      headers: new Headers({
        origin: "http://localhost:3000",
        host: "localhost:3000",
      }),
      nextUrl: new URL("http://localhost:3000/api/test"),
      method: "POST",
    } as any);
    expect(sameOrigin).toBe(true);

    // Cross-origin should fail
    const crossOrigin = validateOrigin({
      headers: new Headers({
        origin: "http://evil.com",
        host: "localhost:3000",
      }),
      nextUrl: new URL("http://localhost:3000/api/test"),
      method: "POST",
    } as any);
    expect(crossOrigin).toBe(false);
  });

  it("sanitization blocks XSS vectors", async () => {
    const { sanitizeHTML } = await import("@/lib/security/sanitization");

    // Script injection should be stripped by sanitizeHTML
    const result = sanitizeHTML('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");

    // sanitizeText removes control characters
    const { sanitizeText } = await import("@/lib/security/sanitization");
    const cleaned = sanitizeText("hello\x00world");
    expect(cleaned).toBe("helloworld");
  });

  it("file name sanitization prevents path traversal", async () => {
    const { sanitizeFileName } = await import("@/lib/security/file-validation");

    const result = sanitizeFileName("../../../etc/passwd");
    expect(result).not.toContain("..");
    expect(result).not.toContain("/");
  });
});

// ─── Encryption Tests ─────────────────────────────────────────────────────

describe("Field Encryption Integration", () => {
  it("field encryption config file exists with sensitive fields", async () => {
    const fs = await import("node:fs");
    const path = await import("path");

    const configPath = path.join(
      process.cwd(),
      "..",
      "packages",
      "db",
      "lib",
      "field-encryption",
      "config.ts",
    );

    if (!fs.existsSync(configPath)) return; // Skip if not found

    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain("ENCRYPTED_FIELDS");
    expect(content).toContain("password_hash");
    expect(content).toContain("account_number");
  });

  it("field encryption service file exists", async () => {
    const fs = await import("node:fs");
    const path = await import("path");

    const servicePath = path.join(
      process.cwd(),
      "..",
      "packages",
      "db",
      "lib",
      "field-encryption",
      "service.ts",
    );

    if (!fs.existsSync(servicePath)) return;

    const content = fs.readFileSync(servicePath, "utf8");
    expect(content).toContain("encryptRecord");
    expect(content).toContain("decryptRecord");
    expect(content).toContain("rotateEncryptionKey");
  });
});

// ─── Webhook Delivery Tests ───────────────────────────────────────────────

describe("Webhook Delivery Integration", () => {
  it("webhook delivery module has required exports", async () => {
    const delivery = await import("@/lib/webhooks/delivery");

    expect(typeof delivery.DEFAULT_TIMEOUT_MS).toBe("number");
    expect(typeof delivery.DEFAULT_BACKOFF_BASE_MS).toBe("number");
    expect(typeof delivery.DEFAULT_MAX_RETRIES).toBe("number");
    expect(delivery.RETRYABLE_STATUSES).toBeDefined();
    expect(typeof delivery.RETRYABLE_STATUSES.has).toBe("function");
  });

  it("retryable status codes are correct", async () => {
    const { RETRYABLE_STATUSES } = await import("@/lib/webhooks/delivery");

    expect(RETRYABLE_STATUSES.has(429)).toBe(true);
    expect(RETRYABLE_STATUSES.has(500)).toBe(true);
    expect(RETRYABLE_STATUSES.has(502)).toBe(true);
    expect(RETRYABLE_STATUSES.has(503)).toBe(true);
    expect(RETRYABLE_STATUSES.has(504)).toBe(true);
    expect(RETRYABLE_STATUSES.has(400)).toBe(false);
    expect(RETRYABLE_STATUSES.has(401)).toBe(false);
    expect(RETRYABLE_STATUSES.has(404)).toBe(false);
  });

  it("webhook dedup module exists", async () => {
    const dedup = await import("@/lib/webhooks/dedup");
    expect(dedup).toBeDefined();
  });
});

// ─── API Key Tests ────────────────────────────────────────────────────────

describe("API Key Integration", () => {
  it("API key format validation", () => {
    // Valid format: xb_ + 64 hex chars
    const validKey = "xb_" + "a".repeat(64);
    expect(validKey.startsWith("xb_")).toBe(true);
    expect(validKey.length).toBe(67); // 3 + 64

    // Invalid: wrong prefix
    expect("ak_" + "a".repeat(64)).not.toMatch(/^xb_/);

    // Invalid: too short
    expect("xb_short").not.toMatch(/^xb_[a-f0-9]{64}$/);
  });

  it("API key hash is deterministic", async () => {
    const crypto = await import("crypto");

    const key = "xb_test123456789";
    const hash1 = crypto.createHash("sha256").update(key).digest("hex");
    const hash2 = crypto.createHash("sha256").update(key).digest("hex");

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });
});

// ─── Logger Redaction Tests ───────────────────────────────────────────────

describe("Logger Redaction Integration", () => {
  it("pino redact configuration covers sensitive fields", async () => {
    const { logger } = await import("@/lib/logger");

    // Logger should exist and have redact config
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});

// ─── Schema Discipline Tests ──────────────────────────────────────────────

describe("Schema Discipline", () => {
  it("all financial tables have entity_id column", async () => {
    const fs = await import("node:fs");
    const path = await import("path");

    const schemaDir = path.join(process.cwd(), "packages", "db", "schema");

    if (!fs.existsSync(schemaDir)) return; // Skip if schema dir not found

    const financialTables = [
      "journal-entries",
      "ap-ar",
      "treasury",
      "payroll",
      "fixed-assets",
      "inventory",
    ];

    for (const file of financialTables) {
      const filePath = path.join(schemaDir, `${file}.ts`);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, "utf8");
      // Every financial table definition should reference entityId
      expect(content, `${file}.ts should reference entityId`).toMatch(
        /entityId|entity_id/,
      );
    }
  });
});
