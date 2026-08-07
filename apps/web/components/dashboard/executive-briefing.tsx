"use client";

import {
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  AlertTriangle,
  Shield,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

type BriefingItem = {
  id: string;
  icon: typeof TrendingUp;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  detail: string;
  status: "positive" | "warning" | "negative" | "neutral";
  statusLabel: string;
};

type ExecutiveBriefingProps = {
  className?: string;
};

const STATUS_COLORS: Record<string, string> = {
  positive: "text-balanced-green",
  warning: "text-attention-amber",
  negative: "text-error-clay",
  neutral: "text-muted-foreground",
};

function BriefingCard({ item }: { item: BriefingItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-md hover:border-border/80 min-w-[200px]">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          item.iconBg,
        )}
      >
        <item.icon className={cn("h-5 w-5", item.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {item.title}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">
          {item.value}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {item.detail}
        </p>
      </div>
      <span
        className={cn(
          "text-[10px] font-medium whitespace-nowrap",
          STATUS_COLORS[item.status],
        )}
      >
        {item.statusLabel}
      </span>
    </div>
  );
}

export function ExecutiveBriefing({ className }: ExecutiveBriefingProps) {
  const items: BriefingItem[] = [
    {
      id: "1",
      icon: TrendingUp,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
      title: "Revenue is up 8%",
      value: "GMD 1,234,567",
      detail: "vs last month",
      status: "positive",
      statusLabel: "Strong performance",
    },
    {
      id: "2",
      icon: DollarSign,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
      title: "Cash position is healthy",
      value: "GMD 1,234,567",
      detail: "12% above last month",
      status: "positive",
      statusLabel: "+12% above last month",
    },
    {
      id: "3",
      icon: Clock,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
      title: "Payroll due in 3 days",
      value: "For 24 employees",
      detail: "Jul 31, 2025",
      status: "warning",
      statusLabel: "Review draft",
    },
    {
      id: "4",
      icon: FileText,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#6366F1]/10",
      title: "VAT return ready",
      value: "For July 2025",
      detail: "Due Aug 15",
      status: "neutral",
      statusLabel: "Ready for review",
    },
    {
      id: "5",
      icon: AlertTriangle,
      iconColor: "text-error-clay",
      iconBg: "bg-error-clay-bg",
      title: "2 invoices overdue",
      value: "Totalling GMD 5,600",
      detail: "Overdue by 30+ days",
      status: "negative",
      statusLabel: "Follow up required",
    },
    {
      id: "6",
      icon: Shield,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
      title: "1 suspicious transaction",
      value: "Needs your review",
      detail: "Flagged by AI",
      status: "warning",
      statusLabel: "Review now",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Executive Briefing
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-medium text-[#6366F1]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
            AI generated
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
        >
          View all insights
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <BriefingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
