"use client";

import { useRouter } from "next/navigation";
import { AccountingSummary } from "@/components/accounting/accounting-summary";
import { AccountingAIInsights } from "@/components/accounting/accounting-ai-insights";
import { AccountingMonthEndProgress } from "@/components/accounting/accounting-month-end-progress";
import { AccountingBookHealth } from "@/components/accounting/accounting-book-health";
import { AccountingJournalReview } from "@/components/accounting/accounting-journal-review";
import { AccountingTrialBalance } from "@/components/accounting/accounting-trial-balance";
import { AccountingCloseChecklist } from "@/components/accounting/accounting-close-checklist";
import { AccountingRecentActivity } from "@/components/accounting/accounting-recent-activity";
import { AccountingAIPanel } from "@/components/accounting/accounting-ai-panel";
import { AccountingQuickActions } from "@/components/accounting/accounting-quick-actions";

export default function AccountingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <AccountingSummary />

        {/* Top row: Month-End Progress + AI Insights + Book Health */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <AccountingMonthEndProgress />
          </div>
          <div className="lg:col-span-1">
            <AccountingAIInsights />
          </div>
          <div className="lg:col-span-1">
            <AccountingBookHealth />
          </div>
        </div>

        {/* Middle row: Journal Review + Trial Balance */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AccountingJournalReview />
          <AccountingTrialBalance />
        </div>

        {/* Bottom sections: Close Checklist + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AccountingCloseChecklist />
          <AccountingRecentActivity />
        </div>
      </div>

      {/* AI Panel (right sidebar fixed) */}
      <div className="fixed bottom-24 right-6 z-40 hidden xl:block">
        <AccountingAIPanel
          onAction={(action) =>
            router.push(`/dashboard/chat?initial=${encodeURIComponent(action)}`)
          }
        />
      </div>

      {/* Quick Actions FAB */}
      <AccountingQuickActions />
    </div>
  );
}
