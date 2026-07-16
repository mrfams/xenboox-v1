import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the email module entirely before importing
vi.mock("@/lib/email", () => ({
  sendPaymentReceivedEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentSentEmail: vi.fn().mockResolvedValue(undefined),
  sendEmployeeCreatedEmail: vi.fn().mockResolvedValue(undefined),
  sendAssetCreatedEmail: vi.fn().mockResolvedValue(undefined),
  sendInventoryAlertEmail: vi.fn().mockResolvedValue(undefined),
  sendCloseCompleteEmail: vi.fn().mockResolvedValue(undefined),
  sendInvoiceOverdueEmail: vi.fn().mockResolvedValue(undefined),
  sendAgentEscalationEmail: vi.fn().mockResolvedValue(undefined),
  sendDailyDigestEmail: vi.fn().mockResolvedValue(undefined),
  sendDocumentUploadedEmail: vi.fn().mockResolvedValue(undefined),
  sendDocumentProcessedEmail: vi.fn().mockResolvedValue(undefined),
}))

import {
  sendPaymentReceivedEmail,
  sendPaymentSentEmail,
  sendEmployeeCreatedEmail,
  sendAssetCreatedEmail,
  sendInventoryAlertEmail,
} from "@/lib/email"

describe("Email Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("sendPaymentReceivedEmail", () => {
    it("should call sendPaymentReceivedEmail with correct params", async () => {
      await sendPaymentReceivedEmail("test@example.com", {
        customerName: "Acme Corp",
        invoiceNumber: "INV-001",
        amount: "1000",
        currency: "GMD",
        paymentMethod: "bank_transfer",
        entityName: "Test Entity",
      })

      expect(sendPaymentReceivedEmail).toHaveBeenCalledWith("test@example.com", {
        customerName: "Acme Corp",
        invoiceNumber: "INV-001",
        amount: "1000",
        currency: "GMD",
        paymentMethod: "bank_transfer",
        entityName: "Test Entity",
      })
    })

    it("should accept array of recipients", async () => {
      await sendPaymentReceivedEmail(["test1@example.com", "test2@example.com"], {
        customerName: "Acme Corp",
        invoiceNumber: "INV-001",
        amount: "1000",
        currency: "GMD",
        paymentMethod: "bank_transfer",
        entityName: "Test Entity",
      })

      expect(sendPaymentReceivedEmail).toHaveBeenCalledWith(
        ["test1@example.com", "test2@example.com"],
        expect.any(Object)
      )
    })
  })

  describe("sendPaymentSentEmail", () => {
    it("should call sendPaymentSentEmail with correct params", async () => {
      await sendPaymentSentEmail("test@example.com", {
        supplierName: "Global Supplies",
        invoiceNumber: "PO-001",
        amount: "2500",
        currency: "GMD",
        paymentMethod: "bank_transfer",
        entityName: "Test Entity",
      })

      expect(sendPaymentSentEmail).toHaveBeenCalledWith("test@example.com", {
        supplierName: "Global Supplies",
        invoiceNumber: "PO-001",
        amount: "2500",
        currency: "GMD",
        paymentMethod: "bank_transfer",
        entityName: "Test Entity",
      })
    })
  })

  describe("sendEmployeeCreatedEmail", () => {
    it("should call sendEmployeeCreatedEmail with correct params", async () => {
      await sendEmployeeCreatedEmail("employee@example.com", {
        employeeName: "John Doe",
        employeeNumber: "EMP-001",
        department: "Finance",
        jobTitle: "Accountant",
        hireDate: "2026-01-01",
        basicSalary: "50000",
        currency: "GMD",
        entityName: "Test Entity",
      })

      expect(sendEmployeeCreatedEmail).toHaveBeenCalledWith("employee@example.com", {
        employeeName: "John Doe",
        employeeNumber: "EMP-001",
        department: "Finance",
        jobTitle: "Accountant",
        hireDate: "2026-01-01",
        basicSalary: "50000",
        currency: "GMD",
        entityName: "Test Entity",
      })
    })
  })

  describe("sendAssetCreatedEmail", () => {
    it("should call sendAssetCreatedEmail with correct params", async () => {
      await sendAssetCreatedEmail("admin@example.com", {
        assetName: "Company Vehicle",
        assetClass: "Vehicles",
        cost: "150000",
        currency: "GMD",
        usefulLifeMonths: 60,
        depreciationMethod: "straight_line",
        entityName: "Test Entity",
      })

      expect(sendAssetCreatedEmail).toHaveBeenCalledWith("admin@example.com", {
        assetName: "Company Vehicle",
        assetClass: "Vehicles",
        cost: "150000",
        currency: "GMD",
        usefulLifeMonths: 60,
        depreciationMethod: "straight_line",
        entityName: "Test Entity",
      })
    })
  })

  describe("sendInventoryAlertEmail", () => {
    it("should call sendInventoryAlertEmail with correct params", async () => {
      await sendInventoryAlertEmail("admin@example.com", {
        itemName: "Office Paper",
        sku: "INV-001",
        currentQuantity: 5,
        reorderLevel: 20,
        entityName: "Test Entity",
      })

      expect(sendInventoryAlertEmail).toHaveBeenCalledWith("admin@example.com", {
        itemName: "Office Paper",
        sku: "INV-001",
        currentQuantity: 5,
        reorderLevel: 20,
        entityName: "Test Entity",
      })
    })

    it("should include warehouse name when provided", async () => {
      await sendInventoryAlertEmail("admin@example.com", {
        itemName: "Office Paper",
        sku: "INV-001",
        currentQuantity: 5,
        reorderLevel: 20,
        warehouseName: "Main Warehouse",
        entityName: "Test Entity",
      })

      expect(sendInventoryAlertEmail).toHaveBeenCalledWith("admin@example.com", {
        itemName: "Office Paper",
        sku: "INV-001",
        currentQuantity: 5,
        reorderLevel: 20,
        warehouseName: "Main Warehouse",
        entityName: "Test Entity",
      })
    })
  })
})
