"use client";

import { CreditCard } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { VendorsView } from "@/components/operations/vendors-view";

// Backward-compat route — the Vendors view now lives in the
// Operations surface tabs at /dashboard/operations?tab=vendors.

export default function VendorsPage() {
  return (
    <ModulePageShell
      title="Vendors"
      description="Your vendors and bills. AI tracks what you owe and when."
      icon={CreditCard}
      aiSuggestions={[
        {
          label: "Bills to pay",
          prompt:
            "Show me all unpaid bills. Which are overdue and how much do I owe?",
        },
        {
          label: "Top vendors by spend",
          prompt: "Who are my top vendors by total spend this quarter?",
        },
        {
          label: "1099 summary",
          prompt:
            "Show me a summary of 1099-eligible vendors and total payments for tax season.",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <VendorsView />
      </div>
    </ModulePageShell>
  );
}
