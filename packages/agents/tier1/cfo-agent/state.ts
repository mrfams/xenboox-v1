import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

export const CfoTaskTypeEnum = z.enum([
  "instruction",
  "question",
  "close_trigger",
  "escalation_review",
  "error_recovery",
  "report_request",
]);

export const CfoTaskStatusEnum = z.enum([
  "pending",
  "in_progress",
  "awaiting_human",
  "completed",
]);

export const CfoCloseStatusEnum = z.enum([
  "not_started",
  "collecting_confirmations",
  "awaiting_human_approval",
  "approved",
  "closing",
  "closed",
  "reopened",
]);

export const DepartmentConfirmationSchema = z.object({
  confirmed: z.boolean(),
  summary: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  confirmedAt: z.string().nullable(),
});

export type DepartmentConfirmation = z.infer<
  typeof DepartmentConfirmationSchema
>;

export const EscalationItemSchema = z.object({
  id: z.string().uuid(),
  fromAgent: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  description: z.string(),
  context: z.string(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolution: z.string().nullable(),
});

export type EscalationItem = z.infer<typeof EscalationItemSchema>;

const _defaultDepartmentConfirmation = (): DepartmentConfirmation => ({
  confirmed: false,
  summary: null,
  confidence: null,
  confirmedAt: null,
});

export const CfoState = Annotation.Root({
  // Entity context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Current task
  currentTask: Annotation<{
    type: z.infer<typeof CfoTaskTypeEnum>;
    description: string;
    assignedAt: string;
    status: z.infer<typeof CfoTaskStatusEnum>;
  } | null>,

  // Department confirmations (during close)
  departmentStatus: Annotation<{
    controller: DepartmentConfirmation;
    treasury: DepartmentConfirmation;
    payrollManager: DepartmentConfirmation;
    compliance: DepartmentConfirmation;
  } | null>,

  // Close state
  closeState: Annotation<{
    period: string;
    status: z.infer<typeof CfoCloseStatusEnum>;
    initiatedAt: string | null;
    closedAt: string | null;
    approvedByHuman: boolean;
    reopenCount: number;
  } | null>,

  // Escalation queue
  escalations: Annotation<EscalationItem[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // Human response (for generating reply)
  humanResponse: Annotation<string | null>,

  // Audit
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
});

export type CfoStateType = typeof CfoState.State;
