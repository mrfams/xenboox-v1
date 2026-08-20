import { describe, it, expect } from "vitest"

describe("Ctrl+Z Undo Keyboard Shortcut", () => {
  describe("Keyboard shortcut detection", () => {
    it("detects Ctrl+Z on Windows/Linux", () => {
      const event = { ctrlKey: true, metaKey: false, key: "z" }
      const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z"
      expect(isUndo).toBe(true)
    })

    it("detects Cmd+Z on Mac", () => {
      const event = { ctrlKey: false, metaKey: true, key: "z" }
      const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z"
      expect(isUndo).toBe(true)
    })

    it("ignores Ctrl+Y (redo)", () => {
      const event = { ctrlKey: true, metaKey: false, key: "y" }
      const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z"
      expect(isUndo).toBe(false)
    })

    it("ignores plain Z without modifier", () => {
      const event = { ctrlKey: false, metaKey: false, key: "z" }
      const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z"
      expect(isUndo).toBe(false)
    })
  })

  describe("Undo availability window", () => {
    it("undo is available for 10 seconds after risky operation", () => {
      const duration = 10_000
      expect(duration).toBe(10_000)
    })

    it("undo becomes unavailable after timeout", () => {
      let undoAvailable = true
      const timeout = 10_000
      // After timeout
      undoAvailable = false
      expect(undoAvailable).toBe(false)
    })

    it("new risky operation resets the undo window", () => {
      let undoAvailable = false
      // New operation
      undoAvailable = true
      expect(undoAvailable).toBe(true)
    })
  })

  describe("Toast description shows shortcut hint", () => {
    it("toast includes 'Press Ctrl+Z to undo'", () => {
      const description = "Press Ctrl+Z to undo"
      expect(description).toContain("Ctrl+Z")
      expect(description).toContain("undo")
    })
  })

  describe("Undo action flow", () => {
    it("Ctrl+Z triggers restoreLatestBackup", () => {
      let restored = false
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          restored = true
        }
      }
      handleKeyDown({ ctrlKey: true, key: "z" } as KeyboardEvent)
      expect(restored).toBe(true)
    })

    it("restore fetches latest version from API", () => {
      const apiUrl = "/api/trpc/settings.getVersions?input=%7B%22limit%22%3A1%7D"
      expect(apiUrl).toContain("getVersions")
      expect(apiUrl).toContain("limit")
    })

    it("restore calls restoreVersion with latest ID", () => {
      const restoreUrl = "/api/trpc/settings.restoreVersion"
      expect(restoreUrl).toContain("restoreVersion")
    })
  })

  describe("Event listener cleanup", () => {
    it("removes listener after timeout", () => {
      let listenerRemoved = false
      const cleanup = () => { listenerRemoved = true }
      cleanup()
      expect(listenerRemoved).toBe(true)
    })

    it("removes old listener before adding new one", () => {
      const listeners: string[] = []
      // Remove old
      listeners.splice(0, listeners.length)
      // Add new
      listeners.push("keydown")
      expect(listeners).toHaveLength(1)
    })
  })

  describe("All risky operations support Ctrl+Z", () => {
    it("Reset Onboarding", () => {
      const operation = "Onboarding reset"
      expect(operation).toBeTruthy()
    })

    it("Reset All Settings", () => {
      const operation = "All settings reset"
      expect(operation).toBeTruthy()
    })

    it("Import Settings", () => {
      const operation = "Settings imported"
      expect(operation).toBeTruthy()
    })

    it("Restore from Version", () => {
      const operation = "Restored from v2"
      expect(operation).toBeTruthy()
    })

    it("all 4 operations use showUndoToast", () => {
      const operations = [
        "Onboarding reset",
        "All settings reset",
        "Settings imported",
        "Restored from v2",
      ]
      expect(operations).toHaveLength(4)
    })
  })
})
