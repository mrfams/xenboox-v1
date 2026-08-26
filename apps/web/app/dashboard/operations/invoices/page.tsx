"use client";

import { FileText } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { InvoicesView } from "@/components/operations/invoices-view";

// Backward-compat route — the Invoices view now lives in the
// Operations surface tabs at /dashboard/operations?tab=invoices.

export default function InvoicesPage() {
  return (
    <ModulePageShell
      title="Invoices"
      description="Your invoices. AI tracks payments and flags overdue balances."
      icon={FileText}
      aiSuggestions={[
        {
          label: "Overdue invoices",
          prompt:
            "Which invoices are overdue? Show me amounts and how many days overdue.",
        },
        {
          label: "Invoice summary",
          prompt:
            "Give me a summary of all invoices this month. Total invoiced, paid, and outstanding.",
        },
        {
          label: "Send payment reminders",
          prompt:
            "Send payment reminders to all customers with overdue invoices.",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <InvoicesView />
      </div>
    </ModulePageShell>
  );
}
