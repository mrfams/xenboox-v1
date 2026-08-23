import type { Metadata } from "next";
import { Zap } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { AutoApproveRules } from "@/components/approvals/auto-approve-rules";

export const metadata = {
  title: "Auto-Approve — Smart Approvals | Xenboox",
  description:
    "AI learns approval patterns and auto-approves routine transactions with full audit trail and confidence thresholds.",
} satisfies Metadata;

// ─── Auto-Approve Page ─────────────────────────────────────────────────────
// Enterprise: policy-driven automation with HITL, confidence gating
// (0.7 supervisor, 0.4 human), and tamper-evident auditLog.

export default function AutoApprovePage() {
  return (
    <ModulePageShell
      title="Auto-Approve"
      description="Policy-driven automation. AI learns patterns, confidence gates routing, humans stay in control. Full tamper-evident audit trail."
      icon={Zap}
      aiSuggestions={[
        {
          label: "Suggest auto-approve rules",
          prompt:
            "Analyze my approval history and suggest auto-approve rules with confidence thresholds",
        },
        {
          label: "What's been auto-approved?",
          prompt:
            "Show me what's been auto-approved in the last 7 days with audit trail",
        },
        {
          label: "Escalation risks?",
          prompt:
            "Which pending items are at risk of escalation? Show confidence scores",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <AutoApproveRules />
      </div>
    </ModulePageShell>
  );
}
