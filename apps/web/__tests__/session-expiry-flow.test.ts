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

    it("tracks last active time for proactive warning", () => {
      expect(provider).toContain("lastActiveRef");
    });

    it("has proactive polling interval (30s)", () => {
      expect(provider).toContain("setInterval(check, 30_000)");
    });

    it("exempts login/register/mfa pages from modal", () => {
      expect(provider).toContain("/login");
      expect(provider).toContain("/register");
      expect(provider).toContain("/mfa-challenge");
    });

    it("blocks dashboard interaction when modal is open (overlay)", () => {
      expect(provider).toContain("fixed inset-0");
      expect(provider).toContain("backdrop-blur-sm");
    });

    it("syncs across tabs via BroadcastChannel", () => {
      expect(provider).toContain("BroadcastChannel");
      expect(provider).toContain("session-expired");
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
  });

  describe("SessionExpiryModal", () => {
    const modal = readFileSync(
      join(ROOT, "components/auth/session-expiry-modal.tsx"),
      "utf-8",
    );

    it("shows countdown in seconds", () => {
      expect(modal).toContain("countdown}s");
    });

    it("has a progress bar that shrinks with countdown", () => {
      expect(modal).toContain("width:");
      expect(modal).toContain("duration-1000");
    });

    it("prevents closing by overlay click", () => {
      expect(modal).toContain("onInteractOutside");
      expect(modal).toContain("e.preventDefault()");
    });

    it("has Sign in again button linking to login", () => {
      expect(modal).toContain("Sign in again");
      expect(modal).toContain("/login");
    });

    it("has Dismiss button", () => {
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

    it("clears signal on dismiss so future 401 can re-trigger", () => {
      expect(provider).toContain("hasSignaledRef.current = false");
    });

    it("uses useSession for server-authoritative auth state", () => {
      expect(provider).toContain("useSession");
    });
  });
});
