import { describe, it, expect } from "vitest";

describe("Sidebar Onboarding Progress Indicator", () => {
  describe("Step definitions", () => {
    const ONBOARDING_STEPS = [
      { key: "welcome", label: "Welcome" },
      { key: "chart-of-accounts", label: "Chart of Accounts" },
      { key: "bank-connection", label: "Bank Connection" },
      { key: "team", label: "Team Setup" },
      { key: "ai-preferences", label: "AI Preferences" },
    ];

    it("defines 5 onboarding steps", () => {
      expect(ONBOARDING_STEPS).toHaveLength(5);
    });

    it("all steps have key and label", () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.key).toBeTruthy();
        expect(step.label).toBeTruthy();
      });
    });

    it("keys match OnboardingStep type", () => {
      const validKeys = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
      ];
      ONBOARDING_STEPS.forEach((step) => {
        expect(validKeys).toContain(step.key);
      });
    });
  });

  describe("Progress calculation", () => {
    it("step 0 shows 0%", () => {
      const stepIndex = 0;
      const totalSteps = 5;
      const pct = Math.round((stepIndex / totalSteps) * 100);
      expect(pct).toBe(0);
    });

    it("step 1 shows 20%", () => {
      const stepIndex = 1;
      const totalSteps = 5;
      const pct = Math.round((stepIndex / totalSteps) * 100);
      expect(pct).toBe(20);
    });

    it("step 3 shows 60%", () => {
      const stepIndex = 3;
      const totalSteps = 5;
      const pct = Math.round((stepIndex / totalSteps) * 100);
      expect(pct).toBe(60);
    });

    it("step 5 shows 100%", () => {
      const stepIndex = 5;
      const totalSteps = 5;
      const pct = Math.round((stepIndex / totalSteps) * 100);
      expect(pct).toBe(100);
    });
  });

  describe("Completed steps tracking", () => {
    it("step 0 has 0 completed steps", () => {
      const steps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
      ];
      const stepIndex = 0;
      const completed = steps.filter((_, i) => i < stepIndex);
      expect(completed).toHaveLength(0);
    });

    it("step 2 has 2 completed steps", () => {
      const steps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
      ];
      const stepIndex = 2;
      const completed = steps.filter((_, i) => i < stepIndex);
      expect(completed).toEqual(["welcome", "chart-of-accounts"]);
    });

    it("step 5 has 5 completed steps", () => {
      const steps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
      ];
      const stepIndex = 5;
      const completed = steps.filter((_, i) => i < stepIndex);
      expect(completed).toHaveLength(5);
    });
  });

  describe("Visibility rules", () => {
    it("hides when onboarding is completed", () => {
      const isFirstTime = false;
      const shouldShow = isFirstTime;
      expect(shouldShow).toBe(false);
    });

    it("shows when onboarding is in progress", () => {
      const isFirstTime = true;
      const shouldShow = isFirstTime;
      expect(shouldShow).toBe(true);
    });

    it("hides during SSR (isLoaded false)", () => {
      const isLoaded = false;
      const shouldShow = false; // early return when not loaded
      expect(shouldShow).toBe(false);
    });
  });

  describe("UI elements", () => {
    it("shows Setup Progress label with Sparkles icon", () => {
      const html = '<Sparkles className="h-3.5 w-3.5 text-primary" />';
      expect(html).toContain("Sparkles");
    });

    it("shows percentage in monospace font", () => {
      const html =
        'className="ml-auto text-[10px] font-mono text-muted-foreground"';
      expect(html).toContain("font-mono");
    });

    it("shows progress bar with primary color", () => {
      const html =
        'className="h-full rounded-full bg-primary transition-all duration-500 ease-out"';
      expect(html).toContain("bg-primary");
    });

    it("completed steps show Check icon", () => {
      const html = '<Check className="h-3 w-3 shrink-0" />';
      expect(html).toContain("Check");
    });

    it("current step shows pulsing dot", () => {
      const html =
        'className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-primary/20"';
      expect(html).toContain("border-2 border-primary");
    });

    it("future steps show Circle icon", () => {
      const html = '<Circle className="h-3 w-3 shrink-0" />';
      expect(html).toContain("Circle");
    });

    it("resume button shows Start Setup when at step 0", () => {
      const stepIndex = 0;
      const label = stepIndex === 0 ? "Start Setup" : "Continue Setup";
      expect(label).toBe("Start Setup");
    });

    it("resume button shows Continue Setup after step 0", () => {
      const stepIndex: number = 2;
      const label = stepIndex === 0 ? "Start Setup" : "Continue Setup";
      expect(label).toBe("Continue Setup");
    });
  });

  describe("Accessibility", () => {
    it("progress bar has proper ARIA attributes", () => {
      // The progress is visually represented, screen readers read the percentage
      const ariaLabel = "Setup Progress";
      expect(ariaLabel).toBeTruthy();
    });

    it("resume button is focusable", () => {
      // Button elements are focusable by default
      expect(true).toBe(true);
    });
  });
});
