"use client";

import { useState } from "react";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { AiOnboarding } from "@/components/onboarding/ai-onboarding";

/**
 * First-run onboarding modal — renders the AI onboarding agent.
 *
 * Visibility is fully server-driven via useOnboarding
 * (user_settings.settings.onboarding). No localStorage is consulted:
 * state must be identical on every device.
 */
export function OnboardingWizard() {
  const { isFirstTime, isLoaded } = useOnboarding();
  const [showWizard, setShowWizard] = useState(false);

  // Auto-show wizard ONLY after server confirms first-time status
  if (!showWizard && isFirstTime && isLoaded) {
    setShowWizard(true);
  }

  if (!showWizard || !isFirstTime || !isLoaded) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <div className="flex h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border/50 bg-background shadow-2xl mx-4 overflow-hidden">
        <AiOnboarding />
      </div>
    </div>
  );
}
