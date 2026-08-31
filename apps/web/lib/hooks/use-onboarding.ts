"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";

const ONBOARDING_KEY = "xenboox_onboarding_completed";
const ONBOARDING_STEP_KEY = "xenboox_onboarding_step";

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
 * Server-backed onboarding hook.
 * Reads from server on mount (cross-device), writes to both localStorage
 * (instant UI) and server (persistence). Falls back to localStorage when
 * server is unavailable (offline).
 */
export function useOnboarding() {
  const { data: session } = useSession();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isLoaded, setIsLoaded] = useState(false);

  // Server-side settings query (onboarding state)
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Server-side settings mutation
  const setSettings = trpc.settings.set.useMutation();

  useEffect(() => {
    if (isLoaded) return;

    // Try server first (cross-device persistence)
    if (getSettings.data) {
      const serverSettings = getSettings.data as Record<string, unknown>;
      const onboarding = serverSettings.onboarding as {
        completed?: boolean;
        currentStep?: string | null;
      } | undefined;

      if (onboarding?.completed) {
        setIsFirstTime(false);
        // Sync localStorage for offline fallback
        localStorage.setItem(ONBOARDING_KEY, "true");
        localStorage.removeItem(ONBOARDING_STEP_KEY);
      } else {
        setIsFirstTime(true);
        const step = (onboarding?.currentStep ?? localStorage.getItem(ONBOARDING_STEP_KEY)) as OnboardingStep | null;
        if (step && STEPS.includes(step)) {
          setCurrentStep(step);
        }
      }
      setIsLoaded(true);
      return;
    }

    // Fallback to localStorage while server loads
    if (getSettings.isLoading) {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (completed !== "true") {
        setIsFirstTime(true);
        const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY) as OnboardingStep | null;
        if (savedStep && STEPS.includes(savedStep)) {
          setCurrentStep(savedStep);
        }
      }
      // Don't set isLoaded yet — wait for server
      return;
    }

    // Server unavailable — use localStorage
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed !== "true") {
      setIsFirstTime(true);
      const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY) as OnboardingStep | null;
      if (savedStep && STEPS.includes(savedStep)) {
        setCurrentStep(savedStep);
      }
    }
    setIsLoaded(true);
  }, [getSettings.data, getSettings.isLoading, isLoaded]);

  // Save step to both localStorage (instant) and server (cross-device)
  const saveStep = useCallback(
    (step: OnboardingStep) => {
      setCurrentStep(step);
      localStorage.setItem(ONBOARDING_STEP_KEY, step);

      // Persist to server (non-blocking)
      if (session?.user?.id) {
        setSettings.mutate({
          onboarding: { completed: false, currentStep: step },
        });
      }
    },
    [session, setSettings],
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
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    setIsFirstTime(false);

    // Persist to server (non-blocking)
    if (session?.user?.id) {
      setSettings.mutate({
        onboarding: { completed: true, currentStep: null },
      });
    }
  }, [session, setSettings]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    setIsFirstTime(true);
    setCurrentStep("welcome");

    // Persist to server (non-blocking)
    if (session?.user?.id) {
      setSettings.mutate({
        onboarding: { completed: false, currentStep: "welcome" },
      });
    }
  }, [session, setSettings]);

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
