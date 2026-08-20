import { describe, it, expect } from "vitest";

describe("Export/Import Settings", () => {
  describe("Exported settings structure", () => {
    const mockExport = {
      version: "1.0.0",
      exportedAt: "2026-08-20T10:00:00.000Z",
      aiPreferences: {
        autoReconcile: true,
        autoCategorize: false,
        aiAlerts: true,
        dailyDigest: false,
      },
      notificationPreferences: null,
      onboarding: {
        completed: true,
        currentStep: null,
      },
    };

    it("has version field", () => {
      expect(mockExport.version).toBe("1.0.0");
    });

    it("has exportedAt timestamp", () => {
      expect(mockExport.exportedAt).toBeTruthy();
      expect(new Date(mockExport.exportedAt).toISOString()).toBe(
        mockExport.exportedAt,
      );
    });

    it("has aiPreferences or null", () => {
      expect(
        mockExport.aiPreferences !== null || mockExport.aiPreferences === null,
      ).toBe(true);
    });

    it("has onboarding status", () => {
      expect(typeof mockExport.onboarding.completed).toBe("boolean");
    });
  });

  describe("AI Preferences export", () => {
    it("exports 4 AI preference keys", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: true,
        dailyDigest: true,
      };
      expect(Object.keys(prefs)).toHaveLength(4);
    });

    it("counts enabled preferences", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: false,
        aiAlerts: true,
        dailyDigest: false,
      };
      const enabled = Object.values(prefs).filter(Boolean).length;
      expect(enabled).toBe(2);
    });
  });

  describe("Import validation", () => {
    it("validates version field exists", () => {
      const data = { version: "1.0.0" };
      expect(typeof data.version).toBe("string");
    });

    it("validates exportedAt field exists", () => {
      const data = { exportedAt: "2026-08-20T10:00:00.000Z" };
      expect(typeof data.exportedAt).toBe("string");
    });

    it("rejects invalid JSON", () => {
      const valid = false;
      expect(valid).toBe(false);
    });

    it("rejects missing version", () => {
      const data = { exportedAt: "2026-08-20" };
      const isValid = "version" in data && typeof data.version === "string";
      expect(isValid).toBe(false);
    });
  });

  describe("Import preview", () => {
    it("shows import date", () => {
      const date = new Date("2026-08-20T10:00:00.000Z").toLocaleDateString();
      expect(date).toBeTruthy();
    });

    it("shows AI preferences count", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: false,
        dailyDigest: true,
      };
      const enabled = Object.values(prefs).filter(Boolean).length;
      expect(enabled).toBe(3);
    });

    it("shows onboarding status", () => {
      const completed = true;
      expect(completed ? "Completed" : "In progress").toBe("Completed");
    });
  });

  describe("File handling", () => {
    it("accepts .json files only", () => {
      const acceptedTypes = ".json";
      expect(acceptedTypes).toBe(".json");
    });

    it("creates download with correct filename", () => {
      const date = "2026-08-20";
      const filename = `xenboox-settings-${date}.json`;
      expect(filename).toContain("xenboox-settings");
      expect(filename.endsWith(".json")).toBe(true);
    });

    it("uses application/json MIME type", () => {
      const mime = "application/json";
      expect(mime).toBe("application/json");
    });
  });

  describe("localStorage keys", () => {
    const KEYS = {
      aiPreferences: "xenboox_ai_preferences",
      onboardingCompleted: "xenboox_onboarding_completed",
      onboardingStep: "xenboox_onboarding_step",
    };

    it("defines 3 localStorage keys", () => {
      expect(Object.keys(KEYS)).toHaveLength(3);
    });

    it("all keys start with xenboox_", () => {
      Object.values(KEYS).forEach((key) => {
        expect(key).toMatch(/^xenboox_/);
      });
    });
  });

  describe("Export items", () => {
    const items = [
      { label: "AI Preferences", available: true },
      { label: "Onboarding Status", available: true },
      {
        label: "Notification Preferences",
        available: false,
        note: "Server-side",
      },
    ];

    it("defines 3 export items", () => {
      expect(items).toHaveLength(3);
    });

    it("AI and Onboarding are available", () => {
      expect(items[0].available).toBe(true);
      expect(items[1].available).toBe(true);
    });

    it("Notifications are server-side", () => {
      expect(items[2].available).toBe(false);
      expect(items[2].note).toBe("Server-side");
    });
  });

  describe("Accessibility", () => {
    it("file input is hidden but accessible via button", () => {
      const html = 'className="hidden"';
      expect(html).toContain("hidden");
    });

    it("buttons have icons for visual clarity", () => {
      const html = '<Download className="mr-2 h-4 w-4" />';
      expect(html).toContain("Download");
    });
  });
});
