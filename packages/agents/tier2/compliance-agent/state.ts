import { Annotation } from "@langchain/langgraph";
import type { AuditEntry } from "../../core/state";

export const ComplianceOperationEnum = {
  TAX_REVIEW: "tax_review",
  FILING_STATUS: "filing_status",
  CLOSE_CONFIRMATION: "close_confirmation",
  AUDIT_PREP: "audit_prep",
  MONITOR_DEADLINES: "monitor_deadlines",
  REVIEW_TAX_AGENT: "review_tax_agent",
  DETECT_RULE_CHANGE: "detect_rule_change",
  CONFIRM_RULE_UPDATE: "confirm_rule_update",
  REPORT_STATUS: "report_status",
} as const;

export type ComplianceOperationType =
  (typeof ComplianceOperationEnum)[keyof typeof ComplianceOperationEnum];

export const DeadlineUrgencyEnum = {
  NORMAL: "normal",
  APPROACHING: "approaching",
  CRITICAL: "critical",
  OVERDUE: "overdue",
} as const;

export type DeadlineUrgencyType =
  (typeof DeadlineUrgencyEnum)[keyof typeof DeadlineUrgencyEnum];

export interface DeadlineItem {
  id: string;
  name: string;
  jurisdiction: string;
  filingType: string;
  dueDate: string;
  daysUntilDue: number;
  urgency: DeadlineUrgencyType;
  status: string;
  packageReady: boolean;
  taxAgentReviewStatus: string;
  regulatoryStatus: string;
}

export interface RuleChangeProposal {
  id: string;
  jurisdiction: string;
  ruleType: string;
  ruleName: string;
  detectedAt: string;
  sourceCitation: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  effectiveDate: string | null;
  status: string;
}

export const ComplianceState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  currentOperation: Annotation<{
    type: ComplianceOperationType;
    status: "processing" | "completed" | "failed";
    input: Record<string, unknown>;
    output: unknown | null;
    error: string | null;
  } | null>,

  filingStatus: Annotation<{
    vat: "current" | "overdue" | "not_applicable";
    incomeTax: "current" | "overdue";
    payroll: "current" | "overdue";
  } | null>,

  deadlines: Annotation<DeadlineItem[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  deadlineMonitoringState: Annotation<{
    status:
      | "monitoring"
      | "deadline_approaching"
      | "tax_agent_review"
      | "regulatory_status_reported";
    threshold: number | null;
    escalatedDeadlines: string[];
  } | null>,

  ruleChangeState: Annotation<{
    status:
      | "idle"
      | "rule_update_detected"
      | "human_review_requested"
      | "rule_set_updated";
    proposal: RuleChangeProposal | null;
  } | null>,

  regulatoryStatus: Annotation<{
    status: "clean" | "items_pending" | "risk_detected";
    summary: string;
    pendingItems: number;
    lastReportedAt: string | null;
  } | null>,

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
});

export type ComplianceStateType = typeof ComplianceState.State;
