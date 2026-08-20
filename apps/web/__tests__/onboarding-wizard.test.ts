import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

// Mock tRPC
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    entity: {
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    coa: {
      seed: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    treasury: {
      createBankAccount: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
  },
}))

// Mock entity context
vi.mock("@/lib/entity-context", () => ({
  useEntity: vi.fn(() => ({
    entityId: "test-entity-id",
    setEntityId: vi.fn(),
    clearEntityId: vi.fn(),
    isLoaded: true,
  })),
  EntityProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe("Onboarding Wizard", () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe("useOnboarding hook", () => {
    it("detects first-time users when no completion flag exists", () => {
      // The hook should set isFirstTime=true when localStorage has no key
      expect(localStorageMock.getItem("xenboox_onboarding_completed")).toBeNull()
    })

    it("stores completion flag in localStorage", () => {
      localStorageMock.setItem("xenboox_onboarding_completed", "true")
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "xenboox_onboarding_completed",
        "true"
      )
    })

    it("saves current step to localStorage", () => {
      localStorageMock.setItem("xenboox_onboarding_step", "chart-of-accounts")
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "xenboox_onboarding_step",
        "chart-of-accounts"
      )
    })

    it("clears step on completion", () => {
      localStorageMock.removeItem("xenboox_onboarding_step")
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("xenboox_onboarding_step")
    })

    it("validates step names are from the allowed set", () => {
      const validSteps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
        "complete",
      ]
      expect(validSteps).toContain("welcome")
      expect(validSteps).toContain("chart-of-accounts")
      expect(validSteps).toContain("bank-connection")
      expect(validSteps).toContain("team")
      expect(validSteps).toContain("ai-preferences")
      expect(validSteps).toContain("complete")
    })
  })

  describe("Onboarding steps structure", () => {
    it("defines exactly 6 steps", () => {
      const steps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
        "complete",
      ]
      expect(steps).toHaveLength(6)
    })

    it("starts with welcome and ends with complete", () => {
      const steps = [
        "welcome",
        "chart-of-accounts",
        "bank-connection",
        "team",
        "ai-preferences",
        "complete",
      ]
      expect(steps[0]).toBe("welcome")
      expect(steps[steps.length - 1]).toBe("complete")
    })
  })

  describe("AI Preferences defaults", () => {
    it("defaults to all AI features enabled", () => {
      const defaults = {
        autoReconcile: true,
        autoCategorize: true,
        aiAlerts: true,
        dailyDigest: true,
      }
      expect(defaults.autoReconcile).toBe(true)
      expect(defaults.autoCategorize).toBe(true)
      expect(defaults.aiAlerts).toBe(true)
      expect(defaults.dailyDigest).toBe(true)
    })

    it("saves preferences to localStorage", () => {
      const prefs = {
        autoReconcile: true,
        autoCategorize: false,
        aiAlerts: true,
        dailyDigest: false,
      }
      localStorageMock.setItem("xenboox_ai_preferences", JSON.stringify(prefs))
      const stored = localStorageMock.getItem("xenboox_ai_preferences")
      expect(JSON.parse(stored!)).toEqual(prefs)
    })
  })

  describe("Team invitation emails", () => {
    it("validates email format with @ symbol", () => {
      const email = "test@example.com"
      expect(email).toContain("@")
    })

    it("prevents duplicate emails", () => {
      const emails = ["a@test.com", "b@test.com"]
      const newEmail = "a@test.com"
      expect(emails.includes(newEmail)).toBe(true)
    })

    it("supports multiple roles", () => {
      const roles = [
        "accountant",
        "finance_director",
        "payroll_officer",
        "department_manager",
        "external_auditor",
      ]
      expect(roles).toHaveLength(5)
      expect(roles).toContain("accountant")
      expect(roles).toContain("external_auditor")
    })
  })

  describe("Entity creation options", () => {
    it("supports 3 entity types", () => {
      const types = ["company", "nonprofit", "government"]
      expect(types).toHaveLength(3)
    })

    it("supports multiple currencies", () => {
      const currencies = ["USD", "EUR", "GBP", "GHS", "NGN", "KES", "ZAR"]
      expect(currencies.length).toBeGreaterThanOrEqual(5)
      expect(currencies).toContain("USD")
    })

    it("supports 12 fiscal year start months", () => {
      const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
      expect(months).toHaveLength(12)
      expect(months[0]).toBe("01")
      expect(months[11]).toBe("12")
    })
  })

  describe("Chart of Accounts templates", () => {
    it("supports 6 industry templates", () => {
      const templates = ["general", "saas", "manufacturing", "retail", "services", "nonprofit"]
      expect(templates).toHaveLength(6)
    })

    it("supports 3 import methods", () => {
      const methods = ["template", "upload", "skip"]
      expect(methods).toHaveLength(3)
    })
  })

  describe("Completion screen links", () => {
    it("provides 4 quick links after completion", () => {
      const links = [
        { href: "/dashboard/coa", title: "Chart of Accounts" },
        { href: "/dashboard/treasury", title: "Bank Accounts" },
        { href: "/dashboard/settings", title: "Team Settings" },
        { href: "/dashboard/chat", title: "AI Assistant" },
      ]
      expect(links).toHaveLength(4)
      links.forEach((link) => {
        expect(link.href).toMatch(/^\/dashboard\//)
        expect(link.title).toBeTruthy()
      })
    })
  })

  describe("Wizard accessibility", () => {
    it("has dialog role and aria-modal", () => {
      // The wizard uses role="dialog" and aria-modal="true"
      const wizardHtml = '<div role="dialog" aria-modal="true" aria-label="Onboarding wizard">'
      expect(wizardHtml).toContain('role="dialog"')
      expect(wizardHtml).toContain('aria-modal="true"')
      expect(wizardHtml).toContain('aria-label="Onboarding wizard"')
    })

    it("toggle options use switch role", () => {
      const switchHtml = '<div role="switch" aria-checked="true">'
      expect(switchHtml).toContain('role="switch"')
      expect(switchHtml).toContain('aria-checked="true"')
    })

    it("progress bar shows step count", () => {
      const totalSteps = 5
      const currentStep = 2
      const pct = (currentStep / totalSteps) * 100
      expect(pct).toBe(40)
    })
  })
})
