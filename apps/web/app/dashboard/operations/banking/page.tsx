"use client";

import { Landmark } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { BankingView } from "@/components/operations/banking-view";

// Backward-compat route — the Banking view now lives in the
// Operations surface tabs at /dashboard/operations?tab=banking.

export default function BankingPage() {
  return (
    <ModulePageShell
      title="Banking"
      description="AI categorizes transactions. You review and approve."
      icon={Landmark}
      aiSuggestions={[
        {
          label: "Categorize uncategorized",
          prompt: "Categorize all uncategorized bank transactions",
        },
        {
          label: "Show anomalies",
          prompt: "Show unusual bank transactions from this month",
        },
        { label: "Reconcile", prompt: "Help me reconcile my bank accounts" },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <BankingView />
      </div>
    </ModulePageShell>
  );
}
