"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";

export type OnboardingStep =
  | "welcome"
  | "chart-of-accounts"
  | "bank-connection"
  | "aha-moment"
  | "team"
  | "ai-preferences"
  | "complete";

const STEPS: OnboardingStep[] = [
  "welcome",
  "chart-of-accounts",
  "bank-connection",
  "aha-moment",
  "team",
  "ai-preferences",
  "complete",
];

/**
 * Server-side onboarding state.
 * Persists to database, not localStorage.
 * Shared across all onboarding surfaces (wizard, checklist, tour).
 */
export function useOnboardingV2() {
  const utils = trpc.useUtils();

  // Get onboarding status from server
  const { data: status, isLoading } = trpc.activation.getStatus.useQuery();

  // Derive onboarding state from activation events
  const isFirstTime = !status?.isFullyActivated && (status?.progress.completed ?? 0) < 3;

  // Current step based on completed events
  const getCurrentStep = (): OnboardingStep => {
    if (!status) return "welcome";

    const completed = status.completedEvents;

    if (completed.includes("setup_business") && completed.includes("import_bank") && completed.includes("create_invoice")) {
      return "complete";
    }
    if (completed.includes("create_invoice")) {
      return "ai-preferences";
    }
    if (completed.includes("import_bank")) {
      return "team";
    }
    if (completed.includes("setup_business")) {
      return "aha-moment";
    }
    if (completed.includes("see_narrative")) {
      return "bank-connection";
    }
    return "welcome";
  };

  const currentStep = getCurrentStep();
  const stepIndex = STEPS.indexOf(currentStep);

  const nextStep = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      // Track step completion server-side
      const step = STEPS[idx];
      if (step === "welcome") {
        utils.client.activation.trackEvent.mutate({ event: "setup_business" });
      }
    }
  }, [currentStep, utils]);

  const prevStep = useCallback(() => {
    // Navigation back is visual only — state is derived from events
  }, []);

  const completeOnboarding = useCallback(async () => {
    // Mark all remaining steps as complete (parallel for speed)
    await Promise.all([
      utils.client.activation.trackEvent.mutateAsync({ event: "setup_business" }),
      utils.client.activation.trackEvent.mutateAsync({ event: "import_bank" }),
      utils.client.activation.trackEvent.mutateAsync({ event: "create_invoice" }),
    ]);
  }, [utils]);

  const resetOnboarding = useCallback(() => {
    // No-op — server-side state can't be reset from client
    console.warn("Onboarding reset not supported in server-side mode");
  }, []);

  return {
    isFirstTime,
    currentStep,
    stepIndex,
    totalSteps: STEPS.length - 1, // Exclude "complete"
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding,
    isLoading,
    isFullyActivated: status?.isFullyActivated ?? false,
  };
}
