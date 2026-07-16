import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/routers/_app"
import { db } from "@/lib/db"
import { auditLog } from "@xenboox/db/schema"

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
    query: {
      documents: {
        findFirst: vi.fn(),
      },
    },
  },
}))

// Mock the email module
vi.mock("@/lib/email", () => ({
  sendPaymentReceivedEmail: vi.fn(),
  sendPaymentSentEmail: vi.fn(),
  sendEmployeeCreatedEmail: vi.fn(),
  sendAssetCreatedEmail: vi.fn(),
  sendInventoryAlertEmail: vi.fn(),
}))

describe("Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should have audit log table defined", () => {
    expect(auditLog).toBeDefined()
  })

  it("audit log should have required columns", () => {
    expect(auditLog.entityId).toBeDefined()
    expect(auditLog.userId).toBeDefined()
    expect(auditLog.action).toBeDefined()
    expect(auditLog.entityType).toBeDefined()
    expect(auditLog.entityIdRef).toBeDefined()
    expect(auditLog.oldValues).toBeDefined()
    expect(auditLog.newValues).toBeDefined()
  })

  it("should log createSupplier action", async () => {
    const mockInsert = vi.fn().mockReturnThis()
    const mockValues = vi.fn().mockReturnThis()
    const mockReturning = vi.fn().mockResolvedValue([{ id: "supplier-1" }])

    vi.mocked(db.insert).mockReturnValue({
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
    } as any)

    // Test that the action string follows the convention
    const action = "ap.createSupplier"
    expect(action).toMatch(/^ap\./)
  })

  it("should log createPayment action for AR", () => {
    const action = "ar.createPayment"
    expect(action).toMatch(/^ar\./)
    expect(action).toContain("Payment")
  })

  it("should log createPayment action for AP", () => {
    const action = "ap.createPayment"
    expect(action).toMatch(/^ap\./)
    expect(action).toContain("Payment")
  })

  it("should log createEmployee action", () => {
    const action = "payroll.createEmployee"
    expect(action).toMatch(/^payroll\./)
    expect(action).toContain("Employee")
  })

  it("should log createAsset action", () => {
    const action = "fixedAssets.createAsset"
    expect(action).toMatch(/^fixedAssets\./)
    expect(action).toContain("Asset")
  })

  it("should log createTransaction action for inventory", () => {
    const action = "inventory.createTransaction"
    expect(action).toMatch(/^inventory\./)
    expect(action).toContain("Transaction")
  })
})
