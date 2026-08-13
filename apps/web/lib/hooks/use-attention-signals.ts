"use client";

import { useMemo } from "react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

// ─── Attention-signal model ────────────────────────────────────────────────
//
// The sidebar tells a user where something needs them using a two-tone
// system:
//   - "action" — the agent is blocked on you (approval needed, pending
//     review, failed work). Rendered destructive red, pulsing.
//   - "new"    — work finished but not yet viewed (report ready, posted).
//     Rendered primary indigo, static.

export type AttentionTone = "action" | "new";

export type NavKey =
  | "inbox"
  | "reports"
  | "close"
  | "payroll"
  | "invoicing"
  | "reconciliation"
  | "dashboard";

export interface NavAttention {
  tone: AttentionTone;
  count: number;
}

export interface AttentionTotals {
  action: number;
  new: number;
}

// Notification type → the sidebar destination it should light up, and whether
// it means "blocked on you" (action) or "fresh results" (new). One line per
// notification type — adding a type to packages/db/schema/notifications.ts
// requires a matching entry here (guarded by a test).
export const NOTIFICATION_DESTINATIONS: Record<
  string,
  { key: NavKey; tone: AttentionTone }
> = {
  ingestion_review: { key: "inbox", tone: "action" },
  ingestion_rejected: { key: "inbox", tone: "action" },
  agent_escalation: { key: "inbox", tone: "action" },
  agent_flag: { key: "inbox", tone: "action" },
  ingestion_posted: { key: "inbox", tone: "new" },
  report_ready: { key: "reports", tone: "new" },
  close_complete: { key: "close", tone: "new" },
  close_failed: { key: "close", tone: "action" },
  payroll_processed: { key: "payroll", tone: "new" },
  overdue_invoice: { key: "invoicing", tone: "action" },
  invoice_reminder: { key: "invoicing", tone: "new" },
  recon_discrepancy: { key: "reconciliation", tone: "action" },
  budget_alert: { key: "dashboard", tone: "new" },
  budget_exceeded: { key: "dashboard", tone: "action" },
  system_alert: { key: "dashboard", tone: "action" },
};

// Notification types added in the future land on Inbox (which also hosts the
// notifications page) as informational — they can never be dropped silently.
const DEFAULT_DESTINATION = { key: "inbox", tone: "new" } as const;

function emptySignals(): Record<NavKey, NavAttention> {
  // Baseline tone is always "new". "action" is only ever set when a real
  // action signal arrives — a destination that receives ONLY fresh-result
  // notifications must never render as "blocked on you".
  return {
    inbox: { tone: "new", count: 0 },
    reports: { tone: "new", count: 0 },
    close: { tone: "new", count: 0 },
    payroll: { tone: "new", count: 0 },
    invoicing: { tone: "new", count: 0 },
    reconciliation: { tone: "new", count: 0 },
    dashboard: { tone: "new", count: 0 },
  };
}

export interface AttentionSignalInput {
  unreadNotifications: Array<{ type: string }>;
  pendingReview: number;
  agentApprovals: number;
  failed: number;
}

export interface AttentionSignalResult {
  byKey: Record<NavKey, NavAttention>;
  totals: AttentionTotals;
}

/**
 * Pure aggregation of every "something needs you" signal into per-destination
 * nav indicators. Kept free of React/TRPC so it is trivially unit-testable.
 */
export function computeAttentionSignals(
  input: AttentionSignalInput,
): AttentionSignalResult {
  const byKey = emptySignals();

  for (const notification of input.unreadNotifications) {
    const dest =
      NOTIFICATION_DESTINATIONS[notification.type] ?? DEFAULT_DESTINATION;
    const signal = byKey[dest.key];
    signal.count += 1;
    // Action beats new within a destination: an agent waiting on you is the
    // signal that must win over "fresh results" on the same page.
    if (dest.tone === "action") signal.tone = "action";
  }

  // Ingestion review queue + agent escalations + failed documents are the
  // authoritative "blocked on you" workload. They feed Inbox regardless of
  // notification rows, which can be dismissed without resolving the work.
  // An action notification sets the tone; the workload re-asserts it.
  const inboxAction = input.pendingReview + input.agentApprovals + input.failed;
  if (inboxAction > 0) {
    byKey.inbox.count += inboxAction;
    byKey.inbox.tone = "action";
  }

  const totals: AttentionTotals = { action: 0, new: 0 };
  for (const key of Object.keys(byKey) as NavKey[]) {
    const signal = byKey[key];
    if (signal.count > 0) totals[signal.tone] += signal.count;
  }

  return { byKey, totals };
}

/**
 * React binding. The notifications list/count queries use the SAME cache keys
 * top-nav reads (and use-unread-notifications writes into on SSE events), so
 * sidebar dots update in real time without opening a second EventSource
 * connection. Ingestion stats/approvals add the authoritative action counts.
 */
export function useAttentionSignals() {
  const { entityId, isLoaded } = useEntity();
  const enabled = isLoaded && !!entityId;

  const { data: unread } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: true },
    {
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: 30 * 1000,
      enabled,
    },
  );

  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: 30 * 1000,
    enabled,
  });

  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      refetchInterval: 60 * 1000,
      enabled,
    },
  );

  const result = useMemo(
    () =>
      computeAttentionSignals({
        unreadNotifications: unread ?? [],
        pendingReview: stats?.pendingReview ?? 0,
        agentApprovals: agentApprovals?.items?.length ?? 0,
        failed: stats?.failed ?? 0,
      }),
    [unread, stats, agentApprovals],
  );

  return {
    byKey: result.byKey,
    totals: result.totals,
    pendingReview: stats?.pendingReview ?? 0,
    processing: stats?.processing ?? 0,
    failed: stats?.failed ?? 0,
  };
}
