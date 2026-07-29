"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  Eye,
  Download,
  Send,
  CreditCard,
  MessageSquare,
} from "lucide-react";

type Entry = {
  id: string;
  time: string;
  action: string;
  detail: string;
  type: string;
  customer: string;
};

type RevenueCustomerTimelineProps = {
  entries?: Entry[];
  className?: string;
};

const ENTRY_ICONS: Record<string, typeof Clock> = {
  viewed: Eye,
  downloaded: Download,
  sent: Send,
  paid: CreditCard,
  contacted: MessageSquare,
};

const ENTRY_COLORS: Record<string, string> = {
  viewed: "text-cyan-500 bg-cyan-500/10",
  downloaded: "text-signal-indigo bg-signal-indigo/10",
  sent: "text-attention-amber bg-attention-amber/10",
  paid: "text-balanced-green bg-balanced-green/10",
  contacted: "text-purple-500 bg-purple-500/10",
};

const DEFAULT_ENTRIES: Entry[] = [
  {
    id: "ct1",
    time: "09:42",
    action: "Opened Invoice",
    detail: "INV-1041 viewed online",
    type: "viewed",
    customer: "BlueWave Ltd",
  },
  {
    id: "ct2",
    time: "10:15",
    action: "Downloaded PDF",
    detail: "Invoice PDF downloaded from portal",
    type: "downloaded",
    customer: "BlueWave Ltd",
  },
  {
    id: "ct3",
    time: "11:08",
    action: "Reminder Sent",
    detail: "Automatic reminder delivered via email",
    type: "sent",
    customer: "BlueWave Ltd",
  },
  {
    id: "ct4",
    time: "Tomorrow",
    action: "Expected Payment",
    detail: "Predicted based on historical pattern",
    type: "paid",
    customer: "BlueWave Ltd",
  },
  {
    id: "ct5",
    time: "Yesterday",
    action: "Payment Received",
    detail: "INV-1022 — $18,000 cleared",
    type: "paid",
    customer: "Acme Holdings",
  },
];

export function RevenueCustomerTimeline({
  entries = DEFAULT_ENTRIES,
  className,
}: RevenueCustomerTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Customer Activity
        </h3>
      </div>

      {/* Customer name filter chips */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {["All", "BlueWave Ltd", "Acme Holdings"].map((name) => (
          <button
            key={name}
            type="button"
            className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>

      {/* Timeline */}
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
                  {entry.customer}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
