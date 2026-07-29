"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeSummary } from "@/components/knowledge/knowledge-summary";
import { KnowledgeTabs } from "@/components/knowledge/knowledge-tabs";
import { KnowledgeAIInsights } from "@/components/knowledge/knowledge-ai-insights";
import { KnowledgeUniversalSearch } from "@/components/knowledge/knowledge-universal-search";
import { KnowledgeDocumentIntelligence } from "@/components/knowledge/knowledge-document-intelligence";
import { KnowledgeApprovalIntelligence } from "@/components/knowledge/knowledge-approval-intelligence";
import { KnowledgeApprovalWorkflow } from "@/components/knowledge/knowledge-approval-workflow";
import { KnowledgeApprovalRiskScoring } from "@/components/knowledge/knowledge-approval-risk-scoring";
import { KnowledgeCompanyMemory } from "@/components/knowledge/knowledge-company-memory";
import { KnowledgeRecommendations } from "@/components/knowledge/knowledge-recommendations";
import { KnowledgeRecentActivity } from "@/components/knowledge/knowledge-recent-activity";
import { KnowledgeAISuperpowers } from "@/components/knowledge/knowledge-ai-superpowers";
import { KnowledgePolicies } from "@/components/knowledge/knowledge-policies";
import { KnowledgeAIPanel } from "@/components/knowledge/knowledge-ai-panel";
import { KnowledgeQuickActions } from "@/components/knowledge/knowledge-quick-actions";

type TabView = "search" | "insights" | "actions";

export default function KnowledgePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>("search");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <KnowledgeSummary />

        {/* Tabbed Navigation */}
        <KnowledgeTabs
          defaultTab="search"
          onTabChange={(tab) => setActiveTab(tab as TabView)}
        />

        {/* Tab Content */}
        {activeTab === "search" && (
          <>
            {/* Top row: Search + AI Superpowers */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeUniversalSearch />
              <KnowledgeAISuperpowers />
            </div>

            {/* Document Intelligence + Approval Risk Scoring */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeDocumentIntelligence />
              <KnowledgeApprovalRiskScoring />
            </div>

            {/* Company Memory + Policies */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeCompanyMemory />
              <KnowledgePolicies />
            </div>
          </>
        )}

        {activeTab === "insights" && (
          <>
            {/* AI Insights + Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeAIInsights />
              <KnowledgeRecentActivity />
            </div>

            {/* AI Recommendations */}
            <KnowledgeRecommendations />

            {/* Approval Intelligence + Workflow */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeApprovalIntelligence />
              <KnowledgeApprovalWorkflow />
            </div>
          </>
        )}

        {activeTab === "actions" && (
          <>
            {/* Pending Approvals */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeApprovalIntelligence />
              <KnowledgeApprovalWorkflow />
            </div>

            {/* Approval Risk Scoring + AI Superpowers */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeApprovalRiskScoring />
              <KnowledgeAISuperpowers />
            </div>

            {/* Missing Info + Recommendations */}
            <div className="grid gap-6 lg:grid-cols-2">
              <KnowledgeRecommendations />
              <KnowledgePolicies />
            </div>
          </>
        )}
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
