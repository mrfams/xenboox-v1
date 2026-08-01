"use client";

import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  ChevronRight,
} from "lucide-react";

type ApprovalItem = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  status: "pending" | "review";
  icon: typeof Clock;
  iconColor: string;
  iconBg: string;
};

type PendingApprovalsProps = {
  className?: string;
};

export function PendingApprovals({ className }: PendingApprovalsProps) {
  const items: ApprovalItem[] = [
    {
      id: "1",
      title: "Payroll July 2025",
      subtitle: "24 employees",
      amount: "GMD 78,450",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "2",
      title: "Payment to Office Rent",
      subtitle: "Rent for August",
      amount: "GMD 15,000",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "3",
      title: "Journal Entry #JE-2025-124",
      subtitle: "Depreciation Expense",
      amount: "GMD 4,250",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "4",
      title: "VAT Return July 2025",
      subtitle: "VAT payable GMD 9,850",
      amount: "GMD 9,850",
      status: "review",
      icon: AlertCircle,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
    },
    {
      id: "5",
      title: "AI Correction",
      subtitle: "Uncategorized expense",
      amount: "GMD 2,300",
      status: "review",
      icon: Bot,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#6366F1]/10",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Pending Approvals
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Your attention is required
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  item.iconBg,
                )}
              >
                <Icon className={cn("h-4 w-4", item.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                {item.amount}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  Review
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
      >
        View all approvals
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
