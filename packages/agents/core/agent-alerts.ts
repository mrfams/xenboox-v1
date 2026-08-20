/**
 * Agent Alert Emission
 *
 * Utility for agents to push proactive alerts to the Activity Hub.
 * Called by the orchestrator after each run to auto-generate alerts
 * when anomalies, low confidence, or errors are detected.
 *
 * Alerts are persisted as notifications and broadcast via SSE
 * for real-time display in the Activity Hub.
 */

import { db } from "@xenboox/db";
import { notifications } from "@xenboox/db/schema/notifications";
import { logger } from "./logger";

// ─── Alert Types ──────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical" | "success";

export type AlertSource =
  | "cfo-agent"
  | "controller-agent"
  | "treasury-agent"
  | "payroll-agent"
  | "compliance-agent"
  | "ledger-agent"
  | "ap-agent"
  | "ar-agent"
  | "asset-agent"
  | "inventory-agent"
  | "reconciliation-agent"
  | "cash-agent"
  | "document-agent"
  | "audit-agent"
  | "analytics-agent"
  | "orchestrator";

export interface AgentAlert {
  entityId: string;
  userId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: AlertSource;
  metadata?: Record<string, unknown>;
}

// ─── Alert Templates ──────────────────────────────────────────────────────

/**
 * Generate an alert for a low-confidence agent result.
 * Confidence < 0.7 means the agent is uncertain and may need human review.
 */
export function lowConfidenceAlert(params: {
  entityId: string;
  userId: string;
  agentId: string;
  taskType: string;
  confidence: number;
  reasoning: string;
}): AgentAlert {
  const severity: AlertSeverity =
    params.confidence < 0.4 ? "critical" : "warning";

  return {
    entityId: params.entityId,
    userId: params.userId,
    title: `Low confidence: ${params.taskType.replace(/_/g, " ")}`,
    message: `${params.agentId} completed "${params.taskType.replace(/_/g, " ")}" with ${(params.confidence * 100).toFixed(0)}% confidence. ${params.reasoning}`,
    severity,
    source: `${params.agentId}-agent` as AlertSource,
    metadata: {
      taskType: params.taskType,
      confidence: params.confidence,
      reasoning: params.reasoning,
      actionRequired: params.confidence < 0.7,
    },
  };
}

/**
 * Generate an alert for a failed agent run.
 */
export function agentFailureAlert(params: {
  entityId: string;
  userId: string;
  agentId: string;
  taskType: string;
  error: string;
  durationMs: number;
}): AgentAlert {
  return {
    entityId: params.entityId,
    userId: params.userId,
    title: `Agent failed: ${params.taskType.replace(/_/g, " ")}`,
    message: `${params.agentId} failed on "${params.taskType.replace(/_/g, " ")}" after ${(params.durationMs / 1000).toFixed(1)}s. Error: ${params.error}`,
    severity: "critical",
    source: `${params.agentId}-agent` as AlertSource,
    metadata: {
      taskType: params.taskType,
      error: params.error,
      durationMs: params.durationMs,
      actionRequired: true,
    },
  };
}

/**
 * Generate an alert for an anomaly detected by an agent.
 */
export function anomalyAlert(params: {
  entityId: string;
  userId: string;
  agentId: string;
  anomalyType: string;
  description: string;
  severity?: AlertSeverity;
  amount?: string;
  currency?: string;
}): AgentAlert {
  return {
    entityId: params.entityId,
    userId: params.userId,
    title: `Anomaly detected: ${params.anomalyType}`,
    message: params.description,
    severity: params.severity ?? "warning",
    source: `${params.agentId}-agent` as AlertSource,
    metadata: {
      anomalyType: params.anomalyType,
      amount: params.amount,
      currency: params.currency,
      actionRequired: true,
    },
  };
}

/**
 * Generate an alert for a deadline approaching.
 */
export function deadlineAlert(params: {
  entityId: string;
  userId: string;
  agentId: string;
  deadlineType: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
}): AgentAlert {
  const severity: AlertSeverity =
    params.daysRemaining <= 3 ? "critical" : "warning";

  return {
    entityId: params.entityId,
    userId: params.userId,
    title: `Deadline approaching: ${params.deadlineType}`,
    message: `${params.description}. Due: ${params.dueDate} (${params.daysRemaining} day${params.daysRemaining === 1 ? "" : "s"} remaining)`,
    severity,
    source: `${params.agentId}-agent` as AlertSource,
    metadata: {
      deadlineType: params.deadlineType,
      dueDate: params.dueDate,
      daysRemaining: params.daysRemaining,
      actionRequired: params.daysRemaining <= 7,
    },
  };
}

// ─── Emit Alert ───────────────────────────────────────────────────────────

/**
 * Persist an agent alert as a notification and broadcast via SSE.
 * Fire-and-forget: failures are logged but never propagate.
 */
export async function emitAgentAlert(alert: AgentAlert): Promise<void> {
  try {
    // Map severity to notification priority
    const priorityMap: Record<AlertSeverity, string> = {
      critical: "critical",
      warning: "high",
      info: "medium",
      success: "low",
    };

    // Map severity to notification type
    const typeMap: Record<AlertSeverity, string> = {
      critical: "agent_escalation",
      warning: "agent_flag",
      info: "system_alert",
      success: "system_alert",
    };

    const [created] = await db
      .insert(notifications)
      .values({
        userId: alert.userId,
        entityId: alert.entityId,
        type: typeMap[alert.severity],
        priority: priorityMap[alert.severity],
        title: alert.title,
        body: alert.message,
        read: false,
        status: "pending",
        data: JSON.stringify({
          source: alert.source,
          ...alert.metadata,
        }),
      })
      .returning();

    if (created) {
      // SSE real-time delivery is handled by the existing agent-events
      // route which polls for new notifications every 3 seconds.
      logger.info(
        {
          notificationId: created.id,
          entityId: alert.entityId,
          severity: alert.severity,
          source: alert.source,
        },
        "Agent alert emitted",
      );
    }
  } catch (err) {
    // Alert emission must never fail the agent run
    logger.error({ err, alert }, "Failed to emit agent alert");
  }
}
