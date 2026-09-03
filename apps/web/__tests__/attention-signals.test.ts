import { describe, it, expect } from "vitest";

import {
  computeAttentionSignals,
  NOTIFICATION_DESTINATIONS,
} from "@/lib/hooks/use-attention-signals";

// All 17 notification types from packages/db/schema/notifications.ts. Every
// one MUST route somewhere — a type added to the schema without a sidebar
// destination would otherwise be silently dropped from the attention map.
const ALL_NOTIFICATION_TYPES = [
  "close_complete",
  "close_failed",
  "overdue_invoice",
  "invoice_reminder",
  "budget_alert",
  "budget_exceeded",
  "agent_escalation",
  "agent_flag",
  "system_alert",
  "recon_discrepancy",
  "payroll_processed",
  "report_ready",
  "ingestion_review",
  "ingestion_rejected",
  "ingestion_posted",
  "ingestion_failed",
  "ingestion_escalated",
] as const;

const EMPTY = {
  unreadNotifications: [],
  pendingReview: 0,
  agentApprovals: 0,
  failed: 0,
};

describe("computeAttentionSignals", () => {
  it("reports a quiet zero state when nothing needs attention", () => {
    const { byKey, totals } = computeAttentionSignals(EMPTY);
    expect(Object.values(byKey).every((s) => s.count === 0)).toBe(true);
    expect(totals).toEqual({ action: 0, new: 0 });
  });

  it("routes pending ingestion reviews to Inbox as action work", () => {
    const { byKey, totals } = computeAttentionSignals({
      ...EMPTY,
      pendingReview: 3,
    });
    expect(byKey["activity-hub"]).toEqual({ tone: "action", count: 3 });
    expect(totals).toEqual({ action: 3, new: 0 });
  });

  it("sums pending reviews, agent approvals, and failed docs into the Inbox action count", () => {
    const { byKey, totals } = computeAttentionSignals({
      ...EMPTY,
      pendingReview: 1,
      agentApprovals: 2,
      failed: 4,
    });
    expect(byKey["activity-hub"]).toEqual({ tone: "action", count: 7 });
    expect(totals.action).toBe(7);
  });

  it("keeps Inbox authoritative even when notification rows were dismissed", () => {
    // Dismissing a notification must not clear the signal for work that is
    // still sitting in the review queue.
    const { byKey } = computeAttentionSignals({
      ...EMPTY,
      pendingReview: 5,
      unreadNotifications: [],
    });
    expect(byKey["activity-hub"]).toEqual({ tone: "action", count: 5 });
  });

  it("maps report_ready to Reports as a new-result signal", () => {
    const { byKey, totals } = computeAttentionSignals({
      ...EMPTY,
      unreadNotifications: [{ type: "report_ready" }],
    });
    expect(byKey["financial-pulse"]).toEqual({ tone: "new", count: 1 });
    expect(totals).toEqual({ action: 0, new: 1 });
  });

  it("maps close_failed to Close Center as an action signal", () => {
    const { byKey } = computeAttentionSignals({
      ...EMPTY,
      unreadNotifications: [{ type: "close_failed" }],
    });
    expect(byKey.operations).toEqual({ tone: "action", count: 1 });
  });

  it("maps overdue_invoice to Invoicing as an action signal", () => {
    const { byKey } = computeAttentionSignals({
      ...EMPTY,
      unreadNotifications: [{ type: "overdue_invoice" }],
    });
    expect(byKey.operations).toEqual({ tone: "action", count: 1 });
  });

  it("maps every schema notification type to a destination", () => {
    for (const type of ALL_NOTIFICATION_TYPES) {
      expect(NOTIFICATION_DESTINATIONS[type], type).toBeDefined();
    }
  });

  it("falls back to Inbox (informational) for unknown future types", () => {
    const { byKey } = computeAttentionSignals({
      ...EMPTY,
      unreadNotifications: [{ type: "some_future_type" }],
    });
    expect(byKey["activity-hub"]).toEqual({ tone: "new", count: 1 });
  });

  it("action beats new when a destination receives both", () => {
    const { byKey } = computeAttentionSignals({
      ...EMPTY,
      unreadNotifications: [
        { type: "ingestion_posted" }, // inbox, new
        { type: "ingestion_review" }, // inbox, action
      ],
    });
    expect(byKey["activity-hub"].tone).toBe("action");
    expect(byKey["activity-hub"].count).toBe(2);
  });

  it("counts unread notifications on top of the Inbox workload", () => {
    const { byKey } = computeAttentionSignals({
      pendingReview: 2,
      agentApprovals: 0,
      failed: 0,
      unreadNotifications: [
        { type: "ingestion_review" }, // +1 inbox action
        { type: "ingestion_posted" }, // +1 inbox new (masked by action)
      ],
    });
    expect(byKey["activity-hub"]).toEqual({ tone: "action", count: 4 });
  });

  it("aggregates action and new totals across destinations", () => {
    const { totals } = computeAttentionSignals({
      unreadNotifications: [
        { type: "report_ready" }, // new
        { type: "overdue_invoice" }, // action
        { type: "payroll_processed" }, // new
        { type: "close_failed" }, // action
      ],
      pendingReview: 2,
      agentApprovals: 0,
      failed: 0,
    });
    // overdue_invoice + close_failed + pendingReview = 4 action, PLUS
    // payroll_processed (new) is masked to action because it shares the
    // operations destination with overdue_invoice — "action beats new"
    // wins within a destination. report_ready (financial-pulse) stays new.
    expect(totals).toEqual({ action: 5, new: 1 });
  });
});
