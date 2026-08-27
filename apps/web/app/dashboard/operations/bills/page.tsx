import type { Metadata } from "next";

import { BillsView } from "@/components/finance/bills-view";

export const metadata: Metadata = {
  title: "Bills — Accounts Payable | Xenboox",
  description:
    "Track bills, schedule payments, and monitor overdue items. Entity-scoped accounts payable with audit trail.",
};

export default function BillsPage() {
  return (
    <div className="space-y-6 p-3 pb-20 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts payable — track bills, schedule payments, and
            monitor overdue items. Every query is entity-scoped.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 py-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-balanced-green"
              aria-hidden
            />
            Live • entity-scoped
          </span>
        </div>
      </div>
      <BillsView />
    </div>
  );
}
