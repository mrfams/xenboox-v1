"use client";

import { useCallback, useMemo } from "react";
import { api } from "@/trpc/react";

/**
 * Server-side activation status hook.
 * Persists to database, not localStorage.
 * Uses tRPC for all mutations and queries.
 */
export function useActivationStatus() {
  const utils = api.useUtils();

  // Get activation status from server
  const { data: status, isLoading } = api.activation.getStatus.useQuery();

  // Track activation event
  const trackEvent = useCallback(
    async (event: string, metadata?: Record<string, unknown>) => {
      try {
        await utils.client.activation.trackEvent.mutate({
          event,
          metadata: metadata ?? {},
        });
        // Invalidate to refresh status
        await utils.activation.getStatus.invalidate();
      } catch (error) {
        // Silently fail — activation tracking should never break the app
        console.error("Failed to track activation event:", error);
      }
    },
    [utils],
  );

  // Get funnel metrics (admin only)
  const { data: funnelMetrics } = api.activation.getFunnelMetrics.useQuery();

  return {
    score: status?.score ?? 0,
    status: status?.status ?? { level: "new", label: "Not Started", color: "gray" },
    nextStep: status?.nextStep ?? null,
    progress: status?.progress ?? { total: 6, completed: 0, percentage: 0 },
    completedEvents: status?.completedEvents ?? [],
    isFullyActivated: status?.isFullyActivated ?? false,
    events: status?.events ?? [],
    isLoading,
    trackEvent,
    funnelMetrics,
  };
}

/**
 * Check if a specific activation step is complete.
 */
export function useActivationStep(event: string) {
  const { completedEvents, isLoading } = useActivationStatus();
  const isComplete = completedEvents.includes(event);
  return { isComplete, isLoading };
}
