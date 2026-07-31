import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { AuditEntry } from "../../core/state";

// ─── Liveness State Machine (§2 of Liveness Spec) ───────────────────────────

export const LivenessStateEnum = z.enum([
  "INSTRUCTION_RECEIVED",
  "ROUTING_TO_DEPARTMENT_HEAD",
  "AWAITING_DEPARTMENT_SUMMARIES",
  "SYNTHESIZING",
  "RESPONDING",
  "ESCALATION_RECEIVED_FROM_DEPT_HEAD",
  "FRAMING_FOR_HUMAN",
  "PRESENTED_TO_HUMAN",
]);

export type LivenessState = z.infer<typeof LivenessStateEnum>;

// ─── Source Refs (§9 — Traceable Claims) ────────────────────────────────────

export const SourceRefSchema = z.object({
  claim: z.string(),
  sourceDepartment: z.string(),
  sourceSummaryExcerpt: z.string(),
  confidence: z.number().min(0).max(1),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

// ─── Department Response (liveness-aware) ────────────────────────────────────

export const DepartmentResponseSchema = z.object({
  department: z.string(),
  status: z.enum(["pending", "received", "timed_out", "error"]),
  summary: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  receivedAt: z.string().nullable(),
  sourceRefs: z.array(SourceRefSchema).default([]),
});

export type DepartmentResponse = z.infer<typeof DepartmentResponseSchema>;

// ─── Escalation Frame (§6, §9) ──────────────────────────────────────────────

export const EscalationFrameSchema = z.object({
  id: z.string().uuid(),
  triggeringAgent: z.string(),
  triggeringDataRef: z.string(),
  originalInput: z.string(),
  departmentAssessment: z.string(),
  recommendation: z.string(),
  timeSensitivity: z.string().nullable(),
  presentedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolution: z.string().nullable(),
});

export type EscalationFrame = z.infer<typeof EscalationFrameSchema>;

// ─── Existing Types (unaltered semantics, preserved for compat) ─────────────

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

  // ── Liveness State Machine (§2) ─────────────────────────────────────────
  livenessState: Annotation<LivenessState>,

  // Routed departments — which departments were contacted
  routedDepartments: Annotation<string[]>({
    reducer: (curr, prev) => (curr.length > 0 ? curr : prev),
    default: () => [],
  }),

  // Department responses received so far
  departmentResponses: Annotation<DepartmentResponse[]>({
    reducer: (curr, prev) => {
      const merged = [...prev];
      for (const response of curr) {
        const idx = merged.findIndex(
          (r) => r.department === response.department,
        );
        if (idx >= 0) {
          merged[idx] = response;
        } else {
          merged.push(response);
        }
      }
      return merged;
    },
    default: () => [],
  }),

  // Source refs — every claim traced to its source (§4)
  sourceRefs: Annotation<SourceRef[]>({
    reducer: (curr, prev) => [...prev, ...curr],
    default: () => [],
  }),

  // Synthesized answer (composition of department summaries, not new facts)
  synthesizedAnswer: Annotation<string | null>,

  // Escalation frame (§6)
  escalationFrame: Annotation<EscalationFrame | null>,

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
