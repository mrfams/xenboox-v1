"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Database,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  CreditCard,
  Users,
  PieChart,
  ShieldCheck,
  Building2,
} from "lucide-react";

type DataSource = {
  id: string;
  label: string;
  icon: typeof Database;
  color: string;
  used: boolean;
  summary?: string;
};

type CFOContextPanelProps = {
  confidence?: number;
  updatedAt?: string;
  sources?: DataSource[];
  className?: string;
};

const DEFAULT_SOURCES: DataSource[] = [
  {
    id: "bank",
    label: "12 months bank history",
    icon: Building2,
    color: "text-blue-500",
    used: true,
  },
  {
    id: "invoices",
    label: "248 invoices",
    icon: FileText,
    color: "text-emerald-500",
    used: true,
  },
  {
    id: "payroll",
    label: "Payroll data",
    icon: Users,
    color: "text-purple-500",
    used: true,
  },
  {
    id: "budget",
    label: "Budget vs actuals",
    icon: PieChart,
    color: "text-amber-500",
    used: true,
  },
  {
    id: "pnl",
    label: "Profit & Loss",
    icon: TrendingUp,
    color: "text-signal-indigo",
    used: true,
  },
  {
    id: "bs",
    label: "Balance Sheet",
    icon: Database,
    color: "text-cyan-500",
    used: true,
  },
  {
    id: "cf",
    label: "Cash Flow Statement",
    icon: CreditCard,
    color: "text-balanced-green",
    used: true,
  },
  {
    id: "tax",
    label: "Tax position",
    icon: ShieldCheck,
    color: "text-rose-500",
    used: true,
  },
];

export function CFOContextPanel({
  confidence = 0.96,
  updatedAt,
  sources = DEFAULT_SOURCES,
  className,
}: CFOContextPanelProps) {
  const usedCount = useMemo(
    () => sources.filter((s) => s.used).length,
    [sources],
  );
  const timeAgo = useMemo(() => {
    if (!updatedAt) return "2 minutes ago";
    return updatedAt;
  }, [updatedAt]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Context Used
        </h3>
      </div>

      {/* Data Sources */}
      <div className="space-y-1">
        {sources.map((source) => (
          <div
            key={source.id}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all",
              source.used ? "bg-muted/30" : "opacity-40",
            )}
          >
            {source.used ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-balanced-green" />
            ) : (
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
            )}
            <source.icon className={cn("h-3.5 w-3.5 shrink-0", source.color)} />
            <span
              className={cn(
                "text-xs",
                source.used ? "text-foreground/80" : "text-muted-foreground/50",
              )}
            >
              {source.label}
            </span>
          </div>
        ))}
      </div>

      {/* Confidence Score */}
      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Confidence
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              confidence >= 0.9
                ? "text-balanced-green"
                : confidence >= 0.7
                  ? "text-attention-amber"
                  : "text-error-clay",
            )}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              confidence >= 0.9
                ? "bg-balanced-green"
                : confidence >= 0.7
                  ? "bg-attention-amber"
                  : "bg-error-clay",
            )}
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          <span>Updated {timeAgo}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="text-[10px] text-muted-foreground/50 px-1 leading-relaxed">
        This analysis is based on{" "}
        <span className="font-medium text-foreground/60">{usedCount}</span> of{" "}
        <span className="font-medium text-foreground/60">{sources.length}</span>{" "}
        available data sources.
        {confidence >= 0.9
          ? " High confidence — data is current and consistent."
          : " Moderate confidence — some data may be stale."}
      </div>
    </div>
  );
}
