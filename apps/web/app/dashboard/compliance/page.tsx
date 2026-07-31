"use client";

import { useRouter } from "next/navigation";

import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { ComplianceSummary } from "@/components/compliance/compliance-summary";
import { ComplianceBriefing } from "@/components/compliance/compliance-briefing";
import { ComplianceHealth } from "@/components/compliance/compliance-health";
import { ComplianceTaxCenter } from "@/components/compliance/compliance-tax-center";
import { ComplianceFilingCalendar } from "@/components/compliance/compliance-filing-calendar";
import { ComplianceRiskMonitor } from "@/components/compliance/compliance-risk-monitor";
import { AuditReadiness } from "@/components/compliance/compliance-audit-readiness";
import { ComplianceAuditPackage } from "@/components/compliance/compliance-audit-package";
import { ComplianceAuditTrail } from "@/components/compliance/compliance-audit-trail";
import { ComplianceAIPanel } from "@/components/compliance/compliance-ai-panel";
import { ComplianceQuickActions } from "@/components/compliance/compliance-quick-actions";
import { ComplianceLivenessCalendar } from "@/components/compliance/compliance-liveness-calendar";
import { ComplianceLiveness } from "@/components/agents/compliance-liveness";
import { RuleChangeProposals } from "@/components/compliance/rule-change-proposals";

export default function CompliancePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <SubPageTabs
          tabs={[
            { label: "Compliance Calendar", href: "/dashboard/compliance" },
            {
              label: "Tax & Filings",
              href: "/dashboard/tax-compliance/pipeline",
            },
            { label: "Audit Preparation", href: "/dashboard/audit/pipeline" },
          ]}
        />

        <ComplianceSummary />

        {/* Liveness Row: Live Calendar + Rule Changes */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ComplianceLivenessCalendar />
          </div>
          <RuleChangeProposals />
        </div>

        <ComplianceLiveness />

        {/* Top row: Briefing + Health + Tax Center */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ComplianceBriefing />
          <ComplianceHealth />
          <ComplianceTaxCenter />
        </div>

        {/* Middle row: Filing Calendar + Risk Monitor + Audit Readiness */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ComplianceFilingCalendar />
          <ComplianceRiskMonitor />
          <AuditReadiness />
        </div>

        {/* Bottom sections: Audit Package + Audit Trail */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ComplianceAuditPackage />
          <ComplianceAuditTrail />
        </div>
      </div>

      <div className="fixed bottom-24 right-6 z-40 hidden xl:block">
        <ComplianceAIPanel
          onAction={(action) =>
            router.push(`/dashboard/chat?initial=${encodeURIComponent(action)}`)
          }
        />
      </div>

      <ComplianceQuickActions />
    </div>
  );
}
