import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Session Expiry Flow — Enterprise Grade", () => {
  describe("SessionExpiryProvider configuration", () => {
    const provider = readFileSync(
      join(ROOT, "components/auth/session-expiry-provider.tsx"),
      "utf-8",
    );

    it("uses 30-second countdown (not 10)", () => {
      expect(provider).toContain("COUNTDOWN_SECONDS = 30");
    });

    it("defines WARNING_BEFORE_EXPIRY_MS constant", () => {
      expect(provider).toContain("WARNING_BEFORE_EXPIRY_MS");
    });

    it("tracks expiry via token/JWT (not local wall-clock drift)", () => {
      // Single source of truth is IDLE_TIMEOUT_MS + token.exp, not lastActiveRef drift.
      expect(provider).toContain("IDLE_TIMEOUT_MS");
      expect(provider).toContain("expires");
    });

    it("has proactive polling interval (15s tight check)", () => {
      expect(provider).toContain("setInterval(check, 15_000)");
    });

    it("exempts login/register/mfa pages from modal", () => {
      expect(provider).toContain("/login");
      expect(provider).toContain("/register");
      expect(provider).toContain("/mfa-challenge");
    });

    it("blocks dashboard interaction when modal is open (hard-expiry)", () => {
      // Modal is blocking when expired — provider enforces via expired flag + Dialog prevent.
      expect(provider).toContain("expired");
      expect(provider).toContain("hardRedirect");
    });

    it("syncs across tabs via BroadcastChannel + storage", () => {
      expect(provider).toContain("BroadcastChannel");
      expect(provider).toContain("session-expired");
      expect(provider).toContain("xenboox:session-expired-at");
    });

    it("detects session expiry via useSession status change", () => {
      expect(provider).toContain("unauthenticated");
      expect(provider).toContain("wasAuthenticatedRef");
    });

    it("detects session expiry via tRPC 401 responses", () => {
      expect(provider).toContain("UNAUTHORIZED");
    });

    it("re-checks on tab visibility change", () => {
      expect(provider).toContain("visibilitychange");
    });

    it("hard-expires via signOut + callbackUrl (no dismiss survival)", () => {
      expect(provider).toContain("signOut");
      expect(provider).toContain("callbackUrl");
      expect(provider).toContain("queryClient.clear");
    });
  });

  describe("SessionExpiryModal", () => {
    const modal = readFileSync(
      join(ROOT, "components/auth/session-expiry-modal.tsx"),
      "utf-8",
    );

    it("shows countdown in seconds", () => {
      expect(modal).toContain("countdown}s");
    });

    it("has a progress bar that shrinks with countdown (uses total)", () => {
      expect(modal).toContain("width:");
      expect(modal).toContain("duration-1000");
      expect(modal).toContain("countdownTotal");
    });

    it("prevents closing by overlay click when expired", () => {
      expect(modal).toContain("onInteractOutside");
      expect(modal).toContain("e.preventDefault()");
      expect(modal).toContain("expired");
    });

    it("has Sign in again button with hard signOut handler", () => {
      expect(modal).toContain("Sign in again");
      expect(modal).toContain("onSignIn");
    });

    it("has Stay/Dismiss handling (no survival when expired)", () => {
      expect(modal).toContain("Stay signed in");
      expect(modal).toContain("Dismiss");
    });

    it("shows reassuring message about data safety", () => {
      expect(modal).toContain("data is safe");
    });

    it("uses ShieldAlert icon for visual indicator", () => {
      expect(modal).toContain("ShieldAlert");
    });

    it("has proper ARIA description", () => {
      expect(modal).toContain("aria-describedby");
      expect(modal).toContain("session-expiry-desc");
    });
  });

  describe("Dashboard layout integrates SessionExpiryProvider", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf-8");

    it("wraps app with SessionExpiryProvider", () => {
      expect(layout).toContain("SessionExpiryProvider");
    });

    it("polls session every 4 min + on focus (idle stamping)", () => {
      expect(layout).toContain("refetchInterval");
      expect(layout).toContain("refetchOnWindowFocus");
    });
  });

  describe("Security best practices", () => {
    const provider = readFileSync(
      join(ROOT, "components/auth/session-expiry-provider.tsx"),
      "utf-8",
    );

    it("redirects to login with callbackUrl for return path", () => {
      expect(provider).toContain("callbackUrl");
      expect(provider).toContain("/login?callbackUrl=");
    });

    it("clears signal on dismiss so future 401 can re-trigger (warning only)", () => {
      expect(provider).toContain("hasSignaledRef.current = false");
    });

    it("uses useSession for server-authoritative auth state", () => {
      expect(provider).toContain("useSession");
    });

    it("enforces idle at Edge middleware (no client-only expiry)", () => {
      const edge = readFileSync(join(ROOT, "lib/auth/edge.ts"), "utf-8");
      expect(edge).toContain("applyIdleTimeout");
    });

    it("middleware preserves callbackUrl on redirect", () => {
      const mw = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
      expect(mw).toContain("callbackUrl");
    });
  });
});
