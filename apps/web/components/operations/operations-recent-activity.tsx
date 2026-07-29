"use client";

import { cn } from "@/lib/utils";
import {
  Clock,
  Users,
  Receipt,
  Package,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

type Entry = {
  id: string;
  time: string;
  action: string;
  detail: string;
  type: string;
};

type OperationsRecentActivityProps = {
  entries?: Entry[];
  className?: string;
};

const ENTRY_ICONS: Record<string, typeof Clock> = {
  payroll: Users,
  expense: Receipt,
  inventory: Package,
  asset: CheckCircle2,
  travel: DollarSign,
};

const ENTRY_COLORS: Record<string, string> = {
  payroll: "text-signal-indigo bg-signal-indigo/10",
  expense: "text-attention-amber bg-attention-amber/10",
  inventory: "text-balanced-green bg-balanced-green/10",
  asset: "text-cyan-500 bg-cyan-500/10",
  travel: "text-purple-500 bg-purple-500/10",
};

const DEFAULT_ENTRIES: Entry[] = [
  {
    id: "ra1",
    time: "09:10",
    action: "Payroll Updated",
    detail: "June payroll calculated for 148 employees",
    type: "payroll",
  },
  {
    id: "ra2",
    time: "09:45",
    action: "Expense Approved",
    detail: "Marketing campaign expenses ($12,400) approved",
    type: "expense",
  },
  {
    id: "ra3",
    time: "10:18",
    action: "Inventory Reordered",
    detail: "Product X reorder triggered — 500 units",
    type: "inventory",
  },
  {
    id: "ra4",
    time: "11:30",
    action: "Asset Assigned",
    detail: "MacBook Pro assigned to new engineer",
    type: "asset",
  },
  {
    id: "ra5",
    time: "12:05",
    action: "Travel Claim Approved",
    detail: "Sales team travel expenses for Q3 trip",
    type: "travel",
  },
];

export function OperationsRecentActivity({
  entries = DEFAULT_ENTRIES,
  className,
}: OperationsRecentActivityProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Recent Activity
        </h3>
      </div>

      <div className="relative space-y-0">
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-muted/40" />
        {entries.map((entry) => {
          const Icon = ENTRY_ICONS[entry.type] || Clock;
          const colorClass =
            ENTRY_COLORS[entry.type] || "text-muted-foreground bg-muted/30";
          return (
            <div
              key={entry.id}
              className="relative flex items-start gap-3 pb-4 pl-0"
            >
              <div
                className={cn(
                  "relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full",
                  colorClass,
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground/80">
                    {entry.action}
                  </p>
                  <span className="text-[10px] font-medium text-muted-foreground/50 shrink-0 ml-2">
                    {entry.time}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {entry.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
