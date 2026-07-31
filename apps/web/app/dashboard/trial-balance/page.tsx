"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { TableSkeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Scale } from "lucide-react";

export default function TrialBalancePage() {
  const { data: periods, isLoading: periodsLoading } =
    trpc.reports.listPeriods.useQuery();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const { data: trialBalance, isLoading } =
    trpc.journal.getTrialBalance.useQuery(
      { periodId: selectedPeriod },
      { enabled: !!selectedPeriod },
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        description="Verify that total debits equal total credits"
      />

      <SubPageTabs tabs={MODULE_TABS.accounting} />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select fiscal period" />
            </SelectTrigger>
            <SelectContent>
              {periods?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.year}-{String(p.month).padStart(2, "0")} ({p.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {trialBalance && (
          <Badge variant={trialBalance.isBalanced ? "default" : "destructive"}>
            {trialBalance.isBalanced ? "Balanced" : "Out of Balance"}
          </Badge>
        )}
      </div>

      {!selectedPeriod && !periodsLoading && (
        <EmptyState
          icon={<Scale className="h-12 w-12" />}
          title="Select a period"
          description="Choose a fiscal period to generate the trial balance"
        />
      )}

      {isLoading && <TableSkeleton rows={8} columns={4} />}

      {trialBalance && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.accounts.map((row) => (
                <tr
                  key={row.accountId}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                    {row.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-mono font-medium ${
                      row.balance >= 0 ? "text-foreground" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold bg-muted/30">
                <td colSpan={3} className="px-4 py-3 text-sm">
                  Totals
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatCurrency(trialBalance.totalDebit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatCurrency(trialBalance.totalCredit)}
                </td>
                <td
                  className={`px-4 py-3 text-sm text-right font-mono ${
                    trialBalance.isBalanced
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {formatCurrency(
                    trialBalance.totalDebit - trialBalance.totalCredit,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
