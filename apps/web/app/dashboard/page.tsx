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
import { ExecutiveBriefing } from "@/components/dashboard/executive-briefing";
import { BusinessHealth } from "@/components/dashboard/business-health";
import { AgentActivityFeed } from "@/components/dashboard/agent-activity-feed";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { ActiveAgents } from "@/components/dashboard/active-agents";
import { DashboardRightSidebar } from "@/components/dashboard/dashboard-right-sidebar";
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
      <div className="space-y-6">
        <AIGreeting />
        <AIChatInput />
        <ExecutiveBriefing />
        <BusinessHealth />
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
        <Skeleton className="h-16 w-96 rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Main Dashboard (3-column layout) ─────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Row 1: Greeting */}
      <AIGreeting />

      {/* Row 2: AI Command Box */}
      <AIChatInput />

      {/* Row 3: Executive Briefing */}
      <ExecutiveBriefing />

      {/* Row 4: Business Health KPI Cards */}
      <BusinessHealth />

      {/* Row 5: 3-column — Activity Feed | Pending Approvals | Active Agents */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AgentActivityFeed limit={10} showHeader compact />
        <PendingApprovals />
        <ActiveAgents />
      </div>

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
