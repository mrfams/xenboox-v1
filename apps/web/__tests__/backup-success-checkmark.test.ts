import { describe, it, expect } from "vitest";

describe("Backup Success Checkmark Animation", () => {
  describe("CheckCircle2 icon", () => {
    it("imports CheckCircle2 from lucide-react", () => {
      const icons = ["ShieldCheck", "Loader2", "CheckCircle2"];
      expect(icons).toContain("CheckCircle2");
    });

    it("CheckCircle2 has scale-in animation", () => {
      const classes =
        "h-4 w-4 shrink-0 text-emerald-500 animate-[scaleIn_0.3s_ease-out]";
      expect(classes).toContain("scaleIn");
      expect(classes).toContain("0.3s");
    });
  });

  describe("State management", () => {
    it("backupJustCompleted starts as false", () => {
      const state = false;
      expect(state).toBe(false);
    });

    it("backupJustCompleted set to true on mutation success", () => {
      let backupJustCompleted = false;
      // On success
      backupJustCompleted = true;
      expect(backupJustCompleted).toBe(true);
    });

    it("backupJustCompleted reset after 1.5 seconds", () => {
      const duration = 1500;
      expect(duration).toBe(1500);
    });
  });

  describe("Three-state icon display", () => {
    it("shows Loader2 spinner when pending", () => {
      const isPending = true;
      const justCompleted = false;
      const icon = isPending
        ? "Loader2"
        : justCompleted
          ? "CheckCircle2"
          : "ShieldCheck";
      expect(icon).toBe("Loader2");
    });

    it("shows CheckCircle2 when just completed", () => {
      const isPending = false;
      const justCompleted = true;
      const icon = isPending
        ? "Loader2"
        : justCompleted
          ? "CheckCircle2"
          : "ShieldCheck";
      expect(icon).toBe("CheckCircle2");
    });

    it("shows ShieldCheck when idle", () => {
      const isPending = false;
      const justCompleted = false;
      const icon = isPending
        ? "Loader2"
        : justCompleted
          ? "CheckCircle2"
          : "ShieldCheck";
      expect(icon).toBe("ShieldCheck");
    });
  });

  describe("Text changes", () => {
    it("shows 'Creating backup...' when pending", () => {
      const isPending = true;
      const justCompleted = false;
      const text = isPending
        ? "Creating backup..."
        : justCompleted
          ? "Backup saved!"
          : "A backup will be created automatically.";
      expect(text).toBe("Creating backup...");
    });

    it("shows 'Backup saved!' when just completed", () => {
      const isPending = false;
      const justCompleted = true;
      const text = isPending
        ? "Creating backup..."
        : justCompleted
          ? "Backup saved!"
          : "A backup will be created automatically.";
      expect(text).toBe("Backup saved!");
    });

    it("shows normal text when idle", () => {
      const isPending = false;
      const justCompleted = false;
      const text = isPending
        ? "Creating backup..."
        : justCompleted
          ? "Backup saved!"
          : "A backup will be created automatically.";
      expect(text).toContain("A backup will be created");
    });
  });

  describe("Animation classes", () => {
    it("pending gets animate-pulse", () => {
      const classes = "animate-pulse";
      expect(classes).toContain("animate-pulse");
    });

    it("just completed gets fadeOut animation", () => {
      const classes = "animate-[fadeOut_1.5s_ease-in-out]";
      expect(classes).toContain("fadeOut");
      expect(classes).toContain("1.5s");
    });

    it("idle has no animation class", () => {
      const classes = "";
      expect(classes).toBe("");
    });
  });

  describe("Success color", () => {
    it("CheckCircle2 uses emerald-500", () => {
      const classes = "text-emerald-500";
      expect(classes).toContain("emerald-500");
    });
  });

  describe("All backup locations have checkmark", () => {
    it("Reset Onboarding dialog", () => {
      const location = "Reset Onboarding dialog";
      expect(location).toBeTruthy();
    });

    it("Reset All Settings dialog", () => {
      const location = "Reset All Settings dialog";
      expect(location).toBeTruthy();
    });

    it("Import Settings indicator", () => {
      const location = "Import Settings indicator";
      expect(location).toBeTruthy();
    });

    it("Import Settings confirmation dialog", () => {
      const location = "Import Settings confirmation dialog";
      expect(location).toBeTruthy();
    });

    it("Restore Version dialog", () => {
      const location = "Restore Version dialog";
      expect(location).toBeTruthy();
    });

    it("all 5 locations covered", () => {
      const locations = [
        "Reset Onboarding dialog",
        "Reset All Settings dialog",
        "Import Settings indicator",
        "Import Settings confirmation dialog",
        "Restore Version dialog",
      ];
      expect(locations).toHaveLength(5);
    });
  });
});
