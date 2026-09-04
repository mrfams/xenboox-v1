import { describe, it, expect } from "vitest";
import { applyIdleTimeout, applyAdminIdleTimeout, IDLE_TIMEOUT_MS, ADMIN_IDLE_TIMEOUT_MS, IDLE_REFRESH_THROTTLE_MS } from "@/lib/auth/idle-session";

describe("idle-session", () => {
  it("stamps fresh token when lastActivity missing", () => {
    const token: Record<string, unknown> = {};
    const out = applyIdleTimeout(token, 1000);
    expect(out).not.toBeNull();
    expect(out?.lastActivity).toBe(1000);
  });
  it("returns null when idle window exceeded", () => {
    const token: Record<string, unknown> = { lastActivity: 0 };
    const out = applyIdleTimeout(token, IDLE_TIMEOUT_MS + 1000);
    expect(out).toBeNull();
  });
  it("throttles stamp within throttle window", () => {
    const token: Record<string, unknown> = { lastActivity: 1000 };
    const out = applyIdleTimeout(token, 1000 + IDLE_REFRESH_THROTTLE_MS - 100);
    expect(out).not.toBeNull();
    expect(out?.lastActivity).toBe(1000); // not yet refreshed
  });
  it("refreshes after throttle", () => {
    const token: Record<string, unknown> = { lastActivity: 1000 };
    const out = applyIdleTimeout(token, 1000 + IDLE_REFRESH_THROTTLE_MS + 10);
    expect(out?.lastActivity).toBe(1000 + IDLE_REFRESH_THROTTLE_MS + 10);
  });
  it("admin timeout is 4h", () => {
    expect(ADMIN_IDLE_TIMEOUT_MS).toBe(4 * 60 * 60 * 1000);
    const token: Record<string, unknown> = { lastActivity: 0 };
    expect(applyAdminIdleTimeout(token, ADMIN_IDLE_TIMEOUT_MS + 1000)).toBeNull();
  });
});
