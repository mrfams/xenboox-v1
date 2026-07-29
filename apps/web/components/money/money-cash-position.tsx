"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
  PiggyBank,
  Smartphone,
  Wallet,
  Lock,
  Eye,
  ChevronRight,
} from "lucide-react";

type CashBucket = {
  id: string;
  label: string;
  amount: number;
  icon: typeof Building2;
  color: string;
  bgColor: string;
  detail?: string;
};

type MoneyCashPositionProps = {
  buckets?: CashBucket[];
  total?: number;
  className?: string;
};

const DEFAULT_BUCKETS: CashBucket[] = [
  {
    id: "operating",
    label: "Operating Accounts",
    amount: 842000,
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    detail: "GTBank, Zenith, Access",
  },
  {
    id: "savings",
    label: "Savings",
    amount: 510000,
    icon: PiggyBank,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    detail: "Fixed deposit, Money market",
  },
  {
    id: "mobile",
    label: "Mobile Money",
    amount: 61000,
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    detail: "MTN, Orange, Wave",
  },
  {
    id: "petty",
    label: "Petty Cash",
    amount: 9000,
    icon: Wallet,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    detail: "Office floats",
  },
  {
    id: "restricted",
    label: "Restricted Cash",
    amount: 420340,
    icon: Lock,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    detail: "Reserves, escrow",
  },
];

export function MoneyCashPosition({
  buckets = DEFAULT_BUCKETS,
  className,
}: MoneyCashPositionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const total = useMemo(
    () => buckets.reduce((s, b) => s + b.amount, 0),
    [buckets],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Cash Position
          </h3>
        </div>
        <span className="text-xs text-muted-foreground/60 tabular-nums">
          {buckets.length} accounts
        </span>
      </div>

      {/* Visual bar */}
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-lg bg-muted/30">
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            className={cn(
              "h-full transition-all duration-500 cursor-pointer hover:opacity-80",
              bucket.id === "operating" && "bg-blue-500",
              bucket.id === "savings" && "bg-emerald-500",
              bucket.id === "mobile" && "bg-purple-500",
              bucket.id === "petty" && "bg-amber-500",
              bucket.id === "restricted" && "bg-rose-400",
            )}
            style={{ width: `${(bucket.amount / total) * 100}%` }}
            title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
          />
        ))}
      </div>

      {/* Bucket list */}
      <div className="space-y-1">
        {buckets.map((bucket) => {
          const Icon = bucket.icon;
          const isExpanded = expandedId === bucket.id;
          const percentage = (bucket.amount / total) * 100;

          return (
            <div key={bucket.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : bucket.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted/30",
                  isExpanded && "bg-muted/20 rounded-b-none",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    bucket.bgColor,
                  )}
                >
                  <Icon className={cn("h-4 w-4", bucket.color)} />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground/80">
                    {bucket.label}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">
                    {percentage.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground/50">
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground/30 transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
              </button>

              {isExpanded && bucket.detail && (
                <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-2 text-xs text-muted-foreground/60">
                  <p className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    {bucket.detail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
