import { Annotation } from "@langchain/langgraph"
import { z } from "zod"
import type { AuditEntry } from "../../core/state"

export const AssetOperationEnum = z.enum([
  "calculate_depreciation",
  "register_asset",
  "dispose_asset",
  "asset_register",
])

export const AssetOperationStatusEnum = z.enum(["processing", "completed", "failed"])

export const AssetItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  category: z.string(),
  purchaseDate: z.string(),
  cost: z.number(),
  depreciationMethod: z.string(),
  accumulatedDepreciation: z.number(),
  netBookValue: z.number(),
  status: z.string(),
})

export type AssetItem = z.infer<typeof AssetItemSchema>

export const DepreciationResultSchema = z.object({
  assetId: z.string(),
  assetName: z.string(),
  cost: z.number(),
  salvageValue: z.number(),
  usefulLife: z.number(),
  annualDepreciation: z.number(),
  monthlyDepreciation: z.number(),
  accumulatedDepreciation: z.number(),
  netBookValue: z.number(),
  depreciationDate: z.string(),
})

export type DepreciationResult = z.infer<typeof DepreciationResultSchema>

export const AssetState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Operation
  currentOperation: Annotation<{
    type: z.infer<typeof AssetOperationEnum>
    status: z.infer<typeof AssetOperationStatusEnum>
    input: Record<string, unknown>
    output: unknown | null
    error: string | null
  } | null>,

  // Asset register
  assetRegister: Annotation<AssetItem[] | null>,

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

export type AssetStateType = typeof AssetState.State
