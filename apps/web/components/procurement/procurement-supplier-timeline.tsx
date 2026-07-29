"use client";

import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  MessageSquare,
} from "lucide-react";

type Entry = {
  id: string;
  time: string;
  action: string;
  detail: string;
  type: string;
  supplier: string;
};

type ProcurementSupplierTimelineProps = {
  entries?: Entry[];
  className?: string;
};

const ENTRY_ICONS: Record<string, typeof Clock> = {
  approved: CheckCircle2,
  invoiced: FileText,
  paid: DollarSign,
  discounted: DollarSign,
  contacted: MessageSquare,
};

const ENTRY_COLORS: Record<string, string> = {
  approved: "text-balanced-green bg-balanced-green/10",
  invoiced: "text-signal-indigo bg-signal-indigo/10",
  paid: "text-cyan-500 bg-cyan-500/10",
  discounted: "text-attention-amber bg-attention-amber/10",
  contacted: "text-purple-500 bg-purple-500/10",
};

const DEFAULT_ENTRIES: Entry[] = [
  {
    id: "st1",
    time: "09:30",
    action: "Purchase Order Approved",
    detail: "PO-2041 for manufacturing equipment",
    type: "approved",
    supplier: "Global Logistics",
  },
  {
    id: "st2",
    time: "10:15",
    action: "Invoice Received",
    detail: "B-2102 for $28,900",
    type: "invoiced",
    supplier: "ABC Manufacturing",
  },
  {
    id: "st3",
    time: "11:45",
    action: "Discount Available",
    detail: "2% early payment discount on B-2034",
    type: "discounted",
    supplier: "Microsoft",
  },
  {
    id: "st4",
    time: "Tomorrow",
    action: "Payment Scheduled",
    detail: "B-2034 — $12,300 due",
    type: "paid",
    supplier: "Microsoft",
  },
  {
    id: "st5",
    time: "Yesterday",
    action: "Payment Sent",
    detail: "B-2018 — $18,000 cleared",
    type: "paid",
    supplier: "Global Logistics",
  },
];

export function ProcurementSupplierTimeline({
  entries = DEFAULT_ENTRIES,
  className,
}: ProcurementSupplierTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Supplier Activity
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        {["All", "Global Logistics", "Microsoft", "ABC Manufacturing"].map(
          (name) => (
            <button
              key={name}
              type="button"
              className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {name}
            </button>
          ),
        )}
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
                <span className="text-[10px] text-signal-indigo/70">
                  {entry.supplier}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
