import { db } from "@xenboox/db"
import { eq, and, lte } from "drizzle-orm"
import { suppliers, invoicesAp } from "@xenboox/db/schema/ap-ar"
import type { AgingReport, PaymentScheduleItem } from "./state"

// ─── Process Invoice ──────────────────────────────────────────────────────

export interface ProcessInvoiceInput {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  currency: string
  notes?: string
}

export interface ProcessInvoiceResult {
  success: boolean
  invoiceId?: string
  duplicateFound: boolean
  errors: string[]
}

export async function processInvoice(
  entityId: string,
  invoice: ProcessInvoiceInput
): Promise<ProcessInvoiceResult> {
  const errors: string[] = []

  const supplier = await db.query.suppliers.findFirst({
    where: and(
      eq(suppliers.id, invoice.supplierId),
      eq(suppliers.entityId, entityId),
      eq(suppliers.isActive, true)
    ),
  })

  if (!supplier) {
    errors.push(`Supplier ${invoice.supplierId} not found or inactive for entity ${entityId}`)
  }

  const existingInvoice = await db.query.invoicesAp.findFirst({
    where: and(
      eq(invoicesAp.entityId, entityId),
      eq(invoicesAp.supplierId, invoice.supplierId),
      eq(invoicesAp.invoiceNumber, invoice.invoiceNumber)
    ),
  })

  if (existingInvoice) {
    errors.push(
      `Duplicate invoice: supplier ${invoice.supplierId} already has invoice "${invoice.invoiceNumber}" (${existingInvoice.id})`
    )
    return { success: false, duplicateFound: true, errors }
  }

  if (invoice.totalAmount <= 0) {
    errors.push(`Invoice amount must be positive, got ${invoice.totalAmount}`)
  }

  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim().length === 0) {
    errors.push("Invoice number is required")
  }

  if (!invoice.invoiceDate) {
    errors.push("Invoice date is required")
  }

  if (!invoice.dueDate) {
    errors.push("Due date is required")
  }

  if (errors.length > 0) {
    return { success: false, duplicateFound: false, errors }
  }

  const [created] = await db
    .insert(invoicesAp)
    .values({
      entityId,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      totalAmount: String(invoice.totalAmount),
      balance: String(invoice.totalAmount),
      currency: invoice.currency,
      notes: invoice.notes ?? null,
    })
    .returning()

  return {
    success: true,
    invoiceId: created.id,
    duplicateFound: false,
    errors: [],
  }
}

// ─── Generate Aging Report ────────────────────────────────────────────────

export async function generateAgingReport(
  entityId: string
): Promise<AgingReport> {
  const now = new Date()

  const allInvoices = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
    ),
  })

  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days120Plus: 0 }
  let totalOutstanding = 0
  let invoiceCount = 0
  let overdueCount = 0

  for (const inv of allInvoices) {
    const status = inv.status
    if (status === "paid" || status === "voided") continue

    const balance = Number(inv.balance)
    if (balance <= 0) continue

    invoiceCount++
    totalOutstanding += balance

    const dueDate = new Date(inv.dueDate)
    const diffMs = now.getTime() - dueDate.getTime()
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

    if (diffDays > 0) overdueCount++

    if (diffDays <= 0) {
      buckets.current += balance
    } else if (diffDays <= 30) {
      buckets.days30 += balance
    } else if (diffDays <= 60) {
      buckets.days60 += balance
    } else if (diffDays <= 90) {
      buckets.days90 += balance
    } else {
      buckets.days120Plus += balance
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalOutstanding,
    buckets,
    invoiceCount,
    overdueCount,
  }
}

// ─── Get Payment Schedule ─────────────────────────────────────────────────

export async function getPaymentSchedule(
  entityId: string
): Promise<PaymentScheduleItem[]> {
  const now = new Date()
  const thirtyDaysOut = new Date(now)
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  const allInvoices = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
    ),
  })

  const schedule: PaymentScheduleItem[] = []

  for (const inv of allInvoices) {
    const status = inv.status
    if (status === "paid" || status === "voided") continue

    const balance = Number(inv.balance)
    if (balance <= 0) continue

    const dueDate = new Date(inv.dueDate)
    if (dueDate > thirtyDaysOut) continue

    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, inv.supplierId),
    })

    schedule.push({
      invoiceId: inv.id,
      supplierName: supplier?.name ?? "Unknown",
      amount: balance,
      dueDate: inv.dueDate,
      status,
    })
  }

  schedule.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return schedule
}
