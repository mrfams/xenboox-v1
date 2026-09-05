"use client";

// ─── Desktop Notification System ───────────────────────────────────────────
//
// Browser notifications for urgent items: approvals, deadlines, anomalies.
// Uses the Notification API with fallback to in-app toasts.

export type NotificationType =
  | "approval_needed"
  | "deadline_approaching"
  | "anomaly_detected"
  | "ai_insight"
  | "batch_complete"
  | "reconciliation_needed";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  data?: Record<string, unknown>;
  actionUrl?: string;
};

const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { sound: boolean; persistent: boolean }
> = {
  low: { sound: false, persistent: false },
  medium: { sound: false, persistent: false },
  high: { sound: true, persistent: true },
  urgent: { sound: true, persistent: true },
};

/**
 * Request notification permission from the browser.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return "denied";
}

/**
 * Get current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Send a browser notification.
 * Falls back to console.log if notifications are not supported.
 */
export function sendNotification(payload: NotificationPayload): void {
  const permission = getNotificationPermission();

  if (permission === "granted") {
    const config = PRIORITY_CONFIG[payload.priority];

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `${payload.type}-${Date.now()}`,
        requireInteraction: config.persistent,
        silent: !config.sound,
      });

      // Click handler — open the app
      notification.onclick = () => {
        window.focus();
        if (payload.actionUrl) {
          window.location.href = payload.actionUrl;
        }
        notification.close();
      };

      // Auto-close after 10 seconds (unless persistent)
      if (!config.persistent) {
        setTimeout(() => notification.close(), 10000);
      }
    } catch (error) {
      // Notification failed — log to console
      console.log("[Notification]", payload.title, payload.body);
    }
  } else {
    // Notifications not granted — use console fallback
    console.log("[Notification]", payload.title, payload.body);
  }
}

/**
 * Send an approval-needed notification.
 */
export function notifyApprovalNeeded(data: {
  type: string;
  recordType: string;
  amount?: string;
  reasoning?: string;
}): void {
  sendNotification({
    type: "approval_needed",
    title: "Approval Needed",
    body: `${data.type.replace(/_/g, " ")} for ${data.recordType}${data.amount ? ` (${data.amount})` : ""} needs your approval.`,
    priority: "high",
    data,
    actionUrl: "/dashboard/tasks",
  });
}

/**
 * Send a deadline approaching notification.
 */
export function notifyDeadlineApproaching(data: {
  label: string;
  deadline: string;
  daysLeft: number;
}): void {
  sendNotification({
    type: "deadline_approaching",
    title: "Deadline Approaching",
    body: `${data.label} is due in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""} (${data.deadline}).`,
    priority: data.daysLeft <= 2 ? "urgent" : "high",
    data,
    actionUrl: "/dashboard/operations",
  });
}

/**
 * Send an anomaly detected notification.
 */
export function notifyAnomalyDetected(data: {
  severity: string;
  message: string;
}): void {
  sendNotification({
    type: "anomaly_detected",
    title: "Anomaly Detected",
    body: data.message,
    priority: data.severity === "critical" ? "urgent" : "high",
    data,
    actionUrl: "/dashboard/financial-pulse",
  });
}

/**
 * Send an AI insight notification.
 */
export function notifyAiInsight(data: { insight: string }): void {
  sendNotification({
    type: "ai_insight",
    title: "AI Insight",
    body: data.insight,
    priority: "medium",
    data,
    actionUrl: "/dashboard",
  });
}

/**
 * Send a batch processing complete notification.
 */
export function notifyBatchComplete(data: {
  processedCount: number;
  failedCount: number;
}): void {
  sendNotification({
    type: "batch_complete",
    title: "Batch Processing Complete",
    body: `${data.processedCount} documents processed${data.failedCount > 0 ? `, ${data.failedCount} failed` : ""}.`,
    priority: data.failedCount > 0 ? "high" : "medium",
    data,
    actionUrl: "/dashboard/ingestion",
  });
}

/**
 * Send a reconciliation needed notification.
 */
export function notifyReconciliationNeeded(data: {
  count: number;
  totalAmount: string;
}): void {
  sendNotification({
    type: "reconciliation_needed",
    title: "Reconciliation Needed",
    body: `${data.count} transactions need reconciliation (${data.totalAmount}).`,
    priority: "medium",
    data,
    actionUrl: "/dashboard/ledger",
  });
}
