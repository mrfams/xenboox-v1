/**
 * Field encryption core tests (§8.2 — AES-256 at rest).
 *
 * Tests `packages/db/lib/encryption.ts` — the pure AES-256-GCM crypto layer
 * behind the `encrypted_fields` table. No DB required: these are the
 * primitives the field-encryption service builds on, and getting them wrong
 * means ciphertext that can't be decrypted after launch.
 */

import { describe, it, expect } from "vitest";

import {
  encrypt,
  decrypt,
  hash,
  generateEncryptionKey,
  generateKeyVersion,
  isEncrypted,
} from "../../../packages/db/lib/encryption";

const TEST_KEY = "test-master-encryption-key-for-unit-tests-only";

describe("encrypt/decrypt roundtrip", () => {
  it("roundtrips plaintext through AES-256-GCM", () => {
    const { encrypted } = encrypt("bank-account-1234567890", TEST_KEY);
    const { decrypted, success } = decrypt(encrypted, TEST_KEY);
    expect(success).toBe(true);
    expect(decrypted).toBe("bank-account-1234567890");
  });

  it("never stores plaintext in the ciphertext", () => {
    const { encrypted } = encrypt("secret-account-number", TEST_KEY);
    expect(encrypted).not.toContain("secret-account-number");
  });

  it("produces unique ciphertext per call (random salt+IV)", () => {
    const a = encrypt("same-value", TEST_KEY).encrypted;
    const b = encrypt("same-value", TEST_KEY).encrypted;
    expect(a).not.toBe(b);
  });

  it("supports unicode + special characters", () => {
    const input = "ACCT-№42 · عربى · café ☕";
    const { encrypted } = encrypt(input, TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY).decrypted).toBe(input);
  });

  it("handles empty string", () => {
    const { encrypted } = encrypt("", TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY).decrypted).toBe("");
  });
});

describe("key discipline", () => {
  it("decrypt fails with the wrong key (no plaintext leak)", () => {
    const { encrypted } = encrypt("sensitive", TEST_KEY);
    const result = decrypt(encrypted, "wrong-key-completely");
    expect(result.success).toBe(false);
    expect(result.decrypted).toBe("");
  });

  it("tampering with ciphertext fails decryption (GCM auth tag)", () => {
    const { encrypted } = encrypt("authenticated-value", TEST_KEY);
    const buf = Buffer.from(encrypted, "base64");
    buf[buf.length - 1] = buf[buf.length - 1]! ^ 0xff; // flip a byte
    const result = decrypt(buf.toString("base64"), TEST_KEY);
    expect(result.success).toBe(false);
  });

  it("tracks key versions for rotation", () => {
    const { keyVersion } = encrypt("x", TEST_KEY, "v2");
    expect(keyVersion).toBe("v2");
    expect(generateKeyVersion()).toMatch(/^v\d+$/);
  });

  it("generates a 64-hex-char encryption key", () => {
    const key = generateEncryptionKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hash + isEncrypted", () => {
  it("hashes deterministically (for indexed lookup)", () => {
    expect(hash("employee-phone")).toBe(hash("employee-phone"));
    expect(hash("a")).not.toBe(hash("b"));
    expect(hash("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recognizes encrypted payloads", () => {
    const { encrypted } = encrypt("looks-encrypted", TEST_KEY);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted("plaintext-not-base64!")).toBe(false);
  });
});
