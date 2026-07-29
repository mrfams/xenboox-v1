"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MoneyTreasurySummary } from "@/components/money/money-treasury-summary";
import { MoneyCashPosition } from "@/components/money/money-cash-position";
import { MoneyAIInsights } from "@/components/money/money-ai-insights";
import { MoneyUpcomingEvents } from "@/components/money/money-upcoming-events";
import { MoneyCashForecast } from "@/components/money/money-cash-forecast";
import { MoneyBankAccounts } from "@/components/money/money-bank-accounts";
import { MoneyReconciliationStatus } from "@/components/money/money-reconciliation-status";
import { MoneySuspiciousActivity } from "@/components/money/money-suspicious-activity";
import { MoneyTransactionFeed } from "@/components/money/money-transaction-feed";
import { MoneyQuickActions } from "@/components/money/money-quick-actions";
import { MoneyAIPanel } from "@/components/money/money-ai-panel";
import { X, PanelRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MoneyWorkspace() {
  const [showAIPanel, setShowAIPanel] = useState(true);
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-6 space-y-8 pb-24">
          {/* Hero: AI Treasury Summary */}
          <MoneyTreasurySummary />

          {/* Three-column widgets */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Row: Cash Position + Insights */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <MoneyCashPosition />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <MoneyAIInsights />
                </div>
              </div>

              {/* Row: Forecast + Events */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <MoneyCashForecast />
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <MoneyUpcomingEvents />
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="rounded-xl border bg-card p-4">
                <MoneyBankAccounts
                  onSelect={(id) => router.push(`/dashboard/treasury/${id}`)}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Reconciliation Status */}
              <div className="rounded-xl border bg-card p-4">
                <MoneyReconciliationStatus />
              </div>

              {/* Suspicious Activity */}
              <div className="rounded-xl border bg-card p-4">
                <MoneySuspiciousActivity />
              </div>

              {/* AI Panel */}
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

          {/* Recent Transactions */}
          <div className="rounded-xl border bg-card p-4">
            <MoneyTransactionFeed />
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
            <MoneyAIPanel
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
      <MoneyQuickActions />
    </div>
  );
}
