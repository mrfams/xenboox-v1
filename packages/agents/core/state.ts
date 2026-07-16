import { Annotation } from "@langchain/langgraph"
import { z } from "zod"

export const AuditEntrySchema = z.object({
  agentId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  details: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
})

export type AuditEntry = z.infer<typeof AuditEntrySchema>

export const AgentMessageSchema = z.object({
  type: z.string(),
  from: z.string(),
  to: z.string(),
  entityId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
  timestamp: z.string(),
  payload: z.record(z.unknown()),
})

export type AgentMessage = z.infer<typeof AgentMessageSchema>

export const BaseAgentState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  taskType: Annotation<string>,
  input: Annotation<Record<string, unknown>>,

  steps: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  escalatedTo: Annotation<string | null>,
  escalationReason: Annotation<string | null>,

  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
})

export type BaseAgentStateType = typeof BaseAgentState.State

export function createAuditEntry(params: {
  agentId: string
  action: string
  details: Record<string, unknown>
  confidence: number
}): AuditEntry {
  return {
    ...params,
    timestamp: new Date().toISOString(),
  }
}
