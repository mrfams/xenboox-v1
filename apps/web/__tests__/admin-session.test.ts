import { describe, it, expect } from "vitest";

import {
  ADMIN_SESSION_INACTIVITY_MS,
  ADMIN_SESSION_HARD_CAP_MS,
  MAX_CONCURRENT_SESSIONS,
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
  computeSessionExpiry,
  isSessionActive,
  shouldEvictOldest,
  shouldLockAccount,
  lockoutRemainingMs,
} from "@/lib/admin/session";

describe("admin session rules", () => {
  it("defines the required thresholds", () => {
    expect(ADMIN_SESSION_INACTIVITY_MS).toBe(4 * 60 * 60 * 1000);
    expect(ADMIN_SESSION_HARD_CAP_MS).toBe(12 * 60 * 60 * 1000);
    expect(MAX_CONCURRENT_SESSIONS).toBe(3);
    expect(LOCKOUT_THRESHOLD).toBe(5);
    expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("expires at the earlier of inactivity window and hard cap", () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T01:00:00Z");

    // Inactive 1h: inactivity window (4h) is tighter than hard cap (12h).
    const lastActiveAt = new Date("2026-01-01T00:30:00Z");
    const expiry = computeSessionExpiry({
      issuedAt: issued,
      lastActiveAt,
      now,
    });
    expect(expiry.getTime()).toBe(
      lastActiveAt.getTime() + ADMIN_SESSION_INACTIVITY_MS,
    );

    // Session old enough that the hard cap binds instead.
    const longAgo = new Date("2025-12-31T10:00:00Z");
    const expiryHardCapped = computeSessionExpiry({
      issuedAt: longAgo,
      lastActiveAt: new Date("2026-01-01T00:59:00Z"),
      now: new Date("2026-01-01T01:00:00Z"),
    });
    expect(expiryHardCapped.getTime()).toBe(
      longAgo.getTime() + ADMIN_SESSION_HARD_CAP_MS,
    );
  });

  it("isSessionActive requires not revoked, not expired, and future expiry", () => {
    const session = {
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null as Date | null,
    };
    expect(isSessionActive(session, new Date())).toBe(true);

    expect(
      isSessionActive(
        { expiresAt: new Date(Date.now() - 1), revokedAt: null },
        new Date(),
      ),
    ).toBe(false);

    expect(
      isSessionActive(
        {
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
        },
        new Date(),
      ),
    ).toBe(false);
  });

  it("evicts oldest session when concurrency cap is reached", () => {
    expect(shouldEvictOldest(2, 3)).toBe(false);
    expect(shouldEvictOldest(3, 3)).toBe(true);
    expect(shouldEvictOldest(4, 3)).toBe(true);
  });

  it("locks the account at the failed-attempt threshold", () => {
    expect(shouldLockAccount(4)).toBe(false);
    expect(shouldLockAccount(5)).toBe(true);
  });

  it("reports remaining lockout time", () => {
    const until = new Date(Date.now() + 60_000);
    const remaining = lockoutRemainingMs(until, new Date());
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60_000);

    expect(lockoutRemainingMs(until, until)).toBe(0);
    expect(lockoutRemainingMs(new Date(Date.now() - 5), new Date())).toBe(0);
  });
});
