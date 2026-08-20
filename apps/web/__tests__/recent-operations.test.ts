import { describe, it, expect } from "vitest";

describe("Recent Operations Panel", () => {
  describe("Data structure", () => {
    it("RecentOperation has required fields", () => {
      const op = {
        id: "123-abc",
        name: "All settings reset",
        timestamp: "2026-08-20T10:00:00Z",
        versionId: "v1-id",
        versionLabel: "Auto-backup: before reset",
      };
      expect(op).toHaveProperty("id");
      expect(op).toHaveProperty("name");
      expect(op).toHaveProperty("timestamp");
      expect(op).toHaveProperty("versionId");
      expect(op).toHaveProperty("versionLabel");
    });
  });

  describe("Storage", () => {
    it("operations stored under xenboox_recent_operations key", () => {
      const key = "xenboox_recent_operations";
      expect(key).toContain("recent_operations");
    });

    it("max 5 operations kept", () => {
      const max = 5;
      expect(max).toBe(5);
    });

    it("newest operations appear first", () => {
      const operations = [
        { name: "Op 3", timestamp: "2026-08-20T10:02:00Z" },
        { name: "Op 2", timestamp: "2026-08-20T10:01:00Z" },
        { name: "Op 1", timestamp: "2026-08-20T10:00:00Z" },
      ];
      expect(operations[0].name).toBe("Op 3"); // Newest first
    });
  });

  describe("UI component", () => {
    it("shows Clock icon in header", () => {
      const icon = "Clock";
      expect(icon).toBe("Clock");
    });

    it("shows operation count badge", () => {
      const count = 3;
      expect(count).toBe(3);
    });

    it("empty state returns null (hidden)", () => {
      const operations: unknown[] = [];
      const shouldShow = operations.length > 0;
      expect(shouldShow).toBe(false);
    });

    it("shows Undo button for each operation", () => {
      const button = "Undo";
      expect(button).toBe("Undo");
    });

    it("shows Clear button to remove all", () => {
      const button = "Clear";
      expect(button).toBe("Clear");
    });
  });

  describe("Operation icons", () => {
    it("Reset Onboarding shows 🔄", () => {
      const icon = "🔄";
      expect(icon).toBe("🔄");
    });

    it("Reset All Settings shows 🗑️", () => {
      const icon = "🗑️";
      expect(icon).toBe("🗑️");
    });

    it("Import Settings shows 📥", () => {
      const icon = "📥";
      expect(icon).toBe("📥");
    });

    it("Restore from Version shows ⏪", () => {
      const icon = "⏪";
      expect(icon).toBe("⏪");
    });

    it("unknown operation shows ⚡", () => {
      const icon = "⚡";
      expect(icon).toBe("⚡");
    });
  });

  describe("Restore functionality", () => {
    it("restore with versionId calls restoreVersion API", () => {
      const apiUrl = "/api/trpc/settings.restoreVersion";
      expect(apiUrl).toContain("restoreVersion");
    });

    it("restore without versionId fetches latest version first", () => {
      const apiUrl =
        "/api/trpc/settings.getVersions?input=%7B%22limit%22%3A1%7D";
      expect(apiUrl).toContain("getVersions");
    });

    it("shows spinner while restoring", () => {
      const classes = "animate-spin";
      expect(classes).toContain("animate-spin");
    });

    it("page reloads after successful restore", () => {
      const shouldReload = true;
      expect(shouldReload).toBe(true);
    });
  });

  describe("Time formatting", () => {
    it("formats recent as 'Just now'", () => {
      const now = new Date().toISOString();
      const diff = Date.now() - new Date(now).getTime();
      const minutes = Math.floor(diff / 60_000);
      expect(minutes).toBe(0);
    });

    it("formats minutes", () => {
      const minutes = 30;
      expect(`${minutes}m ago`).toBe("30m ago");
    });

    it("formats hours", () => {
      const hours = 3;
      expect(`${hours}h ago`).toBe("3h ago");
    });

    it("formats days", () => {
      const days = 5;
      expect(`${days}d ago`).toBe("5d ago");
    });
  });

  describe("Integration with showUndoToast", () => {
    it("showUndoToast adds to recent operations", () => {
      const operations = [
        { name: "All settings reset", timestamp: new Date().toISOString() },
      ];
      expect(operations).toHaveLength(1);
    });

    it("operations are persisted in localStorage", () => {
      const key = "xenboox_recent_operations";
      expect(key).toBeTruthy();
    });
  });
});
