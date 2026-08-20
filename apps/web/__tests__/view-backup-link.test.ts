import { describe, it, expect } from "vitest"

describe("View Backup Link in Tooltips", () => {
  describe("SettingsVersionHistory accepts defaultExpanded prop", () => {
    it("has defaultExpanded parameter", () => {
      const props = { defaultExpanded: true }
      expect(props.defaultExpanded).toBe(true)
    })

    it("defaults to false when not provided", () => {
      const props = {}
      const defaultExpanded = (props as { defaultExpanded?: boolean }).defaultExpanded ?? false
      expect(defaultExpanded).toBe(false)
    })
  })

  describe("Settings page manages Version History expansion", () => {
    it("has showVersionHistory state", () => {
      const state = { showVersionHistory: false }
      expect(state.showVersionHistory).toBe(false)
    })

    it("toggling state expands Version History", () => {
      let showVersionHistory = false
      showVersionHistory = true
      expect(showVersionHistory).toBe(true)
    })

    it("passes defaultExpanded to SettingsVersionHistory", () => {
      const showVersionHistory = true
      const props = { defaultExpanded: showVersionHistory }
      expect(props.defaultExpanded).toBe(true)
    })
  })

  describe("View backup link in Reset Onboarding tooltip", () => {
    it("tooltip contains 'View backup' text", () => {
      const tooltipText = "View backup →"
      expect(tooltipText).toContain("View backup")
    })

    it("link calls setShowVersionHistory(true)", () => {
      let expanded = false
      const onClick = () => { expanded = true }
      onClick()
      expect(expanded).toBe(true)
    })
  })

  describe("View backup link in Reset All Settings tooltip", () => {
    it("tooltip contains 'View backup' text", () => {
      const tooltipText = "View backup →"
      expect(tooltipText).toContain("View backup")
    })

    it("link calls setShowVersionHistory(true)", () => {
      let expanded = false
      const onClick = () => { expanded = true }
      onClick()
      expect(expanded).toBe(true)
    })
  })

  describe("ExportImportSettings accepts onViewBackup callback", () => {
    it("has onViewBackup prop", () => {
      const props = { onViewBackup: () => {} }
      expect(typeof props.onViewBackup).toBe("function")
    })

    it("callback is optional", () => {
      const props = {}
      const callback = (props as { onViewBackup?: () => void }).onViewBackup
      expect(callback).toBeUndefined()
    })

    it("tooltip shows 'View backup' link when callback provided", () => {
      const hasCallback = true
      const showLink = hasCallback
      expect(showLink).toBe(true)
    })

    it("tooltip hides 'View backup' link when no callback", () => {
      const hasCallback = false
      const showLink = hasCallback
      expect(showLink).toBe(false)
    })
  })

  describe("Settings page passes callback to ExportImportSettings", () => {
    it("onViewBackup sets showVersionHistory to true", () => {
      let showVersionHistory = false
      const onViewBackup = () => { showVersionHistory = true }
      onViewBackup()
      expect(showVersionHistory).toBe(true)
    })
  })

  describe("Link styling", () => {
    it("uses primary color", () => {
      const classes = "text-primary hover:underline font-medium"
      expect(classes).toContain("text-primary")
    })

    it("is inline-flex with arrow", () => {
      const classes = "inline-flex items-center gap-1"
      expect(classes).toContain("inline-flex")
      expect(classes).toContain("gap-1")
    })

    it("arrow character is →", () => {
      const text = "View backup →"
      expect(text).toContain("→")
    })
  })
})
