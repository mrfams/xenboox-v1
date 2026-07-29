"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RevenueSummary } from "@/components/revenue/revenue-summary";
import { RevenueAIInsights } from "@/components/revenue/revenue-ai-insights";
import { RevenueCollectionsForecast } from "@/components/revenue/revenue-collections-forecast";
import { RevenueCustomerHealth } from "@/components/revenue/revenue-customer-health";
import { RevenueInvoicePipeline } from "@/components/revenue/revenue-invoice-pipeline";
import { RevenueCollectionQueue } from "@/components/revenue/revenue-collection-queue";
import { RevenueSmartInvoiceList } from "@/components/revenue/revenue-smart-invoice-list";
import { RevenueCustomerTimeline } from "@/components/revenue/revenue-customer-timeline";
import { RevenueAIPanel } from "@/components/revenue/revenue-ai-panel";
import { RevenueQuickActions } from "@/components/revenue/revenue-quick-actions";
import { X, PanelRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RevenueWorkspace() {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-6 space-y-8 pb-24">
          {/* Hero: Revenue Summary */}
          <RevenueSummary />

          {/* Two-column widgets */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Row: Customer Health + Pipeline */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <RevenueCustomerHealth />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <RevenueInvoicePipeline />
                </div>
              </div>

              {/* Row: Collections Forecast + Insights */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <RevenueCollectionsForecast />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <RevenueAIInsights />
                </div>
              </div>

              {/* AI Collection Queue */}
              <div className="rounded-xl border bg-card p-4">
                <RevenueCollectionQueue />
              </div>
            </div>

            <div className="space-y-6">
              {/* Customer Timeline */}
              <div className="rounded-xl border bg-card p-4">
                <RevenueCustomerTimeline />
              </div>

              {/* AI Panel (collapsed) */}
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

          {/* Smart Invoice List */}
          <div className="rounded-xl border bg-card p-4">
            <RevenueSmartInvoiceList />
          </div>
        </div>
      </div>

      {/* ─── Right AI Panel ────────────────────────────────────────── */}
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
            <RevenueAIPanel
              onAction={(action) =>
                router.push(
                  `/dashboard/chat?initial=${encodeURIComponent(action)}`,
                )
              }
            />
          </div>
        </div>
      )}

      {/* ─── Floating Quick Actions ────────────────────────────────── */}
      <RevenueQuickActions />
    </div>
  );
}
