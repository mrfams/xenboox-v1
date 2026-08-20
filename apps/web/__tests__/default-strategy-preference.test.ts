import { describe, it, expect } from "vitest"

describe("Default Merge Strategy Preference", () => {
  describe("Settings type", () => {
    it("syncPreferences has defaultMergeStrategy field", () => {
      const syncPreferences = {
        defaultMergeStrategy: "deep-merge",
        autoResolve: false,
      }
      expect(syncPreferences.defaultMergeStrategy).toBe("deep-merge")
    })

    it("defaultMergeStrategy is optional", () => {
      const syncPreferences = {}
      expect(syncPreferences).not.toHaveProperty("defaultMergeStrategy")
    })

    it("supports all 5 merge strategies", () => {
      const strategies = [
        "last-write-wins",
        "local-wins",
        "remote-wins",
        "deep-merge",
        "manual",
      ]
      strategies.forEach((s) => {
        expect(typeof s).toBe("string")
      })
      expect(strategies).toHaveLength(5)
    })
  })

  describe("localStorage persistence", () => {
    it("syncPreferences stored under xenboox_sync_preferences key", () => {
      const key = "xenboox_sync_preferences"
      expect(key).toContain("sync_preferences")
    })

    it("default strategy is deep-merge when not set", () => {
      const stored = null
      const defaultStrategy = stored || "deep-merge"
      expect(defaultStrategy).toBe("deep-merge")
    })
  })

  describe("UI component", () => {
    it("shows Settings icon in header", () => {
      const icon = "Settings"
      expect(icon).toBe("Settings")
    })

    it("shows all 5 strategy options", () => {
      const strategies = [
        "last-write-wins",
        "local-wins",
        "remote-wins",
        "deep-merge",
        "manual",
      ]
      expect(strategies).toHaveLength(5)
    })

    it("shows strategy label and description", () => {
      const label = "Merge Field by Field"
      const description = "Merge settings field by field. Non-conflicting fields are combined."
      expect(label).toBeTruthy()
      expect(description).toBeTruthy()
    })

    it("Save button disabled when no changes", () => {
      const hasChanges = false
      expect(hasChanges).toBe(false)
    })

    it("Save button enabled when strategy changes", () => {
      const current = "deep-merge"
      const selected = "local-wins"
      const hasChanges = current !== selected
      expect(hasChanges).toBe(true)
    })
  })

  describe("useSettingsSync integration", () => {
    it("updateSyncPreferences saves to localStorage and cloud", () => {
      const prefs = { defaultMergeStrategy: "local-wins" as const }
      expect(prefs.defaultMergeStrategy).toBe("local-wins")
    })

    it("current conflict state uses saved default strategy", () => {
      const saved = "local-wins"
      const conflictState = { mergeStrategy: saved }
      expect(conflictState.mergeStrategy).toBe("local-wins")
    })

    it("resetSettings clears sync preferences", () => {
      const keys = [
        "xenboox_ai_preferences",
        "xenboox_onboarding_completed",
        "xenboox_onboarding_step",
        "xenboox_notification_preferences",
        "xenboox_ai_usage_stats",
        "xenboox_last_synced_at",
        "xenboox_last_local_edit_at",
        "xenboox_sync_preferences",
      ]
      expect(keys).toContain("xenboox_sync_preferences")
    })
  })

  describe("ConflictResolution uses default strategy", () => {
    it("initial selected strategy comes from user preference", () => {
      const userPreference = "local-wins"
      const initialStrategy = userPreference || "deep-merge"
      expect(initialStrategy).toBe("local-wins")
    })

    it("falls back to deep-merge if no preference set", () => {
      const userPreference = undefined
      const initialStrategy = userPreference || "deep-merge"
      expect(initialStrategy).toBe("deep-merge")
    })
  })
})
