import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/admin/totp";

describe("admin TOTP secret encryption", () => {
  it("round-trips a secret through AES-256-GCM", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    const a = encryptSecret("SECRET123");
    const b = encryptSecret("SECRET123");
    expect(a).not.toBe(b);
  });

  it("returns null for tampered or malformed payloads", () => {
    const encrypted = encryptSecret("SECRET123");
    const tampered =
      encrypted.slice(0, -2) + (encrypted.endsWith("AA") ? "BB" : "AA");
    expect(decryptSecret(tampered)).toBeNull();
    expect(decryptSecret("not-base64")).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
});
