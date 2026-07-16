import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const InventoryOperationEnum = z.enum([
  "calculate_cogs",
  "valuation_adjustment",
  "inventory_summary",
])

export const InventoryOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const InventorySummarySchema = z.object({
  totalValue: z.number(),
  itemCount: z.number(),
  adjustments: z.number(),
})

export type InventorySummary = z.infer<typeof InventorySummarySchema>

export const InventoryAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  subtype: z.string(),
  balance: z.number(),
})

export type InventoryAccount = z.infer<typeof InventoryAccountSchema>

export const CogsResultSchema = z.object({
  inventoryAccounts: z.array(InventoryAccountSchema),
  cogsAccounts: z.array(InventoryAccountSchema),
  totalInventoryValue: z.number(),
  totalCogs: z.number(),
})

export type CogsResult = z.infer<typeof CogsResultSchema>

export const InventoryState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Operation
  currentOperation: Annotation<{
    type: z.infer<typeof InventoryOperationEnum>
    status: z.infer<typeof InventoryOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  // Inventory summary
  inventorySummary: Annotation<InventorySummary | null>,

  // Audit trail
  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Result
  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  // Errors
  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
})

export type InventoryStateType = typeof InventoryState.State
