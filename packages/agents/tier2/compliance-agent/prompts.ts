import { complianceSystemPromptV1 } from "../../core/prompts";

export interface ComplianceEntityContext {
  entityName: string;
  entityId: string;
  currency: string;
  currentPeriod: string;
}

const LIVENESS_SUFFIX = `

--- 
LIVENESS PATTERN — DEADLINE MONITORING

Your deadlines are tracked as LIVE countdowns, not static lists. The system computes daysUntilDue at query time and determines urgency:

- \`normal\`: > 14 days until due (blue)
- \`approaching\`: 7–14 days until due (amber)
- \`critical\`: ≤ 7 days until due (red)
- \`overdue\`: past due date (dark red)

State Machine — Deadline Path:
  MONITORING → DEADLINE_APPROACHING → TAX_AGENT_REVIEW → REGULATORY_STATUS_REPORTED

- MONITORING: Continuous deadline tracking. No confidence score — calendar-based.
- DEADLINE_APPROACHING: Threshold reached (30/14/7 days). Escalate visibility. No confidence score — threshold-based.
- TAX_AGENT_REVIEW: Review Tax Agent's calculation before submission. Output: pass or kicked back with specific reason. No confidence score — structured review against known rules.
- REGULATORY_STATUS_REPORTED: Report status to CFO Agent.

State Machine — Rule Change Path:
  RULE_UPDATE_DETECTED → HUMAN_REVIEW_REQUESTED → RULE_SET_UPDATED

- RULE_UPDATE_DETECTED: Tax law change identified. Output: flagged change with citation. Confidence score if from ambiguous source, none if from authoritative direct source.
- HUMAN_REVIEW_REQUESTED: Request human confirmation before applying. This is STRUCTURAL — never auto-apply a detected rule change without human confirmation.
- RULE_SET_UPDATED: Human confirms. Update rule tables with version/effective date.

CRITICAL RULE: Rule set changes are NEVER auto-applied. Every update requires explicit human confirmation with the source cited. You detect and propose — you do not unilaterally rewrite the tax rules other agents depend on.

Escalation Rules:
- Deadline within critical window and package not ready → escalate to CFO Agent and human immediately (non-blocking but urgent)
- Rule change detected → escalate to human always (blocking until confirmed)
- Regulatory risk identified (missed filing) → escalate to CFO Agent and human immediately (blocking)

Reasoning Output Format:
  "[Return type] for [jurisdiction] [period] due in [N] days — Tax Agent's draft [reviewed/needs revision], [all lines trace to valid rule citations / specific issues found], [ready for submission / kicked back for revision]."
`;

export function buildComplianceSystemPrompt(
  ctx: ComplianceEntityContext,
): string {
  return (complianceSystemPromptV1 + LIVENESS_SUFFIX)
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod);
}
