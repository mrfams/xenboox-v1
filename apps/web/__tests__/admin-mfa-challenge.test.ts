import { describe, it, expect } from "vitest";

import {
  createMfaChallenge,
  verifyMfaChallenge,
} from "@/lib/admin/mfa-challenge";

describe("admin MFA challenge", () => {
  it("creates a challenge that verifies for the right admin user", async () => {
    const token = await createMfaChallenge("admin-123");
    const result = await verifyMfaChallenge(token);
    expect(result).toEqual({ adminUserId: "admin-123" });
  });

  it("rejects garbage, expired, and non-challenge tokens", async () => {
    expect(await verifyMfaChallenge("not-a-jwt")).toBeNull();
    expect(await verifyMfaChallenge("")).toBeNull();

    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.ADMIN_AUTH_SECRET ?? process.env.AUTH_SECRET,
    );
    const wrongPurpose = await new SignJWT({ purpose: "other" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-123")
      .setExpirationTime(Math.floor(Date.now() / 1000) + 300)
      .sign(secret);
    expect(await verifyMfaChallenge(wrongPurpose)).toBeNull();

    const expired = await new SignJWT({ purpose: "admin_mfa_challenge" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-123")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);
    expect(await verifyMfaChallenge(expired)).toBeNull();
  });
});
