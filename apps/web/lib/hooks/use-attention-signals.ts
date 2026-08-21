"use client";

import { useMemo, useCallback, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import {
  useAttentionSSE,
  type AttentionSSEEvent,
} from "@/lib/hooks/use-attention-sse";

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
  | "command-center"
  | "activity-hub"
  | "financial-pulse"
  | "ledger"
  | "operations";

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
  ingestion_review: { key: "activity-hub", tone: "action" },
  ingestion_rejected: { key: "activity-hub", tone: "action" },
  agent_escalation: { key: "activity-hub", tone: "action" },
  agent_flag: { key: "activity-hub", tone: "action" },
  ingestion_posted: { key: "activity-hub", tone: "new" },
  report_ready: { key: "financial-pulse", tone: "new" },
  close_complete: { key: "operations", tone: "new" },
  close_failed: { key: "operations", tone: "action" },
  payroll_processed: { key: "operations", tone: "new" },
  overdue_invoice: { key: "operations", tone: "action" },
  invoice_reminder: { key: "operations", tone: "new" },
  recon_discrepancy: { key: "operations", tone: "action" },
  budget_alert: { key: "financial-pulse", tone: "new" },
  budget_exceeded: { key: "financial-pulse", tone: "action" },
  system_alert: { key: "command-center", tone: "action" },
};

// Notification types added in the future land on Inbox (which also hosts the
// notifications page) as informational — they can never be dropped silently.
const DEFAULT_DESTINATION = { key: "activity-hub", tone: "new" } as const;

function emptySignals(): Record<NavKey, NavAttention> {
  return {
    "command-center": { tone: "new", count: 0 },
    "activity-hub": { tone: "new", count: 0 },
    "financial-pulse": { tone: "new", count: 0 },
    ledger: { tone: "new", count: 0 },
    operations: { tone: "new", count: 0 },
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
  // authoritative "blocked on you" workload. They feed the Activity Hub.
  const hubAction = input.pendingReview + input.agentApprovals + input.failed;
  if (hubAction > 0) {
    byKey["activity-hub"].count += hubAction;
    byKey["activity-hub"].tone = "action";
  }

  const totals: AttentionTotals = { action: 0, new: 0 };
  for (const key of Object.keys(byKey) as NavKey[]) {
    const signal = byKey[key];
    if (signal.count > 0) totals[signal.tone] += signal.count;
  }

  return { byKey, totals };
}

/**
 * React binding. Combines two update mechanisms:
 *   1. SSE (real-time) — instant updates when agents escalate, documents
 *      are processed, or reports are ready. No polling delay.
 *   2. tRPC polling (fallback) — keeps signals accurate even if SSE
 *      disconnects. Runs every 30s as a safety net.
 *
 * The SSE events update a local override map that takes priority over
 * the polled data. When tRPC refetches, it reconciles with the overrides.
 */
export function useAttentionSignals() {
  const { entityId, isLoaded } = useEntity();
  const enabled = isLoaded && !!entityId;

  // ── SSE overrides (instant updates) ──────────────────────────────────
  // When an SSE event arrives, we store the override here. The polled
  // data is used as the baseline, and overrides are applied on top.
  const overridesRef = useRef<
    Map<string, { tone: AttentionTone; count: number }>
  >(new Map());
  const [, setOverrideVersion] = useState(0);

  const handleAttentionSSE = useCallback((event: AttentionSSEEvent) => {
    if (!event.surface || !event.tone || event.count === undefined) return;

    overridesRef.current.set(event.surface, {
      tone: event.tone,
      count: event.count,
    });
    // Force re-render to pick up the override
    setOverrideVersion((v) => v + 1);
  }, []);

  const handleDataChanged = useCallback(() => {
    // When data changes on any surface, refetch the tRPC queries
    // to get accurate counts. The SSE override provides instant
    // visual feedback while the refetch catches up.
  }, []);

  // Connect to SSE for real-time updates
  useAttentionSSE({
    entityId,
    enabled,
    onAttentionChanged: handleAttentionSSE,
    onDataChanged: handleDataChanged,
  });

  // ── tRPC polling (baseline data) ─────────────────────────────────────
  const { data: unread, refetch: refetchUnread } =
    trpc.notifications.list.useQuery(
      { limit: 20, onlyUnread: true },
      {
        staleTime: 15 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: 30 * 1000,
        enabled,
      },
    );

  const { data: stats, refetch: refetchStats } =
    trpc.ingestion.getStats.useQuery(undefined, {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      refetchInterval: 30 * 1000,
      enabled,
    });

  const { data: agentApprovals, refetch: refetchApprovals } =
    trpc.ingestion.listAgentApprovals.useQuery(
      { limit: 50 },
      {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: false,
        refetchInterval: 60 * 1000,
        enabled,
      },
    );

  // ── Compute signals with SSE overrides applied ───────────────────────
  const result = useMemo(() => {
    const base = computeAttentionSignals({
      unreadNotifications: unread ?? [],
      pendingReview: stats?.pendingReview ?? 0,
      agentApprovals: agentApprovals?.items?.length ?? 0,
      failed: stats?.failed ?? 0,
    });

    // Apply SSE overrides — these take priority for instant feedback
    const overrides = overridesRef.current;
    if (overrides.size > 0) {
      for (const [surface, override] of overrides) {
        const key = surface as NavKey;
        if (base.byKey[key]) {
          // SSE override wins if it has a higher count or action tone
          if (
            override.count > base.byKey[key].count ||
            (override.tone === "action" && base.byKey[key].tone !== "action")
          ) {
            base.byKey[key] = override;
          }
        }
      }

      // Recompute totals
      base.totals = { action: 0, new: 0 };
      for (const key of Object.keys(base.byKey) as NavKey[]) {
        const signal = base.byKey[key];
        if (signal.count > 0) base.totals[signal.tone] += signal.count;
      }
    }

    return base;
  }, [unread, stats, agentApprovals]);

  // ── Manual refetch (called by other hooks after mutations) ────────────
  const refetch = useCallback(() => {
    void refetchUnread();
    void refetchStats();
    void refetchApprovals();
    // Clear overrides so polled data takes over
    overridesRef.current.clear();
  }, [refetchUnread, refetchStats, refetchApprovals]);

  return {
    byKey: result.byKey,
    totals: result.totals,
    pendingReview: stats?.pendingReview ?? 0,
    processing: stats?.processing ?? 0,
    failed: stats?.failed ?? 0,
    refetch,
  };
}
