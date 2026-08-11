"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Building2,
  Wallet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Clock,
  FileText,
  Shield,
  Landmark,
  Smartphone,
  ListChecks,
  Link2,
  FileSpreadsheet,
  Settings,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { DocumentUploadButton } from "@/components/module/document-upload-button";
import {
  realtimeQueryOptions,
  analyticsQueryOptions,
} from "@/lib/trpc/query-options";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { TabItem } from "@/components/module/module-page-shell.types";
import { CreateBankAccountDialog } from "@/components/dashboard/create-bank-account-dialog";
import { RowAiAction } from "@/components/module/row-ai-action";
import {
  ModulePanel,
  ModulePanelEmpty,
  ModulePanelLoading,
} from "@/components/module/module-tab-panel";

// ─── Bank Accounts Table ───────────────────────────────────────────────────

function BankAccountsTable({
  accounts,
  selectedId,
  onSelect,
  isLoading,
}: {
  accounts: Array<{
    id: string;
    name: string;
    maskedNumber: string;
    bankName: string;
    type: string;
    currency: string;
    currentBalance: string;
    isActive: boolean;
    lastTransactionDate: string | null;
    transactionCount: number;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const bankColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Access Bank Gambia": "bg-blue-600",
    "Standard Chartered": "bg-green-600",
    "UBA Gambia": "bg-red-600",
    "Cash Account": "bg-purple-500",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Bank / Institution
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Currency
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Balance
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Unreconciled
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Last Sync
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const balance = parseFloat(account.currentBalance ?? "0");
            const bankColor = bankColors[account.bankName] ?? "bg-slate-400";

            return (
              <tr
                key={account.id}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "group relative border-b border-slate-100 cursor-pointer transition-colors",
                  selectedId === account.id
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50",
                )}
              >
                <RowAiAction
                  focus={{
                    kind: "Bank Account",
                    name: account.name,
                    id: account.id,
                    fields: [
                      { label: "Bank", value: account.bankName },
                      { label: "Type", value: account.type },
                      { label: "Currency", value: account.currency },
                      {
                        label: "Balance",
                        value: balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      },
                      {
                        label: "Status",
                        value: account.isActive ? "Active" : "Inactive",
                      },
                    ],
                  }}
                />
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {account.maskedNumber}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-6 w-6 rounded flex items-center justify-center",
                        bankColor,
                      )}
                    >
                      <Building2 className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-700">
                      {account.bankName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-700 capitalize">
                    {account.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-700">
                    {account.currency}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    {balance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      "text-sm",
                      account.isActive ? "text-slate-900" : "text-slate-400",
                    )}
                  >
                    {account.isActive ? "0.00" : "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-sm",
                      account.isActive ? "text-emerald-600" : "text-slate-400",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        account.isActive ? "bg-emerald-500" : "bg-slate-300",
                      )}
                    />
                    {account.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-500">
                    {account.lastTransactionDate
                      ? formatTimeAgo(account.lastTransactionDate)
                      : "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <RowActionsMenu
                    items={[
                      {
                        label: "View details",
                        icon: <Eye className="h-3.5 w-3.5" />,
                        onSelect: () => onSelect(account.id),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Account Snapshot (Overview) ──────────────────────────────────────────
// Compact account list for the Overview tab — a glance at balances and
// status, not the full register (that lives on the Accounts tab).

function AccountSnapshot({
  accounts,
  selectedId,
  onSelect,
  isLoading,
}: {
  accounts: Array<{
    id: string;
    name: string;
    maskedNumber: string;
    bankName: string;
    currentBalance: string;
    isActive: boolean;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ModulePanelLoading rows={5} />;
  }

  if (accounts.length === 0) {
    return (
      <ModulePanelEmpty
        icon={Building2}
        title="No bank accounts yet"
        description="Create your first account to start tracking cash, or connect a bank to sync automatically."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {accounts.map((account) => {
        const balance = parseFloat(account.currentBalance ?? "0");
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id)}
            className={cn(
              "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors",
              selectedId === account.id ? "bg-indigo-50" : "hover:bg-slate-50",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Building2 className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {account.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {account.bankName} · {account.maskedNumber}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {balance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p
                className={cn(
                  "text-xs",
                  account.isActive ? "text-emerald-600" : "text-slate-400",
                )}
              >
                {account.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Cash Position Chart ───────────────────────────────────────────────────

function CashPositionChart({
  data,
}: {
  data: {
    dailyBalances: Record<string, number>;
    currentBalance: number;
    incoming: number;
    outgoing: number;
    netChange: number;
  };
}) {
  const maxBalance = Math.max(
    ...Object.values(data.dailyBalances),
    data.currentBalance,
  );
  const minBalance = Math.min(...Object.values(data.dailyBalances), 0);
  const range = maxBalance - minBalance || 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Cash Position (This Month)
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View in Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-48 flex items-end gap-1">
          {Object.entries(data.dailyBalances)
            .slice(-10)
            .map(([date, balance]) => {
              const height = ((balance - minBalance) / range) * 100;
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-indigo-500 rounded-t"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {new Date(date).getDate()}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-bold text-slate-900">
              GMD {data.currentBalance.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">Current Balance</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Incoming</span>
              <span className="font-medium text-emerald-600">
                GMD {data.incoming.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Outgoing</span>
              <span className="font-medium text-red-600">
                GMD {data.outgoing.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Net Change</span>
              <span
                className={cn(
                  "font-medium",
                  data.netChange >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                GMD {data.netChange.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Balance by Currency ───────────────────────────────────────────────────

function BalanceByCurrency({
  data,
  unreconciledBalance,
  unreconciledCount,
}: {
  data: Array<{
    currency: string;
    balance: number;
    percentage: number;
  }>;
  unreconciledBalance?: number;
  unreconciledCount?: number;
}) {
  const totalBalance = data.reduce((sum, d) => sum + d.balance, 0);

  const colors: Record<string, string> = {
    GMD: "bg-indigo-500",
    USD: "bg-emerald-500",
    EUR: "bg-blue-500",
    GBP: "bg-purple-500",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Balance by Currency</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {data.map((item, i) => {
              const startAngle = data
                .slice(0, i)
                .reduce((sum, d) => sum + d.percentage * 3.6, 0);
              const endAngle = startAngle + item.percentage * 3.6;
              const largeArc = item.percentage > 50 ? 1 : 0;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 50 + 40 * Math.cos(startRad);
              const y1 = 50 + 40 * Math.sin(startRad);
              const x2 = 50 + 40 * Math.cos(endRad);
              const y2 = 50 + 40 * Math.sin(endRad);
              const x3 = 50 + 25 * Math.cos(endRad);
              const y3 = 50 + 25 * Math.sin(endRad);
              const x4 = 50 + 25 * Math.cos(startRad);
              const y4 = 50 + 25 * Math.sin(startRad);

              const colorClass = colors[item.currency] ?? "bg-slate-400";
              const fillColor =
                colorClass === "bg-indigo-500"
                  ? "#6366f1"
                  : colorClass === "bg-emerald-500"
                    ? "#10b981"
                    : colorClass === "bg-blue-500"
                      ? "#3b82f6"
                      : "#8b5cf6";

              return (
                <path
                  key={item.currency}
                  d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                  fill={fillColor}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {totalBalance >= 1_000_000
                ? `${(totalBalance / 1_000_000).toFixed(1)}M`
                : totalBalance >= 1_000
                  ? `${(totalBalance / 1_000).toFixed(1)}K`
                  : totalBalance.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item) => {
            const colorClass = colors[item.currency] ?? "bg-slate-400";
            return (
              <div
                key={item.currency}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded", colorClass)} />
                  <span className="text-sm text-slate-700">
                    {item.currency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-900">
                    {item.balance.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          {unreconciledBalance !== undefined && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-slate-300" />
                  <span className="text-sm text-slate-700">Unreconciled</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {Math.abs(unreconciledBalance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {unreconciledCount ?? 0} accounts
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          Primary Currency:{" "}
          <span className="font-medium text-slate-900">GMD</span>
        </p>
      </div>
    </div>
  );
}

// ─── Banking Transactions Panel ───────────────────────────────────────────

function BankingTransactionsTable({
  transactions,
  isLoading,
}: {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    reference: string | null;
    type: string;
    amount: number;
    balance: number | null;
    isReconciled: boolean;
    accountName: string;
    bankName: string;
    currency: string;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ModulePanelLoading rows={6} />;
  }

  if (transactions.length === 0) {
    return (
      <ModulePanelEmpty
        icon={FileText}
        title="No transactions yet"
        description="Transactions from connected bank accounts and imported statements will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Description
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Type
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Balance
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                {new Date(tx.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">
                  {tx.description}
                </p>
                {tx.reference && (
                  <p className="text-xs text-slate-400">{tx.reference}</p>
                )}
              </td>
              <td className="py-3 px-4">
                <p className="text-sm text-slate-700">{tx.accountName}</p>
                {tx.bankName && (
                  <p className="text-xs text-slate-400">{tx.bankName}</p>
                )}
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600 capitalize">
                  {tx.type}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    tx.amount >= 0 ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {tx.amount >= 0 ? "+" : "−"}
                  {Math.abs(tx.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {tx.currency}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm tabular-nums text-slate-600">
                  {tx.balance !== null
                    ? tx.balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    tx.isReconciled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {tx.isReconciled ? "Reconciled" : "Unreconciled"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile Money Panel ────────────────────────────────────────────────────

function MobileMoneyPanel({
  accounts,
  transactions,
  accountsLoading,
  transactionsLoading,
}: {
  accounts: Array<{
    id: string;
    provider: string;
    accountName: string;
    phoneNumber: string;
    currentBalance: string | null;
    currency: string;
    isActive: boolean;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: string;
    fee: string | null;
    counterpartyName: string | null;
    description: string | null;
    status: string;
    initiatedAt: Date | string;
  }>;
  accountsLoading: boolean;
  transactionsLoading: boolean;
}) {
  const providerColors: Record<string, string> = {
    modempay: "bg-indigo-100 text-indigo-700",
    afrimoney: "bg-emerald-100 text-emerald-700",
    qmoney: "bg-blue-100 text-blue-700",
    mpesa: "bg-red-100 text-red-700",
    wave: "bg-purple-100 text-purple-700",
  };
  const txStatusColors: Record<string, string> = {
    successful: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    reversed: "bg-slate-100 text-slate-600",
    timeout: "bg-orange-100 text-orange-700",
  };

  if (accountsLoading || transactionsLoading) {
    return <ModulePanelLoading rows={5} />;
  }

  if (accounts.length === 0 && transactions.length === 0) {
    return (
      <ModulePanelEmpty
        icon={Smartphone}
        title="No mobile money accounts yet"
        description="Link a mobile money wallet (Modepay, Afrimoney, QMoney, M-Pesa or Wave) to track collections and disbursements."
      />
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-slate-900">
          Mobile Money Accounts
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    providerColors[acc.provider] ??
                      "bg-slate-100 text-slate-600",
                  )}
                >
                  {acc.provider}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    acc.isActive ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      acc.isActive ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  {acc.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">
                {acc.accountName}
              </p>
              <p className="text-xs text-slate-500">{acc.phoneNumber}</p>
              <p className="mt-3 text-lg font-semibold tabular-nums text-slate-900">
                {Number(acc.currentBalance ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-medium text-slate-400">
                  {acc.currency}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-slate-900">
          Recent Transactions
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                  Date
                </th>
                <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                  Type
                </th>
                <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                  Counterparty
                </th>
                <th className="text-right py-2.5 px-4 text-sm font-medium text-slate-600">
                  Amount
                </th>
                <th className="text-right py-2.5 px-4 text-sm font-medium text-slate-600">
                  Fee
                </th>
                <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-4 text-sm text-slate-600 whitespace-nowrap">
                    {new Date(tx.initiatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 px-4 text-sm text-slate-700 capitalize">
                    {tx.type}
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="text-sm text-slate-700">
                      {tx.counterpartyName ?? "—"}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-slate-400">{tx.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                    {Number(tx.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-500">
                    {Number(tx.fee ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        txStatusColors[tx.status] ??
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Bank Rules Panel ──────────────────────────────────────────────────────

function BankRulesTable({
  rules,
  isLoading,
}: {
  rules: Array<{
    id: string;
    name: string;
    matchType: string;
    matchValue: string;
    category: string;
    priority: number;
    isActive: boolean;
    matchCount: number;
  }>;
  isLoading: boolean;
}) {
  const matchTypeLabels: Record<string, string> = {
    description_contains: "Description contains",
    description_equals: "Description equals",
    reference_contains: "Reference contains",
    amount_equals: "Amount equals",
    amount_above: "Amount above",
    amount_below: "Amount below",
  };

  if (isLoading) {
    return <ModulePanelLoading rows={4} />;
  }

  if (rules.length === 0) {
    return (
      <ModulePanelEmpty
        icon={ListChecks}
        title="No categorization rules yet"
        description="Rules automatically categorize incoming transactions — e.g. always categorize payments to a supplier as Rent. Rules are created from the AI copilot or the reconciliation workspace."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Rule
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Condition
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Matches
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">
                  {rule.name}
                </p>
                <p className="text-xs text-slate-400">
                  Priority {rule.priority}
                </p>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {matchTypeLabels[rule.matchType] ?? rule.matchType}:{" "}
                <span className="font-medium text-slate-900">
                  {rule.matchValue}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-700">{rule.category}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {rule.matchCount}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    rule.isActive ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      rule.isActive ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Connections Panel ─────────────────────────────────────────────────────

function ConnectionsTable({
  connections,
  isLoading,
}: {
  connections: Array<{
    id: string;
    provider: string;
    institutionName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    accountType: string | null;
    currency: string | null;
    status: string;
    lastSyncedAt: string | null;
    syncError: string | null;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ModulePanelLoading rows={4} />;
  }

  if (connections.length === 0) {
    return (
      <ModulePanelEmpty
        icon={Link2}
        title="No bank connections"
        description="Connect your bank to sync transactions automatically, or import a statement to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Institution
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Currency
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Last Sync
            </th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn) => (
            <tr
              key={conn.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
                    <Landmark className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {conn.institutionName ?? conn.provider}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <p className="text-sm text-slate-700">
                  {conn.accountName ?? "—"}
                </p>
                {conn.accountNumber && (
                  <p className="text-xs text-slate-400">{conn.accountNumber}</p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600 capitalize">
                {conn.accountType ?? "—"}
              </td>
              <td className="py-3 px-4 text-sm text-slate-700">
                {conn.currency ?? "—"}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    conn.status === "connected"
                      ? "text-emerald-600"
                      : conn.status === "error"
                        ? "text-red-600"
                        : "text-amber-600",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      conn.status === "connected"
                        ? "bg-emerald-500"
                        : conn.status === "error"
                          ? "bg-red-500"
                          : "bg-amber-500",
                    )}
                  />
                  {conn.status === "error"
                    ? "Sync error"
                    : conn.status.charAt(0).toUpperCase() +
                      conn.status.slice(1)}
                </span>
                {conn.syncError && (
                  <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-red-500">
                    {conn.syncError}
                  </p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">
                {conn.lastSyncedAt ? formatTimeAgo(conn.lastSyncedAt) : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Statements Panel ──────────────────────────────────────────────────────

function StatementsTable({
  lines,
  totalCount,
  isLoading,
}: {
  lines: Array<{
    id: string;
    providerName: string | null;
    date: string;
    description: string;
    reference: string | null;
    amount: number;
    currency: string;
    status: string;
    matchTier: string | null;
    accountName: string | null;
  }>;
  totalCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ModulePanelLoading rows={6} />;
  }

  if (lines.length === 0) {
    return (
      <ModulePanelEmpty
        icon={FileSpreadsheet}
        title="No statements imported"
        description="Import a bank statement (CSV or PDF) to reconcile it against your books line by line."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Description
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Match
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                {new Date(line.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">
                  {line.description}
                </p>
                {line.reference && (
                  <p className="text-xs text-slate-400">{line.reference}</p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {line.accountName ?? "—"}
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    line.amount >= 0 ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {line.amount >= 0 ? "+" : "−"}
                  {Math.abs(line.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {line.currency}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs text-slate-500 capitalize">
                  {line.matchTier ?? "—"}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600 capitalize">
                  {line.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        {totalCount.toLocaleString()} statement lines total
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  recentActivity,
  connections,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  recentActivity: Array<{
    id: string;
    bankName: string;
    accountName: string;
    action: string;
    date: string;
  }>;
  connections: Array<{
    id: string;
    name: string;
    accountName: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Why is the balance lower this month?",
    "Show me large transactions this week",
    "Which account has unreconciled items?",
    "Forecast my cash for next 30 days",
  ];

  const bankColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Access Bank Gambia": "bg-blue-600",
    "Standard Chartered": "bg-green-600",
    "UBA Gambia": "bg-red-600",
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Xenboox AI Copilot</h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600">
              <RefreshCw className="h-4 w-4" />
            </button>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-slate-900">
            Good morning, Famara 👋
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Here&apos;s your banking overview for today.
          </p>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border p-4",
                insight.type === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : insight.type === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-blue-200 bg-blue-50",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center mt-0.5",
                    insight.type === "warning"
                      ? "bg-amber-100"
                      : insight.type === "success"
                        ? "bg-emerald-100"
                        : "bg-blue-100",
                  )}
                >
                  {insight.type === "warning" ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  ) : insight.type === "success" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {insight.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {insight.description}
                  </p>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                    {insight.actionLabel} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Recent Activity
          </h4>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {activity.action}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activity.bankName} · {activity.accountName}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatTimeAgo(activity.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Banks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Connected Banks</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Manage
            </button>
          </div>
          <div className="flex items-center gap-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  bankColors[conn.name] ?? "bg-slate-400",
                )}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            ))}
            <button className="h-10 w-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-indigo-400 transition-colors">
              <Plus className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Bot className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function formatTimeAgo(date: Date | string | null) {
  if (!date) return "Never";
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Accounts-tab filters (client-side over the overview account list)
  const [accountSearch, setAccountSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");

  // Transactions-tab filters (server-side via listTransactions)
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState<
    "all" | "reconciled" | "unreconciled"
  >("all");
  const [txType, setTxType] = useState<
    "all" | "deposit" | "withdrawal" | "transfer" | "fee" | "interest"
  >("all");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize] = useState(15);
  const [showCreate, setShowCreate] = useState(false);

  const { data: overviewData, isLoading: overviewLoading } =
    trpc.banking.getOverview.useQuery(undefined, realtimeQueryOptions);

  const { data: cashPosition } = trpc.banking.getCashPosition.useQuery(
    {},
    realtimeQueryOptions,
  );

  const { data: aiInsights } = trpc.banking.getAiInsights.useQuery(
    undefined,
    analyticsQueryOptions,
  );

  const { data: recentActivity } = trpc.banking.getRecentActivity.useQuery(
    undefined,
    realtimeQueryOptions,
  );

  const { data: bankTxs, isLoading: bankTxsLoading } =
    trpc.banking.listTransactions.useQuery(
      {
        search: txSearch || undefined,
        status: txStatus,
        type: txType === "all" ? undefined : txType,
        limit: txPageSize,
        offset: (txPage - 1) * txPageSize,
      },
      { enabled: activeTab === "transactions" },
    );

  const { data: connections, isLoading: connectionsLoading } =
    trpc.banking.listConnections.useQuery(undefined, {
      enabled: activeTab === "connections",
    });

  const { data: rules, isLoading: rulesLoading } =
    trpc.banking.listRules.useQuery(undefined, {
      enabled: activeTab === "rules",
    });

  const { data: statementLines, isLoading: statementsLoading } =
    trpc.banking.listStatementLines.useQuery(
      { limit: 50, offset: 0 },
      { enabled: activeTab === "statements" },
    );

  const { data: mmAccounts, isLoading: mmAccountsLoading } =
    trpc.mobileMoney.listAccounts.useQuery(undefined, {
      enabled: activeTab === "mobile-money",
    });

  const { data: mmTransactions, isLoading: mmTransactionsLoading } =
    trpc.mobileMoney.listTransactions.useQuery(undefined, {
      enabled: activeTab === "mobile-money",
    });

  const allAccounts = overviewData?.accounts ?? [];
  // Top accounts by balance — used by the Overview tab's "at a glance" list.
  const topAccounts = [...allAccounts]
    .sort(
      (a, b) =>
        parseFloat(b.currentBalance ?? "0") -
        parseFloat(a.currentBalance ?? "0"),
    )
    .slice(0, 5);
  const visibleAccounts = allAccounts.filter((acc) => {
    const q = accountSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.bankName.toLowerCase().includes(q) ||
      acc.maskedNumber.toLowerCase().includes(q);
    const matchesStatus =
      accountStatus === "all" ||
      (accountStatus === "active" && acc.isActive) ||
      (accountStatus === "inactive" && !acc.isActive);
    return matchesQuery && matchesStatus;
  });

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview" },
    {
      key: "accounts",
      label: "Accounts",
      count: allAccounts.length || undefined,
    },
    { key: "transactions", label: "Transactions" },
    { key: "cash", label: "Cash Management" },
    { key: "mobile-money", label: "Mobile Money" },
    { key: "rules", label: "Rules", count: rules?.length || undefined },
    {
      key: "connections",
      label: "Connections",
      count: connections?.length || undefined,
    },
    { key: "statements", label: "Statements" },
    { key: "settings", label: "Settings" },
  ];

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelectedAccountId(null);
    setTxPage(1);
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "accounts":
        return (
          <ModulePanel
            title="Bank Accounts"
            description="All accounts across your connected institutions."
          >
            <BankAccountsTable
              accounts={visibleAccounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
              isLoading={overviewLoading}
            />
          </ModulePanel>
        );
      case "transactions":
        return (
          <ModulePanel
            title="Bank Transactions"
            description="Every transaction across your accounts, with reconciliation status."
          >
            <BankingTransactionsTable
              transactions={bankTxs?.transactions ?? []}
              isLoading={bankTxsLoading}
            />
          </ModulePanel>
        );
      case "cash":
        return (
          <ModulePanel
            title="Cash Management"
            description="Cash position and balances by currency."
          >
            <div className="grid grid-cols-2 gap-6 p-4">
              {cashPosition && <CashPositionChart data={cashPosition} />}
              {overviewData?.currencyBreakdown && (
                <BalanceByCurrency
                  data={overviewData.currencyBreakdown}
                  unreconciledBalance={overviewData.summary.unreconciledBalance}
                  unreconciledCount={overviewData.summary.unreconciledAccounts}
                />
              )}
            </div>
          </ModulePanel>
        );
      case "mobile-money":
        return (
          <ModulePanel
            title="Mobile Money"
            description="Track collections and disbursements across mobile wallets."
          >
            <MobileMoneyPanel
              accounts={mmAccounts ?? []}
              transactions={mmTransactions ?? []}
              accountsLoading={mmAccountsLoading}
              transactionsLoading={mmTransactionsLoading}
            />
          </ModulePanel>
        );
      case "rules":
        return (
          <ModulePanel
            title="Categorization Rules"
            description="Automatic rules that categorize incoming transactions."
          >
            <BankRulesTable rules={rules ?? []} isLoading={rulesLoading} />
          </ModulePanel>
        );
      case "connections":
        return (
          <ModulePanel
            title="Bank Connections"
            description="Connected institutions and their sync status."
          >
            <ConnectionsTable
              connections={connections ?? []}
              isLoading={connectionsLoading}
            />
          </ModulePanel>
        );
      case "statements":
        return (
          <ModulePanel
            title="Imported Statements"
            description="Statement lines imported for reconciliation."
          >
            <StatementsTable
              lines={statementLines?.lines ?? []}
              totalCount={statementLines?.totalCount ?? 0}
              isLoading={statementsLoading}
            />
          </ModulePanel>
        );
      case "settings":
        return (
          <ModulePanel
            title="Bank Settings"
            description="Manage account preferences."
          >
            <ModulePanelEmpty
              icon={Settings}
              title="Bank settings are on their way"
              description="Account-level settings — naming, active status and notes — will live here. You can already manage accounts from the Accounts tab today."
            />
          </ModulePanel>
        );
      default:
        // Overview — executive snapshot: cash position, top accounts, recent
        // activity and AI insights. The full filterable accounts table lives
        // on the Accounts tab.
        return (
          <>
            {/* Cash position + currency breakdown */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4">
              {cashPosition && <CashPositionChart data={cashPosition} />}
              {overviewData?.currencyBreakdown && (
                <BalanceByCurrency
                  data={overviewData.currencyBreakdown}
                  unreconciledBalance={overviewData.summary.unreconciledBalance}
                  unreconciledCount={overviewData.summary.unreconciledAccounts}
                />
              )}
            </div>

            {/* Accounts at a glance */}
            <div className="border-t border-slate-200">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div>
                  <h3 className="font-medium text-slate-900">
                    Accounts at a Glance
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Top {Math.min(topAccounts.length, 5)} of{" "}
                    {allAccounts.length} accounts by balance.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange("accounts")}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <AccountSnapshot
                  accounts={topAccounts}
                  selectedId={selectedAccountId}
                  onSelect={setSelectedAccountId}
                  isLoading={overviewLoading}
                />
              </div>
            </div>

            {/* Recent activity + AI insights */}
            <div className="grid grid-cols-2 gap-6 border-t border-slate-200 bg-slate-50/70 p-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 font-medium text-slate-900">
                  Recent Activity
                </h3>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 4).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {activity.action}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {activity.bankName} · {activity.accountName}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatTimeAgo(activity.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No recent activity yet.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 font-medium text-slate-900">AI Insights</h3>
                {aiInsights && aiInsights.length > 0 ? (
                  <div className="space-y-3">
                    {aiInsights.slice(0, 3).map((insight) => (
                      <div
                        key={insight.id}
                        className={cn(
                          "rounded-lg border p-3",
                          insight.type === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : insight.type === "success"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-blue-200 bg-blue-50",
                        )}
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {insight.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No insights at this time.
                  </p>
                )}
              </div>
            </div>
          </>
        );
    }
  };

  const summaryCards = overviewData?.summary
    ? [
        {
          label: "Total Cash Balance",
          value: `GMD ${overviewData.summary.totalBalance.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`,
          change: overviewData.summary.totalBalanceChange,
          subtitle: `Across ${overviewData.summary.accountCount} accounts`,
          icon: Wallet,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          label: "Accounts",
          value: overviewData.summary.accountCount.toString(),
          subtitle: `${overviewData.summary.activeAccounts} active · ${overviewData.summary.inactiveAccounts} inactive`,
          icon: Building2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          label: "Unreconciled Balance",
          value: `GMD ${overviewData.summary.unreconciledBalance.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`,
          subtitle: `${overviewData.summary.unreconciledAccounts} accounts`,
          icon: AlertTriangle,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          label: "Last Updated",
          value: formatTimeAgo(overviewData.summary.lastSyncAt),
          subtitle: overviewData.summary.lastSyncAt
            ? new Date(overviewData.summary.lastSyncAt).toLocaleString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )
            : "No sync yet",
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
      ]
    : [];

  const filters =
    activeTab === "transactions" ? (
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={txSearch}
            onChange={(e) => {
              setTxSearch(e.target.value);
              setTxPage(1);
            }}
            placeholder="Search transactions..."
            className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={txStatus}
          onChange={(e) => {
            setTxStatus(e.target.value as typeof txStatus);
            setTxPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="reconciled">Reconciled</option>
          <option value="unreconciled">Unreconciled</option>
        </select>
        <select
          value={txType}
          onChange={(e) => {
            setTxType(e.target.value as typeof txType);
            setTxPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="transfer">Transfer</option>
          <option value="fee">Fee</option>
          <option value="interest">Interest</option>
        </select>
      </div>
    ) : activeTab === "accounts" ? (
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            placeholder="Search accounts..."
            className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={accountStatus}
          onChange={(e) => setAccountStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    ) : undefined;

  const pagination =
    activeTab === "transactions" ? (
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing{" "}
          {(bankTxs?.totalCount ?? 0) === 0 ? 0 : (txPage - 1) * txPageSize + 1}{" "}
          to {Math.min(txPage * txPageSize, bankTxs?.totalCount ?? 0)} of{" "}
          {(bankTxs?.totalCount ?? 0).toLocaleString()} transactions
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTxPage(Math.max(1, txPage - 1))}
            disabled={txPage === 1}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm text-slate-500">
            Page {txPage} of {Math.max(bankTxs?.totalPages ?? 1, 1)}
          </span>
          <button
            onClick={() =>
              setTxPage(Math.min(bankTxs?.totalPages ?? 1, txPage + 1))
            }
            disabled={txPage >= (bankTxs?.totalPages ?? 1)}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    ) : activeTab === "accounts" ? (
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {visibleAccounts.length} of {allAccounts.length} accounts
        </p>
      </div>
    ) : undefined;

  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <Shield className="h-3 w-3" />
      Secure
    </span>
  );

  const actions = (
    <>
      <button
        onClick={() => setShowCreate(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Add Account
      </button>
      <DocumentUploadButton
        docType="bank_statement"
        label="Import Statement"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      />
    </>
  );

  return (
    <ModulePageShell
      title="Banking"
      description="Connect, monitor, and manage all your bank accounts in one place."
      icon={Building2}
      iconBgClassName="bg-gradient-to-br from-indigo-500 to-purple-500"
      badge={badge}
      actions={actions}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      summaryCards={summaryCards}
      filters={filters}
      pagination={pagination}
    >
      {renderPanel()}
      <CreateBankAccountDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </ModulePageShell>
  );
}
