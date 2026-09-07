/**
 * Onboarding Persistence Tests
 *
 * Verifies the server-authoritative onboarding gate:
 * 1. useOnboarding persists state via settings.set ({ settings: { onboarding } })
 * 2. The gate waits for the server and never flashes the wizard (race condition)
 * 3. ZERO localStorage in the onboarding path — state lives in the database so
 *    every device sees the same gate (production incident regression)
 * 4. Skip / completion close the gate (ai-onboarding.tsx)
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Onboarding Persistence Fix", () => {
  // ─── Mutation Format ───────────────────────────────────────────────
  describe("useOnboarding mutation format", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-onboarding.ts");
    });

    it("persists onboarding via the settings wrapper ({ settings: { onboarding } })", () => {
      expect(hook).toContain("settings: { onboarding }");
    });

    it("does NOT use the old format { onboarding: {...} } without settings wrapper", () => {
      // Should not have bare "onboarding:" at the top level of mutate
      const bareOnboarding = hook.match(
        /setSettings\.mutate\(\{\s*\n\s*onboarding:/g,
      );
      expect(bareOnboarding).toBeNull();
    });

    it("saves completed: true with currentStep: null on completion", () => {
      expect(hook).toContain("completed: true, currentStep: null");
    });

    it("saves completed: false with currentStep: step on step change", () => {
      expect(hook).toContain("completed: false, currentStep: step");
    });

    it("updates the tRPC cache on success so the gate reflects instantly", () => {
      expect(hook).toContain("utils.settings.get.setData");
    });

    it("invalidates the cache on failed writes (no stale state)", () => {
      expect(hook).toContain("utils.settings.get.invalidate");
    });
  });

  // ─── Race Condition Fix ────────────────────────────────────────
  describe("Race condition: don't show wizard before server responds", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-onboarding.ts");
    });

    it("waits for the server before deciding first-time status", () => {
      expect(hook).toContain("if (getSettings.isLoading) return;");
    });

    it("waits for the session before querying (no decisions when signed out)", () => {
      expect(hook).toContain("if (!session?.user?.id) return;");
    });

    it("restores the current step from the server, not the browser", () => {
      expect(hook).toContain("onboarding?.currentStep");
    });

    it("fails safe: a server error must NOT open the wizard", () => {
      const fallbackBlock = hook.slice(
        hook.indexOf("Query settled without data"),
      );
      expect(fallbackBlock).toContain("setIsFirstTime(false)");
    });
  });

  // ─── Server-Authoritative Gate (production incident regression) ──────
  describe("Gate is server-authoritative — zero localStorage", () => {
    let hook: string;
    let sync: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-onboarding.ts");
      sync = readFile("lib/hooks/use-settings-sync.ts");
    });

    it("useOnboarding never touches localStorage", () => {
      expect(hook).not.toContain("localStorage");
    });

    it("settings sync never touches localStorage", () => {
      expect(sync).not.toContain("localStorage");
    });

    it("settings sync never references the legacy onboarding keys", () => {
      expect(sync).not.toContain("xenboox_onboarding");
    });

    it("reset goes through the server (settings.replace), not key deletion", () => {
      expect(sync).toContain("replaceSettings");
    });
  });

  // ─── Skip Closes the Gate ────────────────────────────────────────
  describe("Skip / completion close the gate", () => {
    let aiOnboarding: string;

    beforeAll(() => {
      aiOnboarding = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("skip closes the gate via the hook (server persistence)", () => {
      const skipBlock = aiOnboarding.slice(
        aiOnboarding.indexOf("const handleSkip"),
        aiOnboarding.indexOf(
          'window.location.href = "/dashboard";',
          aiOnboarding.indexOf("const handleSkip"),
        ),
      );
      expect(skipBlock).toContain("markOnboardingComplete()");
    });

    it("go-to-dashboard also closes the gate, not just the session update", () => {
      const dashboardBlock = aiOnboarding.slice(
        aiOnboarding.indexOf("const handleGoToDashboard"),
      );
      expect(dashboardBlock).toContain("markOnboardingComplete()");
    });
  });

  // ─── Wizard Component Guard ────────────────────────────────
  describe("OnboardingWizard component guard", () => {
    let wizard: string;

    beforeAll(() => {
      wizard = readFile("components/onboarding/onboarding-wizard.tsx");
    });

    it("wizard checks isLoaded before showing", () => {
      expect(wizard).toContain("isLoaded");
    });

    it("wizard only auto-shows when isFirstTime AND isLoaded", () => {
      expect(wizard).toContain("isFirstTime && isLoaded");
    });

    it("wizard returns null when not loaded", () => {
      expect(wizard).toContain("!isLoaded) return null");
    });

    it("wizard renders the AI onboarding agent", () => {
      expect(wizard).toContain("AiOnboarding");
    });
  });
});
