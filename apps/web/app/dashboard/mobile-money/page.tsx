"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { MobileMoneyLiveness } from "@/components/agents/mobile-money-liveness";
import { Badge } from "@/components/ui";
import { Smartphone, Plus } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CreateAccountDialog } from "./create-account-dialog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  successful: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  reversed: "bg-orange-100 text-orange-800",
  timeout: "bg-gray-100 text-gray-800",
};

const providerLabels: Record<string, string> = {
  modempay: "ModemPay",
  afrimoney: "Afrimoney",
  qmoney: "QMoney",
  mpesa: "M-Pesa",
  wave: "Wave",
};

export default function MobileMoneyPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: transactions, isLoading } =
    trpc.mobileMoney.listTransactions.useQuery();
  const { data: accounts } = trpc.mobileMoney.listAccounts.useQuery();

  return (
    <div className="space-y-8">
      {/* Accounts */}
      <div className="space-y-6">
        <PageHeader
          title="Mobile Money Accounts"
          description="Manage mobile money provider accounts"
          action={{
            label: "New Account",
            icon: <Plus className="mr-2 h-4 w-4" />,
            onClick: () => setShowCreateDialog(true),
          }}
        />

        <SubPageTabs tabs={MODULE_TABS.money} />

        <MobileMoneyLiveness />

        {!accounts || accounts.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="h-12 w-12" />}
            title="No mobile money accounts"
            description="Add your first mobile money account to start tracking transactions."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{account.accountName}</p>
                  <Badge variant={account.isActive ? "success" : "secondary"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerLabels[account.provider] || account.provider} ·{" "}
                  {account.phoneNumber}
                </p>
                <p className="mt-2 text-lg font-bold font-mono">
                  {parseFloat(account.currentBalance || "0").toLocaleString(
                    "en-GM",
                    { minimumFractionDigits: 2 },
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Transactions */}
      <div className="space-y-6">
        <PageHeader
          title="Transactions"
          description="Recent mobile money transactions"
        />

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="h-12 w-12" />}
            title="No transactions"
            description="Transactions will appear here once you process mobile money transfers."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Fee
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(tx.initiatedAt)}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">
                      {tx.type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {tx.description || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {parseFloat(tx.amount).toLocaleString("en-GM", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono text-muted-foreground">
                      {parseFloat(tx.fee || "0").toLocaleString("en-GM", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={statusColors[tx.status]}
                      >
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
