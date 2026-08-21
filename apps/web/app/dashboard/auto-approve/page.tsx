"use client";

import { Zap } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { AutoApproveRules } from "@/components/approvals/auto-approve-rules";

// ─── Auto-Approve Page ─────────────────────────────────────────────────────
//
// Smart approval automation. AI learns from patterns and auto-approves
// routine transactions. Full audit trail for compliance.

export default function AutoApprovePage() {
  return (
    <ModulePageShell
      title="Auto-Approve"
      description="Smart approval automation. AI learns patterns."
      icon={Zap}
      aiSuggestions={[
        {
          label: "Suggest auto-approve rules",
          prompt: "Analyze my approval history and suggest auto-approve rules",
        },
        {
          label: "What's been auto-approved?",
          prompt: "Show me what's been auto-approved recently",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <AutoApproveRules />
      </div>
    </ModulePageShell>
  );
}
