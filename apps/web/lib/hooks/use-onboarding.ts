"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
 * Server-authoritative onboarding hook.
 *
 * The gate, current step, completion and reset ALL live in the database
 * (`user_settings.settings.onboarding` via tRPC `settings.get`/`settings.set`).
 * Nothing is persisted in the browser: onboarding state must be identical on
 * every device and browser.
 *
 * Failure policy: if the server cannot be reached, we never show the wizard
 * (fail-safe). Gating a returning user's dashboard behind a modal we could
 * not confirm is worse than a missed first-run wizard; the next load retries.
 */
export function useOnboarding() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isLoaded, setIsLoaded] = useState(false);

  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const setSettings = trpc.settings.set.useMutation();

  useEffect(() => {
    if (isLoaded) return;

    // Wait for auth + the server response — never flash the wizard.
    if (!session?.user?.id) return;
    if (getSettings.isLoading) return;

    if (getSettings.data) {
      const onboarding = (
        getSettings.data as { settings?: Record<string, unknown> }
      ).settings?.onboarding as
        { completed?: boolean; currentStep?: string | null } | undefined;

      if (onboarding?.completed) {
        setIsFirstTime(false);
      } else {
        // Server is the single source of truth: an explicit in-progress
        // flag OR no flag at all (brand-new account) → first-time.
        setIsFirstTime(true);
        const step = onboarding?.currentStep as
          OnboardingStep | null | undefined;
        if (step && STEPS.includes(step)) {
          setCurrentStep(step);
        }
      }
      setIsLoaded(true);
      return;
    }

    // Query settled without data (network/server error): fail safe — do not
    // gate the dashboard. The next load retries.
    setIsFirstTime(false);
    setIsLoaded(true);
  }, [getSettings.data, getSettings.isLoading, session?.user?.id, isLoaded]);

  /**
   * Persist an onboarding patch to the server (durable, cross-device) and
   * update the tRPC cache with the confirmed result so every consumer
   * reflects it immediately. On failure, invalidate so the next read shows
   * server truth instead of a stale cache.
   */
  const persistOnboarding = useCallback(
    (onboarding: { completed: boolean; currentStep: string | null }) => {
      if (!session?.user?.id) return;
      setSettings.mutate(
        { settings: { onboarding } },
        {
          onSuccess: (data) => {
            utils.settings.get.setData(undefined, data);
          },
          onError: () => {
            void utils.settings.get.invalidate();
          },
        },
      );
    },
    [session?.user?.id, setSettings, utils],
  );

  // Save step to the server (cross-device persistence)
  const saveStep = useCallback(
    (step: OnboardingStep) => {
      setCurrentStep(step);
      persistOnboarding({ completed: false, currentStep: step });
    },
    [persistOnboarding],
  );

  const nextStep = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      saveStep(STEPS[idx + 1]);
    }
  }, [currentStep, saveStep]);

  const prevStep = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      saveStep(STEPS[idx - 1]);
    }
  }, [currentStep, saveStep]);

  const completeOnboarding = useCallback(() => {
    setIsFirstTime(false);
    persistOnboarding({ completed: true, currentStep: null });
  }, [persistOnboarding]);

  const resetOnboarding = useCallback(() => {
    setIsFirstTime(true);
    setCurrentStep("welcome");
    persistOnboarding({ completed: false, currentStep: "welcome" });
  }, [persistOnboarding]);

  const stepIndex = STEPS.indexOf(currentStep);

  return {
    isFirstTime,
    currentStep,
    stepIndex,
    totalSteps: STEPS.length - 1, // exclude "complete"
    isLoaded,
    nextStep,
    prevStep,
    saveStep,
    completeOnboarding,
    resetOnboarding,
  };
}
