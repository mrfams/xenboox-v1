"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationsSummary } from "@/components/operations/operations-summary";
import { OperationsAIInsights } from "@/components/operations/operations-ai-insights";
import { OperationsDepartmentPerformance } from "@/components/operations/operations-department-performance";
import { OperationsPayrollCenter } from "@/components/operations/operations-payroll-center";
import { OperationsExpenseIntelligence } from "@/components/operations/operations-expense-intelligence";
import { OperationsAssetHealth } from "@/components/operations/operations-asset-health";
import { OperationsInventoryMonitor } from "@/components/operations/operations-inventory-monitor";
import { OperationsCostOptimization } from "@/components/operations/operations-cost-optimization";
import { OperationsRecentActivity } from "@/components/operations/operations-recent-activity";
import { OperationsAIPanel } from "@/components/operations/operations-ai-panel";
import { OperationsQuickActions } from "@/components/operations/operations-quick-actions";
import { X, PanelRight } from "lucide-react";

export default function OperationsWorkspace() {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-6 space-y-8 pb-24">
          <OperationsSummary />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <OperationsPayrollCenter />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <OperationsDepartmentPerformance />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <OperationsExpenseIntelligence />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <OperationsAIInsights />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <OperationsAssetHealth />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <OperationsInventoryMonitor />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <OperationsCostOptimization />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <OperationsRecentActivity />
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
              AI Assistant
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
            <OperationsAIPanel
              onAction={(action) =>
                router.push(
                  `/dashboard/chat?initial=${encodeURIComponent(action)}`,
                )
              }
            />
          </div>
        </div>
      )}

      <OperationsQuickActions />
    </div>
  );
}
