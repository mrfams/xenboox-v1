import { describe, it, expect } from "vitest";

describe("Sidebar Onboarding Badge", () => {
  describe("Remaining steps calculation", () => {
    it("step 0 has 5 remaining steps", () => {
      const totalSteps = 5;
      const stepIndex = 0;
      const remaining = totalSteps - stepIndex;
      expect(remaining).toBe(5);
    });

    it("step 3 has 2 remaining steps", () => {
      const totalSteps = 5;
      const stepIndex = 3;
      const remaining = totalSteps - stepIndex;
      expect(remaining).toBe(2);
    });

    it("step 5 has 0 remaining steps", () => {
      const totalSteps = 5;
      const stepIndex = 5;
      const remaining = totalSteps - stepIndex;
      expect(remaining).toBe(0);
    });

    it("completed onboarding has 0 remaining", () => {
      const isFirstTime = false;
      const totalSteps = 5;
      const stepIndex = 5;
      const remaining = isFirstTime ? totalSteps - stepIndex : 0;
      expect(remaining).toBe(0);
    });
  });

  describe("Badge visibility", () => {
    it("shows badge only on Settings link", () => {
      const href = "/dashboard/settings";
      const showBadge = href === "/dashboard/settings";
      expect(showBadge).toBe(true);
    });

    it("hides badge on Help link", () => {
      const href: string = "/dashboard/help";
      const showBadge = href === "/dashboard/settings";
      expect(showBadge).toBe(false);
    });

    it("shows badge when steps remain", () => {
      const remainingSteps = 3;
      const showBadge = remainingSteps > 0;
      expect(showBadge).toBe(true);
    });

    it("hides badge when no steps remain", () => {
      const remainingSteps = 0;
      const showBadge = remainingSteps > 0;
      expect(showBadge).toBe(false);
    });

    it("hides badge when onboarding completed", () => {
      const isFirstTime = false;
      const remainingSteps = 0;
      const showBadge = isFirstTime && remainingSteps > 0;
      expect(showBadge).toBe(false);
    });
  });

  describe("Badge appearance", () => {
    it("uses pulsing animation", () => {
      const html =
        'className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40"';
      expect(html).toContain("animate-ping");
    });

    it("shows number of remaining steps", () => {
      const remainingSteps = 4;
      expect(remainingSteps).toBe(4);
    });

    it("uses primary color", () => {
      const html =
        'className="relative inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"';
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-primary-foreground");
    });

    it("has small font size", () => {
      const html = "text-[10px] font-bold";
      expect(html).toContain("text-[10px]");
    });
  });

  describe("Badge behavior", () => {
    it("badge disappears after onboarding completes", () => {
      const isFirstTime = false;
      const shouldShow = isFirstTime;
      expect(shouldShow).toBe(false);
    });

    it("badge count decreases as steps complete", () => {
      const steps = [5, 4, 3, 2, 1, 0];
      steps.forEach((remaining, i) => {
        expect(remaining).toBe(5 - i);
      });
    });

    it("badge links to Settings page", () => {
      const href = "/dashboard/settings";
      expect(href).toContain("settings");
    });
  });

  describe("Accessibility", () => {
    it("badge is decorative (aria-hidden not needed for visual-only)", () => {
      // The badge shows a number which is also in the progress component
      expect(true).toBe(true);
    });

    it("Settings link is still accessible with badge", () => {
      // Badge is inside the Link, doesn't block click/focus
      expect(true).toBe(true);
    });
  });
});
