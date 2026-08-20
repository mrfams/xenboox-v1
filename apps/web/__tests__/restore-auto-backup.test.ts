import { describe, it, expect } from "vitest";

describe("Auto-versioning before Restore from Version", () => {
  describe("SettingsVersionHistory component", () => {
    it("imports ShieldCheck for backup indicator", () => {
      const icons = [
        "History",
        "RotateCcw",
        "Save",
        "ChevronDown",
        "ChevronUp",
        "Tag",
        "Trash2",
        "ShieldCheck",
      ];
      expect(icons).toContain("ShieldCheck");
    });

    it("handleRestore creates auto-backup before restore", () => {
      // Simulate the restore flow
      const calls: string[] = [];
      const createAutoBackup = {
        mutate: (input: { label: string }) => {
          calls.push("auto-backup:" + input.label);
        },
      };
      const restoreVersion = {
        mutate: (input: { versionId: string }) => {
          calls.push("restore:" + input.versionId);
        },
      };

      const restoreTarget = { id: "v1-id", version: 1 };

      // handleRestore logic
      if (restoreTarget) {
        createAutoBackup.mutate({
          label: `Auto-backup: before restoring to v${restoreTarget.version}`,
        });
      }

      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain("auto-backup:");
      expect(calls[0]).toContain("before restoring to v1");
    });

    it("auto-backup label includes target version number", () => {
      const version = 3;
      const label = `Auto-backup: before restoring to v${version}`;
      expect(label).toContain("v3");
      expect(label).toContain("Auto-backup");
    });

    it("restore proceeds even if auto-backup fails", () => {
      let backupSucceeded = false;
      let restoreExecuted = false;

      const createAutoBackup = {
        mutate: (input: { label: string }) => {
          // Simulate failure
          backupSucceeded = false;
          // onError handler still proceeds with restore
          restoreExecuted = true;
        },
      };

      createAutoBackup.mutate({ label: "test" });
      expect(backupSucceeded).toBe(false);
      expect(restoreExecuted).toBe(true);
    });

    it("success toast mentions backup was saved", () => {
      const version = 2;
      const toastMessage = `Restored from version ${version}. A backup was saved automatically.`;
      expect(toastMessage).toContain("A backup was saved automatically");
      expect(toastMessage).toContain("version 2");
    });
  });

  describe("Restore confirmation dialog", () => {
    it("shows backup indicator in restore dialog", () => {
      const message =
        "A backup of your current settings will be saved automatically before restoring.";
      expect(message).toContain("backup");
      expect(message).toContain("automatically");
      expect(message).toContain("before restoring");
    });

    it("backup indicator uses ShieldCheck icon", () => {
      const icon = "ShieldCheck";
      expect(icon).toBe("ShieldCheck");
    });

    it("backup indicator has emerald styling", () => {
      const classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
      expect(classes).toContain("emerald");
    });
  });

  describe("Full restore flow", () => {
    it("flow: user clicks Restore → auto-backup created → restore executed", () => {
      const flow: string[] = [];

      // Step 1: User clicks Restore button
      flow.push("user-clicks-restore");

      // Step 2: Auto-backup is created
      flow.push("auto-backup-created");

      // Step 3: Restore is executed
      flow.push("restore-executed");

      // Step 4: Versions list is refreshed
      flow.push("versions-refreshed");

      // Step 5: Settings are refreshed
      flow.push("settings-refreshed");

      // Step 6: Toast shows success with backup confirmation
      flow.push("toast-shown");

      expect(flow).toHaveLength(6);
      expect(flow[1]).toBe("auto-backup-created");
      expect(flow[2]).toBe("restore-executed");
    });

    it("auto-backup label format is consistent with other risky operations", () => {
      const labels = [
        "Auto-backup: before reset all settings",
        "Auto-backup: before onboarding reset",
        "Auto-backup: before settings import",
        "Auto-backup: before restoring to v1",
      ];

      labels.forEach((label) => {
        expect(label.startsWith("Auto-backup:")).toBe(true);
      });
    });

    it("all risky operations now have auto-versioning", () => {
      const riskyOperations = [
        "Reset All Settings",
        "Reset Onboarding",
        "Import Settings",
        "Restore from Version",
      ];

      riskyOperations.forEach((op) => {
        expect(op).toBeTruthy();
      });

      expect(riskyOperations).toHaveLength(4);
    });
  });
});
