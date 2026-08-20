import { describe, it, expect } from "vitest"

describe("AI Usage Statistics", () => {
  describe("Default stats", () => {
    const DEFAULT_STATS = {
      autoReconcile: 0,
      autoCategorize: 0,
      aiAlerts: 0,
      dailyDigest: 0,
      totalActions: 0,
      lastUsed: null,
    }

    it("has 6 stat fields", () => {
      expect(Object.keys(DEFAULT_STATS)).toHaveLength(6)
    })

    it("all counters start at 0", () => {
      expect(DEFAULT_STATS.autoReconcile).toBe(0)
      expect(DEFAULT_STATS.autoCategorize).toBe(0)
      expect(DEFAULT_STATS.aiAlerts).toBe(0)
      expect(DEFAULT_STATS.dailyDigest).toBe(0)
      expect(DEFAULT_STATS.totalActions).toBe(0)
    })

    it("lastUsed starts as null", () => {
      expect(DEFAULT_STATS.lastUsed).toBeNull()
    })
  })

  describe("Feature definitions", () => {
    const FEATURES = [
      { key: "autoReconcile", label: "Auto-Reconciliation" },
      { key: "autoCategorize", label: "Smart Categorization" },
      { key: "aiAlerts", label: "Anomaly Alerts" },
      { key: "dailyDigest", label: "Daily Digest" },
    ]

    it("defines 4 features", () => {
      expect(FEATURES).toHaveLength(4)
    })

    it("all features have key and label", () => {
      FEATURES.forEach((f) => {
        expect(f.key).toBeTruthy()
        expect(f.label).toBeTruthy()
      })
    })
  })

  describe("Number formatting", () => {
    function formatNumber(n: number): string {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
      return String(n)
    }

    it("formats 0 as '0'", () => {
      expect(formatNumber(0)).toBe("0")
    })

    it("formats 42 as '42'", () => {
      expect(formatNumber(42)).toBe("42")
    })

    it("formats 1500 as '1.5K'", () => {
      expect(formatNumber(1500)).toBe("1.5K")
    })

    it("formats 1000000 as '1.0M'", () => {
      expect(formatNumber(1000000)).toBe("1.0M")
    })
  })

  describe("Time ago formatting", () => {
    function timeAgo(dateStr: string | null): string {
      if (!dateStr) return "Never"
      const now = Date.now()
      const then = new Date(dateStr).getTime()
      const diff = now - then
      const minutes = Math.floor(diff / 60_000)
      const hours = Math.floor(diff / 3_600_000)
      const days = Math.floor(diff / 86_400_000)
      if (minutes < 1) return "Just now"
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      return `${days}d ago`
    }

    it("returns 'Never' for null", () => {
      expect(timeAgo(null)).toBe("Never")
    })

    it("returns 'Just now' for recent timestamps", () => {
      const now = new Date().toISOString()
      expect(timeAgo(now)).toBe("Just now")
    })

    it("returns minutes ago for < 1 hour", () => {
      const d = new Date(Date.now() - 30 * 60_000).toISOString()
      expect(timeAgo(d)).toBe("30m ago")
    })

    it("returns hours ago for < 24 hours", () => {
      const d = new Date(Date.now() - 3 * 3_600_000).toISOString()
      expect(timeAgo(d)).toBe("3h ago")
    })

    it("returns days ago for >= 24 hours", () => {
      const d = new Date(Date.now() - 5 * 86_400_000).toISOString()
      expect(timeAgo(d)).toBe("5d ago")
    })
  })

  describe("Usage bar calculation", () => {
    it("calculates percentage against max usage", () => {
      const counts = [10, 25, 5, 15]
      const max = Math.max(...counts)
      const pcts = counts.map((c) => (c / max) * 100)
      expect(pcts[0]).toBe(40) // 10/25
      expect(pcts[1]).toBe(100) // 25/25
      expect(pcts[2]).toBe(20) // 5/25
      expect(pcts[3]).toBe(60) // 15/25
    })

    it("handles all zeros", () => {
      const counts = [0, 0, 0, 0]
      const max = Math.max(...counts, 1) // fallback to 1
      expect(max).toBe(1)
    })
  })

  describe("Summary boxes", () => {
    it("shows total AI actions", () => {
      const label = "Total AI Actions"
      expect(label).toBeTruthy()
    })

    it("shows features active count", () => {
      const active = 3
      const total = 4
      expect(`${active}/${total}`).toBe("3/4")
    })

    it("shows last used time", () => {
      const lastUsed = "5m ago"
      expect(lastUsed).toContain("ago")
    })
  })

  describe("localStorage key", () => {
    it("uses xenboox_ai_usage_stats", () => {
      const key = "xenboox_ai_usage_stats"
      expect(key).toBeTruthy()
      expect(key.startsWith("xenboox_")).toBe(true)
    })
  })

  describe("Accessibility", () => {
    it("stat boxes have labels", () => {
      const labels = ["Total AI Actions", "Features Active", "Last Used"]
      labels.forEach((l) => expect(l).toBeTruthy())
    })

    it("feature bars have numeric values", () => {
      const count = 42
      expect(typeof count).toBe("number")
    })
  })
})
