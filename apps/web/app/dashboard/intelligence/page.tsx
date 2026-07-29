"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntelligenceSummary } from "@/components/intelligence/intelligence-summary";
import { IntelligenceFinancialBriefing } from "@/components/intelligence/intelligence-financial-briefing";
import { IntelligencePerformanceOverview } from "@/components/intelligence/intelligence-performance-overview";
import { IntelligenceVarianceAnalysis } from "@/components/intelligence/intelligence-variance-analysis";
import { IntelligenceFinancialStatements } from "@/components/intelligence/intelligence-financial-statements";
import { IntelligenceForecastCenter } from "@/components/intelligence/intelligence-forecast-center";
import { IntelligenceScenarioSimulator } from "@/components/intelligence/intelligence-scenario-simulator";
import { IntelligenceBenchmarking } from "@/components/intelligence/intelligence-benchmarking";
import { IntelligenceOpportunityFeed } from "@/components/intelligence/intelligence-opportunity-feed";
import { IntelligenceReportGenerator } from "@/components/intelligence/intelligence-report-generator";
import { IntelligenceAIPanel } from "@/components/intelligence/intelligence-ai-panel";
import { IntelligenceQuickActions } from "@/components/intelligence/intelligence-quick-actions";
import { X, PanelRight } from "lucide-react";

export default function IntelligenceWorkspace() {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-6 space-y-8 pb-24">
          <IntelligenceSummary />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <IntelligenceFinancialBriefing />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <IntelligencePerformanceOverview />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <IntelligenceVarianceAnalysis />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <IntelligenceFinancialStatements />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <IntelligenceForecastCenter />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <IntelligenceScenarioSimulator />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <IntelligenceBenchmarking />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <IntelligenceOpportunityFeed />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <IntelligenceReportGenerator />
              </div>

              {!showAIPanel && (
                <button
                  type="button"
                  onClick={() => setShowAIPanel(true)}
                  className="hidden lg:flex fixed right-4 top-1/2 z-10 h-8 w-5 items-center justify-center rounded-l-md border bg-card text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all shadow-sm"
                  title="Show AI panel"
                >
                  <PanelRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAIPanel && (
        <div className="hidden lg:flex lg:w-72 shrink-0 flex-col border-l bg-card/30 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              AI Analyst
            </span>
            <button
              type="button"
              onClick={() => setShowAIPanel(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <IntelligenceAIPanel
              onAction={(action) =>
                router.push(
                  `/dashboard/chat?initial=${encodeURIComponent(action)}`,
                )
              }
            />
          </div>
        </div>
      )}

      <IntelligenceQuickActions />
    </div>
  );
}
