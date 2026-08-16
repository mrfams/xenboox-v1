// ─── §20.1 Idle session timeout ────────────────────────────────────────────
//
// applyIdleTimeout stamps `lastActivity` into the JWT on every request
// (throttled) and returns null once the idle window elapses — which the
// jwt callback turns into session invalidation.

import { describe, it, expect } from "vitest";
import {
  applyIdleTimeout,
  IDLE_TIMEOUT_MS,
  IDLE_REFRESH_THROTTLE_MS,
} from "@/lib/auth/idle-session";

describe("§20.1 idle session timeout", () => {
  it("stamps a token that has no lastActivity yet", () => {
    const t = applyIdleTimeout({}, 1_000_000);
    expect(t).not.toBeNull();
    expect(t!.lastActivity).toBe(1_000_000);
  });

  it("returns null once the idle window elapses", () => {
    const t = applyIdleTimeout({ lastActivity: 0 }, IDLE_TIMEOUT_MS + 1);
    expect(t).toBeNull();
  });

  it("keeps the session alive when activity is within the window", () => {
    const t = applyIdleTimeout({ lastActivity: 0 }, IDLE_TIMEOUT_MS - 1);
    expect(t).not.toBeNull();
  });

  it("does not rewrite the stamp within the throttle window", () => {
    const t = applyIdleTimeout(
      { lastActivity: 0 },
      IDLE_REFRESH_THROTTLE_MS - 1,
    );
    expect(t!.lastActivity).toBe(0);
  });

  it("re-stamps once the throttle window passes", () => {
    const t = applyIdleTimeout(
      { lastActivity: 0 },
      IDLE_REFRESH_THROTTLE_MS + 1,
    );
    expect(t!.lastActivity).toBe(IDLE_REFRESH_THROTTLE_MS + 1);
  });

  it("defaults to a 60-minute window", () => {
    expect(IDLE_TIMEOUT_MS).toBe(60 * 60 * 1000);
  });
});
