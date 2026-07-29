"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

type BankAccount = {
  id: string;
  name: string;
  balance: number;
  status: "healthy" | "warning" | "critical";
  connected: boolean;
  note?: string;
};

type MoneyBankAccountsProps = {
  accounts?: BankAccount[];
  onSelect?: (id: string) => void;
  className?: string;
};

const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: "ba1",
    name: "GTBank",
    balance: 482000,
    status: "healthy",
    connected: true,
  },
  {
    id: "ba2",
    name: "Zenith",
    balance: 292000,
    status: "healthy",
    connected: true,
  },
  {
    id: "ba3",
    name: "Access Bank",
    balance: 68000,
    status: "warning",
    connected: true,
    note: "Low Balance",
  },
  {
    id: "ba4",
    name: "MTN Mobile Money",
    balance: 61000,
    status: "healthy",
    connected: true,
  },
  {
    id: "ba5",
    name: "Petty Cash",
    balance: 9000,
    status: "healthy",
    connected: false,
  },
];

export function MoneyBankAccounts({
  accounts = DEFAULT_ACCOUNTS,
  onSelect,
  className,
}: MoneyBankAccountsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Accounts
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {accounts.length} accounts
        </span>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect?.(account.id)}
            onMouseEnter={() => setHoveredId(account.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:shadow-sm",
              account.status === "healthy" && "border-balanced-green/10",
              account.status === "warning" &&
                "border-attention-amber/20 bg-attention-amber/[0.02]",
              account.status === "critical" &&
                "border-error-clay/20 bg-error-clay/[0.02]",
            )}
          >
            {/* Status dot */}
            <div
              className={cn(
                "absolute left-0 top-3 bottom-3 w-0.5 rounded-full",
                account.status === "healthy" && "bg-balanced-green",
                account.status === "warning" && "bg-attention-amber",
                account.status === "critical" && "bg-error-clay",
              )}
            />

            <div className="pl-3 flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground/80">
                  {account.name}
                </span>
                {account.connected ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <AlertTriangle className="h-3 w-3" />
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(account.balance)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                    account.status === "healthy" &&
                      "bg-balanced-green/10 text-balanced-green",
                    account.status === "warning" &&
                      "bg-attention-amber/10 text-attention-amber",
                    account.status === "critical" &&
                      "bg-error-clay/10 text-error-clay",
                  )}
                >
                  <div
                    className={cn(
                      "h-1 w-1 rounded-full",
                      account.status === "healthy" && "bg-balanced-green",
                      account.status === "warning" && "bg-attention-amber",
                      account.status === "critical" && "bg-error-clay",
                    )}
                  />
                  {account.status === "healthy"
                    ? "Healthy"
                    : account.status === "warning"
                      ? "Attention"
                      : "Critical"}
                </span>
                {account.note && (
                  <span className="text-[10px] text-attention-amber/80">
                    {account.note}
                  </span>
                )}
              </div>
            </div>

            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                hoveredId === account.id
                  ? "bg-muted/50 opacity-100"
                  : "opacity-0",
              )}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
