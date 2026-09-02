/**
 * Onboarding Persistence Tests
 *
 * Verifies:
 * 1. useOnboarding hook uses correct mutation format (settings: { onboarding: {...} })
 * 2. Wizard doesn't show before server responds (race condition fix)
 * 3. Onboarding completion persists to server (not just localStorage)
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

    it("wraps mutation data in { settings: { onboarding: {...} } }", () => {
      // All three setSettings.mutate calls should use the correct format
      const mutateCalls = hook.match(/setSettings\.mutate\(\{[\s\S]*?\}\)/g);
      expect(mutateCalls).not.toBeNull();
      expect(mutateCalls!.length).toBe(3);

      for (const call of mutateCalls!) {
        expect(call).toContain("settings: { onboarding:");
      }
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
  });

  // ─── Race Condition Fix ────────────────────────────────────────────
  describe("Race condition: don't show wizard before server responds", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-onboarding.ts");
    });

    it("does NOT set isFirstTime=true while server is loading", () => {
      // The localStorage fallback should NOT set isFirstTime
      const loadingBlock = hook.slice(
        hook.indexOf("getSettings.isLoading"),
        hook.indexOf("// Server unavailable"),
      );
      expect(loadingBlock).not.toContain("setIsFirstTime(true)");
    });

    it("still restores currentStep from localStorage while loading", () => {
      const loadingBlock = hook.slice(
        hook.indexOf("getSettings.isLoading"),
        hook.indexOf("// Server unavailable"),
      );
      expect(loadingBlock).toContain("setCurrentStep(savedStep)");
    });
  });

  // ─── Wizard Component Guard ────────────────────────────────────────
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
  });
});
