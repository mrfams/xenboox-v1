"use client";

import { useRouter } from "next/navigation";
import { KnowledgeSummary } from "@/components/knowledge/knowledge-summary";
import { KnowledgeAIInsights } from "@/components/knowledge/knowledge-ai-insights";
import { KnowledgeUniversalSearch } from "@/components/knowledge/knowledge-universal-search";
import { KnowledgeDocumentIntelligence } from "@/components/knowledge/knowledge-document-intelligence";
import { KnowledgeApprovalIntelligence } from "@/components/knowledge/knowledge-approval-intelligence";
import { KnowledgeApprovalWorkflow } from "@/components/knowledge/knowledge-approval-workflow";
import { KnowledgeCompanyMemory } from "@/components/knowledge/knowledge-company-memory";
import { KnowledgeRecommendations } from "@/components/knowledge/knowledge-recommendations";
import { KnowledgeRecentActivity } from "@/components/knowledge/knowledge-recent-activity";
import { KnowledgeAIPanel } from "@/components/knowledge/knowledge-ai-panel";
import { KnowledgeQuickActions } from "@/components/knowledge/knowledge-quick-actions";

export default function KnowledgePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <KnowledgeSummary />

        {/* Top row: Search + AI Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <KnowledgeUniversalSearch />
          <KnowledgeAIInsights />
        </div>

        {/* Middle row: Document Intelligence + Approval Intelligence + Workflow */}
        <div className="grid gap-6 lg:grid-cols-3">
          <KnowledgeDocumentIntelligence />
          <KnowledgeApprovalIntelligence />
          <KnowledgeApprovalWorkflow />
        </div>

        {/* Bottom sections: Company Memory + Recommendations + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <KnowledgeCompanyMemory />
          <KnowledgeRecommendations />
          <KnowledgeRecentActivity />
        </div>
      </div>

      {/* AI Panel (right sidebar fixed) */}
      <div className="fixed bottom-24 right-6 z-40 hidden xl:block">
        <KnowledgeAIPanel
          onAction={(action) =>
            router.push(`/dashboard/chat?initial=${encodeURIComponent(action)}`)
          }
        />
      </div>

      {/* Quick Actions FAB */}
      <KnowledgeQuickActions />
    </div>
  );
}
