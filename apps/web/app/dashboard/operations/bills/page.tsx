/**
 * Bills Management Page — View and manage accounts payable.
 */

"use client";

import { BillsView } from "@/components/finance/bills-view";

export default function BillsPage() {
  return (
    <div className="space-y-6 p-3 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
        <p className="text-muted-foreground">
          Manage accounts payable — track bills, schedule payments, and monitor
          overdue items.
        </p>
      </div>
      <BillsView />
    </div>
  );
}
