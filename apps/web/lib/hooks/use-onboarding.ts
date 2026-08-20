"use client";

import { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "xenboox_onboarding_completed";
const ONBOARDING_STEP_KEY = "xenboox_onboarding_step";

export type OnboardingStep =
  | "welcome"
  | "chart-of-accounts"
  | "bank-connection"
  | "team"
  | "ai-preferences"
  | "complete";

const STEPS: OnboardingStep[] = [
  "welcome",
  "chart-of-accounts",
  "bank-connection",
  "team",
  "ai-preferences",
  "complete",
];

export function useOnboarding() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed !== "true") {
      setIsFirstTime(true);
      const savedStep = localStorage.getItem(
        ONBOARDING_STEP_KEY,
      ) as OnboardingStep | null;
      if (savedStep && STEPS.includes(savedStep)) {
        setCurrentStep(savedStep);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
    localStorage.setItem(ONBOARDING_STEP_KEY, step);
  }, []);

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
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    setIsFirstTime(true);
    setCurrentStep("welcome");
  }, []);

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
