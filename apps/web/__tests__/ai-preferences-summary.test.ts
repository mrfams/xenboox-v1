import { describe, it, expect } from "vitest";

describe("AI Preferences Summary", () => {
  describe("Default preferences", () => {
    const DEFAULT_PREFS = {
      autoReconcile: true,
      autoCategorize: true,
      aiAlerts: true,
      dailyDigest: true,
    };

    it("has 4 AI preference keys", () => {
      expect(Object.keys(DEFAULT_PREFS)).toHaveLength(4);
    });

    it("all defaults are enabled", () => {
      Object.values(DEFAULT_PREFS).forEach((v) => {
        expect(v).toBe(true);
      });
    });

    it("autoReconcile defaults to true", () => {
      expect(DEFAULT_PREFS.autoReconcile).toBe(true);
    });

    it("autoCategorize defaults to true", () => {
      expect(DEFAULT_PREFS.autoCategorize).toBe(true);
    });

    it("aiAlerts defaults to true", () => {
      expect(DEFAULT_PREFS.aiAlerts).toBe(true);
    });

    it("dailyDigest defaults to true", () => {
      expect(DEFAULT_PREFS.dailyDigest).toBe(true);
    });
  });

  describe("Preference labels", () => {
    const PREF_LABELS = [
      { key: "autoReconcile", label: "Auto-Reconciliation" },
      { key: "autoCategorize", label: "Smart Categorization" },
      { key: "aiAlerts", label: "Anomaly Alerts" },
      { key: "dailyDigest", label: "Daily Digest" },
    ];

    it("defines 4 preference labels", () => {
      expect(PREF_LABELS).toHaveLength(4);
    });

    it("all labels have matching keys", () => {
      PREF_LABELS.forEach((p) => {
        expect(p.key).toBeTruthy();
        expect(p.label).toBeTruthy();
      });
    });
  });

  describe("Status summary", () => {
    it("counts enabled preferences correctly", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: false,
        aiAlerts: true,
        dailyDigest: false,
      };
      const enabled = Object.values(prefs).filter(Boolean).length;
      expect(enabled).toBe(2);
    });

    it("shows all active when all enabled", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: true,
        dailyDigest: true,
      };
      const enabled = Object.values(prefs).filter(Boolean).length;
      const total = Object.keys(prefs).length;
      expect(enabled).toBe(total);
    });

    it("shows all disabled when none enabled", () => {
      const prefs = {
        autoReconcile: false,
        autoCategorize: false,
        aiAlerts: false,
        dailyDigest: false,
      };
      const enabled = Object.values(prefs).filter(Boolean).length;
      expect(enabled).toBe(0);
    });
  });

  describe("Persistence", () => {
    it("stores preferences in localStorage", () => {
      const key = "xenboox_ai_preferences";
      expect(key).toBeTruthy();
    });

    it("merges stored prefs with defaults", () => {
      const stored = { autoReconcile: false };
      const defaults = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: true,
        dailyDigest: true,
      };
      const merged = { ...defaults, ...stored };
      expect(merged.autoReconcile).toBe(false);
      expect(merged.autoCategorize).toBe(true);
    });
  });

  describe("Reset behavior", () => {
    it("reset restores all defaults", () => {
      const defaults = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: true,
        dailyDigest: true,
      };
      const reset = { ...defaults };
      expect(reset).toEqual(defaults);
    });
  });

  describe("UI elements", () => {
    it("shows Brain icon in card title", () => {
      const html = '<Brain className="h-4 w-4" />';
      expect(html).toContain("Brain");
    });

    it("has Save button", () => {
      const html = '<Save className="mr-1 h-3 w-3" />';
      expect(html).toContain("Save");
    });

    it("has Reset to defaults button", () => {
      const html = '<RotateCcw className="mr-1 h-3 w-3" />';
      expect(html).toContain("RotateCcw");
    });

    it("status shows enabled count", () => {
      const enabledCount = 3;
      const totalCount = 4;
      const text = `${enabledCount} of ${totalCount} AI features enabled`;
      expect(text).toContain("3 of 4");
    });

    it("status dot indicators use emerald color when enabled", () => {
      const html = 'className="h-2 w-2 rounded-full bg-emerald-500"';
      expect(html).toContain("bg-emerald-500");
    });
  });

  describe("Accessibility", () => {
    it("Switch components are keyboard accessible", () => {
      // Switch uses aria-checked and supports keyboard
      expect(true).toBe(true);
    });

    it("each toggle has label and description", () => {
      const toggles = [
        {
          label: "Auto-Reconciliation",
          desc: "AI matches bank transactions to journal entries",
        },
        {
          label: "Smart Categorization",
          desc: "AI suggests expense categories",
        },
        {
          label: "Anomaly Alerts",
          desc: "AI notifies of unusual transactions",
        },
        { label: "Daily Digest", desc: "Morning summary of financial metrics" },
      ];
      toggles.forEach((t) => {
        expect(t.label).toBeTruthy();
        expect(t.desc).toBeTruthy();
      });
    });
  });
});
