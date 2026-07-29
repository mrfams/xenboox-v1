"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProcurementSummary } from "@/components/procurement/procurement-summary";
import { ProcurementAIInsights } from "@/components/procurement/procurement-ai-insights";
import { ProcurementCashImpact } from "@/components/procurement/procurement-cash-impact";
import { ProcurementSupplierHealth } from "@/components/procurement/procurement-supplier-health";
import { ProcurementPOPipeline } from "@/components/procurement/procurement-po-pipeline";
import { ProcurementPaymentRecommendations } from "@/components/procurement/procurement-payment-recommendations";
import { ProcurementBillsQueue } from "@/components/procurement/procurement-bills-queue";
import { ProcurementSupplierTimeline } from "@/components/procurement/procurement-supplier-timeline";
import { ProcurementAIPanel } from "@/components/procurement/procurement-ai-panel";
import { ProcurementQuickActions } from "@/components/procurement/procurement-quick-actions";
import { X, PanelRight } from "lucide-react";

export default function ProcurementWorkspace() {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-6 space-y-8 pb-24">
          <ProcurementSummary />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <ProcurementCashImpact />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <ProcurementAIInsights />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <ProcurementSupplierHealth />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <ProcurementPOPipeline />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <ProcurementPaymentRecommendations />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <ProcurementSupplierTimeline />
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

          <div className="rounded-xl border bg-card p-4">
            <ProcurementBillsQueue />
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
            <ProcurementAIPanel
              onAction={(action) =>
                router.push(
                  `/dashboard/chat?initial=${encodeURIComponent(action)}`,
                )
              }
            />
          </div>
        </div>
      )}

      <ProcurementQuickActions />
    </div>
  );
}
