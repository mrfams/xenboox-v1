import { describe, it, expect, afterEach, vi } from "vitest";

import {
  encryptConnectionToken,
  decryptConnectionToken,
  isTokenEncrypted,
} from "../../../packages/db/lib/bank-token-encryption";

const TEST_KEY = "test-master-key-0123456789abcdef";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("encryptConnectionToken / decryptConnectionToken", () => {
  it("roundtrips a token when a key is configured", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    const stored = encryptConnectionToken("access-sandbox-abc123");
    expect(stored).not.toContain("abc123");
    expect(isTokenEncrypted(stored)).toBe(true);
    expect(decryptConnectionToken(stored)).toBe("access-sandbox-abc123");
  });

  it("produces unique ciphertext per call (random IV)", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    const a = encryptConnectionToken("same-token");
    const b = encryptConnectionToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptConnectionToken(a)).toBe("same-token");
    expect(decryptConnectionToken(b)).toBe("same-token");
  });

  it("returns legacy plaintext rows as-is when no prefix is present", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    // Legacy row written before encryption existed — no xenc:v1: prefix.
    expect(isTokenEncrypted("access-sandbox-legacy")).toBe(false);
    expect(decryptConnectionToken("access-sandbox-legacy")).toBe(
      "access-sandbox-legacy",
    );
  });

  it("returns null when encrypted but no key is configured", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    const stored = encryptConnectionToken("secret-token");
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(decryptConnectionToken(stored)).toBeNull();
  });

  it("handles null/empty stored values", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    expect(decryptConnectionToken(null)).toBeNull();
    expect(decryptConnectionToken(undefined)).toBeNull();
    expect(decryptConnectionToken("")).toBeNull();
  });

  it("returns null on tampered ciphertext (auth tag failure)", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    const stored = encryptConnectionToken("secret-token");
    const tampered = stored.slice(0, -4) + "AAAA";
    expect(decryptConnectionToken(tampered)).toBeNull();
  });

  it("throws in production when no key is configured (fail loud)", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(() => encryptConnectionToken("token")).toThrow(
      /FIELD_ENCRYPTION_KEY/,
    );
    vi.unstubAllEnvs();
  });

  it("passes through plaintext in dev when no key is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(encryptConnectionToken("dev-token")).toBe("dev-token");
    expect(isTokenEncrypted("dev-token")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("does not encrypt empty strings", () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    expect(encryptConnectionToken("")).toBe("");
  });
});
