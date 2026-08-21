/**
 * Invoices Management Page — View and manage accounts receivable.
 */

"use client";

import { InvoicesView } from "@/components/finance/invoices-view";

export default function InvoicesPage() {
  return (
    <div className="space-y-6 p-3 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">
          Manage accounts receivable — track invoices, send reminders, and
          monitor collections.
        </p>
      </div>
      <InvoicesView />
    </div>
  );
}
