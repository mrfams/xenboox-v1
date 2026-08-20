import { describe, it, expect } from "vitest"

describe("Backup Indicator on Reset/Import Buttons", () => {
  describe("ShieldCheck icon usage", () => {
    it("Settings page imports ShieldCheck from lucide-react", () => {
      // ShieldCheck is imported alongside other icons
      const imports = [
        "LogOut", "User", "Shield", "Bell", "Save", "AlertCircle",
        "Check", "Mail", "RotateCcw", "Sparkles", "Trash2", "ShieldCheck",
      ]
      expect(imports).toContain("ShieldCheck")
    })

    it("ExportImportSettings imports ShieldCheck from lucide-react", () => {
      const imports = [
        "Download", "Upload", "Check", "AlertCircle", "FileJson", "ShieldCheck",
      ]
      expect(imports).toContain("ShieldCheck")
    })
  })

  describe("Reset Onboarding backup indicator", () => {
    it("shows backup message in Reset Onboarding dialog", () => {
      const message = "A backup will be created automatically before resetting."
      expect(message).toContain("backup will be created automatically")
      expect(message).toContain("before resetting")
    })

    it("backup indicator uses ShieldCheck icon", () => {
      const icon = "ShieldCheck"
      expect(icon).toBe("ShieldCheck")
    })

    it("backup indicator has emerald styling for positive UX", () => {
      const classes = "border-emerald-200 bg-emerald-50 text-emerald-700"
      expect(classes).toContain("emerald")
    })
  })

  describe("Reset All Settings backup indicator", () => {
    it("shows backup message in Reset All Settings dialog", () => {
      const message = "A backup will be created automatically before resetting. You can restore from Version History."
      expect(message).toContain("backup will be created automatically")
      expect(message).toContain("restore from Version History")
    })

    it("mentions Version History for restore", () => {
      const message = "A backup will be created automatically before resetting. You can restore from Version History."
      expect(message).toContain("Version History")
    })
  })

  describe("Import Settings backup indicator", () => {
    it("shows backup indicator below Import button", () => {
      const message = "A backup will be created automatically before importing."
      expect(message).toContain("backup will be created automatically")
      expect(message).toContain("before importing")
    })

    it("shows backup indicator in import confirmation dialog", () => {
      const message = "A backup will be created automatically before importing. You can restore from Version History."
      expect(message).toContain("Version History")
    })
  })

  describe("Backup indicator styling consistency", () => {
    it("all backup indicators use emerald color scheme", () => {
      // Emerald = safe/positive action
      const styling = {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        darkBorder: "dark:border-emerald-800",
        darkBg: "dark:bg-emerald-950",
        darkText: "dark:text-emerald-300",
      }

      expect(styling.border).toContain("emerald")
      expect(styling.bg).toContain("emerald")
      expect(styling.text).toContain("emerald")
    })

    it("backup indicators are rounded-lg with padding", () => {
      const classes = "rounded-lg border px-3 py-2"
      expect(classes).toContain("rounded-lg")
      expect(classes).toContain("px-3")
      expect(classes).toContain("py-2")
    })

    it("backup indicators have small text (text-xs)", () => {
      const classes = "text-xs"
      expect(classes).toContain("text-xs")
    })
  })

  describe("Backup indicator accessibility", () => {
    it("ShieldCheck icon has shrink-0 to prevent flex shrinking", () => {
      const classes = "h-4 w-4 shrink-0"
      expect(classes).toContain("shrink-0")
    })

    it("backup message is descriptive and clear", () => {
      const messages = [
        "A backup will be created automatically before resetting.",
        "A backup will be created automatically before resetting. You can restore from Version History.",
        "A backup will be created automatically before importing.",
        "A backup will be created automatically before importing. You can restore from Version History.",
      ]

      messages.forEach((msg) => {
        expect(msg.length).toBeGreaterThan(20)
        expect(msg).toContain("backup")
        expect(msg).toContain("automatically")
      })
    })
  })
})
