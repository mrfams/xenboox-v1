"use client";

import { AIPreferencesSummary } from "@/components/settings/ai-preferences-summary";
import { AIUsageStats } from "@/components/settings/ai-usage-stats";

export function AIDataSection() {
  return (
    <div className="space-y-6">
      <AIPreferencesSummary />
      <AIUsageStats />
    </div>
  );
}
