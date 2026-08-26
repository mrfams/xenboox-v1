"use client";

import { Users } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { CustomersView } from "@/components/operations/customers-view";

// Backward-compat route — the Customers view now lives in the
// Operations surface tabs at /dashboard/operations?tab=customers.

export default function CustomersPage() {
  return (
    <ModulePageShell
      title="Customers"
      description="Your customers and their invoices. AI tracks who owes you money."
      icon={Users}
      aiSuggestions={[
        {
          label: "Who has overdue invoices?",
          prompt:
            "Which customers have overdue invoices? Show me the amounts and how many days overdue.",
        },
        {
          label: "Top customers by revenue",
          prompt: "Who are my top 5 customers by revenue this quarter?",
        },
        {
          label: "Customer payment trends",
          prompt:
            "Show me customer payment trends. Who pays late consistently?",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <CustomersView />
      </div>
    </ModulePageShell>
  );
}
