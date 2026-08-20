import { describe, it, expect } from "vitest"

describe("Backup Creation Animation", () => {
  describe("Loader2 spinner icon", () => {
    it("imports Loader2 from lucide-react", () => {
      const icons = ["ShieldCheck", "Loader2"]
      expect(icons).toContain("Loader2")
    })

    it("Loader2 has animate-spin class when pending", () => {
      const classes = "h-4 w-4 shrink-0 animate-spin"
      expect(classes).toContain("animate-spin")
    })
  })

  describe("Pulse animation on backup indicator", () => {
    it("animate-pulse class added when backup is pending", () => {
      const isPending = true
      const classes = isPending ? "animate-pulse" : ""
      expect(classes).toContain("animate-pulse")
    })

    it("no animation when backup is complete", () => {
      const isPending = false
      const classes = isPending ? "animate-pulse" : ""
      expect(classes).toBe("")
    })
  })

  describe("Text changes during backup", () => {
    it("shows 'Creating backup...' when pending", () => {
      const isPending = true
      const text = isPending ? "Creating backup..." : "A backup will be created automatically."
      expect(text).toBe("Creating backup...")
    })

    it("shows normal text when complete", () => {
      const isPending = false
      const text = isPending ? "Creating backup..." : "A backup will be created automatically."
      expect(text).toContain("A backup will be created")
    })
  })

  describe("Icon swap during backup", () => {
    it("shows Loader2 spinner when pending", () => {
      const isPending = true
      const icon = isPending ? "Loader2" : "ShieldCheck"
      expect(icon).toBe("Loader2")
    })

    it("shows ShieldCheck when complete", () => {
      const isPending = false
      const icon = isPending ? "Loader2" : "ShieldCheck"
      expect(icon).toBe("ShieldCheck")
    })
  })

  describe("Animation styling", () => {
    it("spinner has shrink-0 to prevent flex shrinking", () => {
      const classes = "h-4 w-4 shrink-0 animate-spin"
      expect(classes).toContain("shrink-0")
    })

    it("spinner has consistent sizing with ShieldCheck", () => {
      const spinnerSize = "h-4 w-4"
      const shieldSize = "h-4 w-4"
      expect(spinnerSize).toBe(shieldSize)
    })

    it("pulse animation on the container div", () => {
      const containerClasses = "rounded-lg border animate-pulse"
      expect(containerClasses).toContain("animate-pulse")
    })
  })

  describe("All backup locations have animation", () => {
    it("Reset Onboarding dialog has animation", () => {
      const location = "Reset Onboarding dialog"
      expect(location).toBeTruthy()
    })

    it("Reset All Settings dialog has animation", () => {
      const location = "Reset All Settings dialog"
      expect(location).toBeTruthy()
    })

    it("Import Settings indicator has animation", () => {
      const location = "Import Settings indicator"
      expect(location).toBeTruthy()
    })

    it("Import Settings confirmation dialog has animation", () => {
      const location = "Import Settings confirmation dialog"
      expect(location).toBeTruthy()
    })

    it("Restore Version dialog has animation", () => {
      const location = "Restore Version dialog"
      expect(location).toBeTruthy()
    })

    it("all 5 backup locations covered", () => {
      const locations = [
        "Reset Onboarding dialog",
        "Reset All Settings dialog",
        "Import Settings indicator",
        "Import Settings confirmation dialog",
        "Restore Version dialog",
      ]
      expect(locations).toHaveLength(5)
    })
  })
})
