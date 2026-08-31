"use client";

import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  ACTIVATION_EVENTS,
  calculateActivationScore,
  getActivationStatus,
  getNextStep,
  type ActivationEvent,
} from "@xenboox/db/schema/analytics";

// ─── Track Activation Event ────────────────────────────────────────────────

export function useTrackActivation() {
  const utils = trpc.useUtils();

  const trackEvent = useCallback(
    async (
      event: ActivationEvent,
      metadata?: Record<string, unknown>,
    ) => {
      try {
        await utils.client.analytics.trackEvent.mutate({
          event,
          metadata: metadata ?? {},
        });
      } catch (error) {
        // Silently fail — activation tracking should never break the app
        console.error("Failed to track activation event:", error);
      }
    },
    [utils],
  );

  return { trackEvent };
}

// ─── Get Activation Status ─────────────────────────────────────────────────

export function useActivationStatus() {
  const { data: events } = trpc.analytics.getActivationEvents.useQuery();

  const completedEvents = useMemo(
    () => (events ?? []).map((e) => e.event),
    [events],
  );

  const score = useMemo(
    () => calculateActivationScore(completedEvents),
    [completedEvents],
  );

  const status = useMemo(() => getActivationStatus(score), [score]);

  const nextStep = useMemo(
    () => getNextStep(completedEvents),
    [completedEvents],
  );

  const progress = useMemo(() => {
    const total = Object.keys(ACTIVATION_EVENTS).length;
    const completed = completedEvents.length;
    return { total, completed, percentage: Math.round((completed / total) * 100) };
  }, [completedEvents]);

  return {
    score,
    status,
    nextStep,
    progress,
    completedEvents,
    isFullyActivated: score >= 1,
  };
}
