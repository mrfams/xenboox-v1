import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { customers, salesInvoices, paymentsAr } from "@xenboox/db/schema/ap-ar"
import type { AgingReport, AgingBucket, OverdueAlert } from "./state"

// ─── Aging Report ───────────────────────────────────────────────────────────

export async function generateAgingReport(entityId: string): Promise<AgingReport> {
  const invoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      eq(salesInvoices.status, "pending"),
    ),
  })

  const partialInvoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      eq(salesInvoices.status, "partial"),
    ),
  })

  const allOpen = [...invoices, ...partialInvoices]

  const now = new Date()
  const buckets: AgingBucket = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days120Plus: 0,
  }

  let totalOutstanding = 0
  let overdueCount = 0

  for (const inv of allOpen) {
    const balance = Number(inv.balance)
    if (balance <= 0) continue

    const dueDate = new Date(inv.dueDate)
    const diffMs = now.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    totalOutstanding += balance

    if (diffDays <= 0) {
      buckets.current += balance
    } else if (diffDays <= 30) {
      buckets.days30 += balance
      overdueCount++
    } else if (diffDays <= 60) {
      buckets.days60 += balance
      overdueCount++
    } else if (diffDays <= 90) {
      buckets.days90 += balance
      overdueCount++
    } else {
      buckets.days120Plus += balance
      overdueCount++
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalOutstanding,
    buckets,
    invoiceCount: allOpen.filter((inv) => Number(inv.balance) > 0).length,
    overdueCount,
  }
}

// ─── Overdue Alerts ─────────────────────────────────────────────────────────

function getEscalationLevel(daysOverdue: number): "7d" | "30d" | "60d" | "90d+" {
  if (daysOverdue > 90) return "90d+"
  if (daysOverdue > 60) return "60d"
  if (daysOverdue > 30) return "30d"
  return "7d"
}

export async function getOverdueAlerts(entityId: string): Promise<OverdueAlert[]> {
  const invoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      eq(salesInvoices.status, "pending"),
    ),
  })

  const partialInvoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      eq(salesInvoices.status, "partial"),
    ),
  })

  const allOpen = [...invoices, ...partialInvoices]
  const now = new Date()
  const alerts: OverdueAlert[] = []

  for (const inv of allOpen) {
    const balance = Number(inv.balance)
    if (balance <= 0) continue

    const dueDate = new Date(inv.dueDate)
    const diffMs = now.getTime() - dueDate.getTime()
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (daysOverdue <= 0) continue

    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, inv.customerId),
        eq(customers.entityId, entityId),
      ),
    })

    alerts.push({
      invoiceId: inv.id,
      customerName: customer?.name ?? "Unknown",
      amount: balance,
      daysOverdue,
      escalationLevel: getEscalationLevel(daysOverdue),
    })
  }

  return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

// ─── Payment Matching (FIFO) ────────────────────────────────────────────────

export interface PaymentData {
  paymentId: string
  customerId: string
  amount: number
  paymentDate: string
  reference?: string
}

export interface MatchResult {
  paymentId: string
  matchedInvoices: Array<{
    invoiceId: string
    invoiceNumber: string
    amountApplied: number
  }>
  remainingAmount: number
  totalApplied: number
}

export async function matchPayment(
  entityId: string,
  paymentData: PaymentData
): Promise<MatchResult> {
  const invoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      eq(salesInvoices.customerId, paymentData.customerId),
    ),
  })

  // Filter to open invoices and sort by date (FIFO)
  const openInvoices = invoices
    .filter((inv) => {
      const balance = Number(inv.balance)
      return balance > 0 && (inv.status === "pending" || inv.status === "partial")
    })
    .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())

  let remainingAmount = paymentData.amount
  const matchedInvoices: MatchResult["matchedInvoices"] = []

  for (const inv of openInvoices) {
    if (remainingAmount <= 0) break

    const balance = Number(inv.balance)
    const applied = Math.min(balance, remainingAmount)
    remainingAmount -= applied

    // Update invoice
    const newPaidAmount = Number(inv.paidAmount) + applied
    const newBalance = Number(inv.totalAmount) - newPaidAmount
    const newStatus = newBalance <= 0 ? "paid" : "partial"

    await db
      .update(salesInvoices)
      .set({
        paidAmount: String(newPaidAmount),
        balance: String(newBalance),
        status: newStatus,
      })
      .where(eq(salesInvoices.id, inv.id))

    // Record payment against invoice
    await db.insert(paymentsAr).values({
      entityId,
      salesInvoiceId: inv.id,
      amount: String(applied),
      paymentDate: paymentData.paymentDate,
      method: "bank_transfer",
      reference: paymentData.reference ?? null,
    })

    matchedInvoices.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amountApplied: applied,
    })
  }

  return {
    paymentId: paymentData.paymentId,
    matchedInvoices,
    remainingAmount,
    totalApplied: paymentData.amount - remainingAmount,
  }
}
