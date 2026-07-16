import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const ApOperationEnum = z.enum([
  "process_invoice",
  "aging_report",
  "payment_schedule",
  "validate_invoice",
])

export const ApOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const CurrentInvoiceSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  invoiceNumber: z.string(),
  amount: z.number(),
  currency: z.string(),
  dueDate: z.string(),
  status: z.string(),
})

export type CurrentInvoice = z.infer<typeof CurrentInvoiceSchema>

export const AgingBucketSchema = z.object({
  current: z.number(),
  days30: z.number(),
  days60: z.number(),
  days90: z.number(),
  days120Plus: z.number(),
})

export const AgingReportSchema = z.object({
  generatedAt: z.string(),
  totalOutstanding: z.number(),
  buckets: AgingBucketSchema,
  invoiceCount: z.number(),
  overdueCount: z.number(),
})

export type AgingReport = z.infer<typeof AgingReportSchema>

export const PaymentScheduleItemSchema = z.object({
  invoiceId: z.string().uuid(),
  supplierName: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.string(),
})

export type PaymentScheduleItem = z.infer<typeof PaymentScheduleItemSchema>

export const ApState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: z.infer<typeof ApOperationEnum>
    status: z.infer<typeof ApOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  currentInvoice: Annotation<CurrentInvoice | null>,

  agingReport: Annotation<AgingReport | null>,

  paymentSchedule: Annotation<PaymentScheduleItem[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
})

export type ApStateType = typeof ApState.State
