"use client";

import { useState, useMemo, useEffect } from "react";
import { useEntity } from "@/lib/entity-context";
import { Skeleton } from "@/components/shared/loading";
import { toast } from "sonner";
import {
  GuidedTour,
  DEFAULT_TOUR_STEPS,
} from "@/components/dashboard/guided-tour";
import { AIGreeting } from "@/components/dashboard/ai-greeting";
import { AIChatInput } from "@/components/dashboard/ai-chat-input";
import {
  FinancialHealthCard,
  createDefaultMetrics,
} from "@/components/dashboard/financial-health-card";
import {
  AIInsightsFeed,
  createDefaultInsights,
} from "@/components/dashboard/ai-insights-feed";
import { AgentActivityFeed } from "@/components/dashboard/agent-activity-feed";
import {
  ActiveWorkflows,
  createDefaultWorkflows,
} from "@/components/dashboard/active-workflows";
import {
  UpcomingEvents,
  createDefaultEvents,
} from "@/components/dashboard/upcoming-events";
import { QuickAIActions } from "@/components/dashboard/quick-ai-actions";
import { trpc } from "@/lib/trpc/client";
import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { entityId } = useEntity();
  const [showTour, setShowTour] = useState(false);

  // Fetch real data for metrics
  const {
    data: arInvoices,
    isLoading: arLoading,
    error: arError,
  } = trpc.ar.listInvoices.useQuery({}, { enabled: !!entityId });
  const {
    data: apInvoices,
    isLoading: apLoading,
    error: apError,
  } = trpc.ap.listInvoices.useQuery(undefined, { enabled: !!entityId });
  const {
    data: bankAccounts,
    isLoading: bankLoading,
    error: bankError,
  } = trpc.treasury.listBankAccounts.useQuery(undefined, {
    enabled: !!entityId,
  });
  const {
    data: cashAccounts,
    isLoading: cashLoading,
    error: cashError,
  } = trpc.cash.listCashAccounts.useQuery(undefined, { enabled: !!entityId });

  const isLoading = arLoading || apLoading || bankLoading || cashLoading;

  // Error feedback
  useEffect(() => {
    if (arError) toast.error("Failed to load receivables");
  }, [arError]);
  useEffect(() => {
    if (apError) toast.error("Failed to load payables");
  }, [apError]);
  useEffect(() => {
    if (bankError) toast.error("Failed to load bank accounts");
  }, [bankError]);
  useEffect(() => {
    if (cashError) toast.error("Failed to load cash accounts");
  }, [cashError]);

  // Compute metrics from real data
  const metrics = useMemo(() => {
    if (isLoading || !entityId) return null;

    const bankBalance = (bankAccounts ?? [])
      .filter((b: any) => b.isActive)
      .reduce(
        (s: number, b: any) => s + parseFloat(b.currentBalance || "0"),
        0,
      );
    const cashBalance = (cashAccounts ?? [])
      .filter((c: any) => c.isActive)
      .reduce(
        (s: number, c: any) => s + parseFloat(c.currentBalance || "0"),
        0,
      );
    const revenue = (arInvoices ?? [])
      .filter((inv: any) => inv.status === "paid")
      .reduce(
        (s: number, inv: any) => s + parseFloat(inv.totalAmount || "0"),
        0,
      );
    const receivables = (arInvoices ?? [])
      .filter(
        (inv: any) =>
          inv.status === "pending" ||
          inv.status === "partial" ||
          inv.status === "overdue",
      )
      .reduce((s: number, inv: any) => s + parseFloat(inv.balance || "0"), 0);
    const payables = (apInvoices ?? [])
      .filter(
        (inv: any) => inv.status === "pending" || inv.status === "partial",
      )
      .reduce((s: number, inv: any) => s + parseFloat(inv.balance || "0"), 0);

    return createDefaultMetrics({
      cashAvailable: bankBalance + cashBalance,
      revenue,
      receivables,
    });
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts, isLoading, entityId]);

  // Check if user has data or is in onboarding state
  const hasData = useMemo(() => {
    if (!entityId || isLoading) return null;
    return (
      (arInvoices ?? []).length > 0 ||
      (apInvoices ?? []).length > 0 ||
      (bankAccounts ?? []).length > 0 ||
      (cashAccounts ?? []).length > 0
    );
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts, isLoading, entityId]);

  // ─── Onboarding state (no data yet) ─────────────────────────────────────
  if (hasData === false) {
    return (
      <div className="min-h-[calc(100vh-5rem)] space-y-6">
        {/* AI Greeting */}
        <AIGreeting />

        {/* Onboarding: Financial Health Preview */}
        <FinancialHealthCard metrics={metrics ?? createDefaultMetrics()} />

        {/* Suggestions Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <AgentActivityFeed limit={10} showHeader compact />
          </div>
          <div className="lg:col-span-1">
            <UpcomingEvents events={createDefaultEvents()} />
          </div>
        </div>

        {/* Quick AI Actions */}
        <QuickAIActions />

        {/* AI Chat + suggestions — bottom of page */}
        <AIChatInput />

        {/* Guided tour */}
        <GuidedTour
          steps={DEFAULT_TOUR_STEPS}
          open={showTour}
          onClose={() => setShowTour(false)}
          onFinish={() =>
            localStorage.setItem("xenboox_tour_completed", "true")
          }
        />
        <button
          type="button"
          onClick={() => setShowTour(true)}
          className="fixed bottom-6 right-6 z-40 flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-xs font-medium text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          <Sparkles className="h-3.5 w-3.5 text-signal-indigo" />
          Show me around
        </button>
      </div>
    );
  }

  // ─── Loading state ─────────────────────────────────────────────────────
  if (hasData === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl lg:col-span-2" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── AI-Native Dashboard (has data) ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Row 1: Greeting */}
      <AIGreeting />

      {/* Row 2: Financial Health + AI Insights + AI Activity (3-col grid) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Financial Health - spans 5 cols */}
        <div className="lg:col-span-5">
          <FinancialHealthCard metrics={metrics ?? createDefaultMetrics()} />
        </div>

        {/* AI Insights - spans 4 cols */}
        <div className="lg:col-span-4">
          <AIInsightsFeed insights={createDefaultInsights()} />
        </div>

        {/* AI Activity - spans 3 cols */}
        <div className="lg:col-span-3">
          {/* Mobile: render upstream after desktop */}
          <AgentActivityFeed limit={10} showHeader compact />
        </div>
      </div>

      {/* Row 3: Active Workflows */}
      <ActiveWorkflows workflows={createDefaultWorkflows()} />

      {/* Row 4: Upcoming Events + Quick AI Actions */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <UpcomingEvents events={createDefaultEvents()} />
        </div>
        <div className="lg:col-span-3">
          <QuickAIActions />
        </div>
      </div>

      {/* AI Chat + suggestions — bottom of page */}
      <AIChatInput />

      {/* Guided tour */}
      <GuidedTour
        steps={DEFAULT_TOUR_STEPS}
        open={showTour}
        onClose={() => setShowTour(false)}
        onFinish={() => localStorage.setItem("xenboox_tour_completed", "true")}
      />
      <button
        type="button"
        onClick={() => setShowTour(true)}
        className="fixed bottom-6 right-6 z-40 flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-xs font-medium text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all duration-200"
      >
        <Sparkles className="h-3.5 w-3.5 text-signal-indigo" />
        Take a tour
      </button>
    </div>
  );
}
