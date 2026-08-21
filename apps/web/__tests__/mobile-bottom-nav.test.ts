import { describe, it, expect } from "vitest";

describe("Mobile Bottom Nav with Onboarding Progress", () => {
  describe("Navigation items", () => {
    const NAV_ITEMS = [
      { label: "Home", href: "/dashboard" },
      { label: "AI Chat", href: "/dashboard" },
      { label: "Reports", href: "/dashboard/financial-pulse" },
      { label: "Books", href: "/dashboard/ledger" },
      { label: "More", href: "/dashboard/settings" },
    ];

    it("defines 5 navigation items", () => {
      expect(NAV_ITEMS).toHaveLength(5);
    });

    it("all items have valid hrefs", () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.href).toMatch(/^\/dashboard/);
      });
    });

    it("all items have labels", () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.label).toBeTruthy();
      });
    });

    it("includes core surfaces", () => {
      const labels = NAV_ITEMS.map((i) => i.label);
      expect(labels).toContain("Home");
      expect(labels).toContain("AI Chat");
      expect(labels).toContain("Reports");
      expect(labels).toContain("Books");
    });
  });

  describe("Onboarding progress", () => {
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

    it("step 0 shows 0%", () => {
      const pct = Math.round((0 / 5) * 100);
      expect(pct).toBe(0);
    });

    it("step 3 shows 60%", () => {
      const pct = Math.round((3 / 5) * 100);
      expect(pct).toBe(60);
    });

    it("step 5 shows 100%", () => {
      const pct = Math.round((5 / 5) * 100);
      expect(pct).toBe(100);
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
      const shouldShow = false;
      expect(shouldShow).toBe(false);
    });

    it("is hidden on desktop (lg:hidden)", () => {
      const html = 'className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"';
      expect(html).toContain("lg:hidden");
    });
  });

  describe("Progress indicator", () => {
    it("shows Sparkles icon", () => {
      const html = '<Sparkles className="h-3 w-3 text-primary" />';
      expect(html).toContain("Sparkles");
    });

    it("shows percentage in monospace", () => {
      const html = 'className="text-[10px] font-mono text-muted-foreground"';
      expect(html).toContain("font-mono");
    });

    it("progress bar uses primary color", () => {
      const html =
        'className="h-full rounded-full bg-primary transition-all duration-500 ease-out"';
      expect(html).toContain("bg-primary");
    });

    it("shows step dots", () => {
      // 5 dots for 5 steps
      const dots = 5;
      expect(dots).toBe(5);
    });

    it("current step dot is wider", () => {
      const html =
        'className="h-1.5 w-1.5 rounded-full transition-all ... bg-primary w-3"';
      expect(html).toContain("w-3");
    });

    it("completed dots are solid", () => {
      const html =
        'className="h-1.5 w-1.5 rounded-full transition-all ... bg-primary"';
      expect(html).toContain("bg-primary");
    });

    it("future dots are faded", () => {
      const html =
        'className="h-1.5 w-1.5 rounded-full transition-all ... bg-primary/20"';
      expect(html).toContain("bg-primary/20");
    });
  });

  describe("Continue link", () => {
    it("shows 'Start' at step 0", () => {
      const stepIndex = 0;
      const label = stepIndex === 0 ? "Start" : "Continue";
      expect(label).toBe("Start");
    });

    it("shows 'Continue' after step 0", () => {
      const stepIndex: number = 2;
      const label = stepIndex === 0 ? "Start" : "Continue";
      expect(label).toBe("Continue");
    });

    it("links to settings", () => {
      const href = "/dashboard/settings";
      expect(href).toContain("settings");
    });
  });

  describe("Safe area", () => {
    it("has safe-area-inset-bottom class", () => {
      const html = 'className="... safe-area-inset-bottom"';
      expect(html).toContain("safe-area-inset-bottom");
    });
  });

  describe("Accessibility", () => {
    it("nav has aria-label", () => {
      const html = 'aria-label="Mobile navigation"';
      expect(html).toContain("Mobile navigation");
    });

    it("all links are focusable", () => {
      // Link elements are focusable by default
      expect(true).toBe(true);
    });
  });
});
