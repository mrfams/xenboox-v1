"use client";

import {
  Wallet,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Mobile Money Cards ─────────────────────────────────────────────────────
//
// Displays mobile money accounts (Wave, Orange Money, QCell, etc.)
// with balance overview and recent transactions.
// AI-native: click to ask the AI about any account.

export function MobileMoneyCards() {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: accounts, isLoading } = trpc.mobileMoney.listAccounts.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const { data: transactions } = trpc.mobileMoney.listTransactions.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const recentTxs = transactions?.slice(0, 5) ?? [];
  const totalBalance =
    accounts?.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    ) ?? 0;

  const providerColors: Record<string, string> = {
    wave: "text-yellow-500 bg-yellow-500/10",
    modempay: "text-blue-500 bg-blue-500/10",
    afrimoney: "text-green-500 bg-green-500/10",
    qmoney: "text-purple-500 bg-purple-500/10",
    mpesa: "text-red-500 bg-red-500/10",
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Smartphone className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Mobile Money
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {accounts?.length ?? 0} accounts · {format(totalBalance)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Mobile Money",
                name: "Mobile Money Overview",
                fields: [
                  { label: "Accounts", value: String(accounts?.length ?? 0) },
                  { label: "Total Balance", value: format(totalBalance) },
                  {
                    label: "Recent Transactions",
                    value: String(recentTxs.length),
                  },
                ],
              },
              "Show me my mobile money accounts. Which provider has the most activity? Any fee optimization opportunities?",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 py-6 text-center">
          <Smartphone
            className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-xs text-muted-foreground mb-2">
            No mobile money accounts connected
          </p>
          <button
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: "Mobile Money", name: "Mobile Money Setup" },
                "Help me connect my first mobile money account (Wave, Orange, or QCell)",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Connect with AI
          </button>
        </div>
      ) : (
        <>
          {/* Account Cards */}
          <div className="grid gap-3 sm:grid-cols-2 mb-3">
            {accounts.slice(0, 4).map((account) => {
              const balance = parseFloat(account.currentBalance ?? "0");
              const colorClass =
                providerColors[account.provider] ??
                "text-gray-500 bg-gray-500/10";

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      {
                        kind: "Mobile Money Account",
                        name: account.accountName,
                        id: account.id,
                        fields: [
                          { label: "Provider", value: account.provider },
                          { label: "Phone", value: account.phoneNumber },
                          {
                            label: "Balance",
                            value: format(balance),
                          },
                          {
                            label: "Status",
                            value: account.isActive ? "Active" : "Inactive",
                          },
                        ],
                      },
                      `Show me recent transactions for ${account.accountName}. Any anomalies or unusual fees?`,
                    )
                  }
                  className="w-full text-left rounded-lg border border-border/50 bg-background/50 p-3 transition-all hover:border-border/80 hover:shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold uppercase",
                          colorClass,
                        )}
                      >
                        {account.provider.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {account.accountName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {account.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {format(balance)}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {account.isActive ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {account.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recent Transactions */}
          {recentTxs.length > 0 && (
            <div className="border-t border-border/30 pt-3">
              <p className="text-[10px] font-medium text-muted-foreground/70 mb-2">
                Recent Activity
              </p>
              <div className="space-y-1">
                {recentTxs.map((tx) => {
                  const isCredit =
                    tx.type === "collection" || tx.type === "refund";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                            isCredit ? "bg-emerald-500/10" : "bg-red-500/10",
                          )}
                        >
                          {isCredit ? (
                            <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {tx.counterpartyName ?? tx.description ?? tx.type}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {tx.initiatedAt
                              ? new Date(tx.initiatedAt).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )
                              : ""}
                            {tx.status !== "successful" && (
                              <span
                                className={cn(
                                  "ml-1 font-medium",
                                  tx.status === "failed"
                                    ? "text-red-500"
                                    : "text-amber-500",
                                )}
                              >
                                {tx.status}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-semibold tabular-nums shrink-0",
                          isCredit ? "text-emerald-500" : "text-foreground",
                        )}
                      >
                        {isCredit ? "+" : "-"}
                        {format(parseFloat(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
