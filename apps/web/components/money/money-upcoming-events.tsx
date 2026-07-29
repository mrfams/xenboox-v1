"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { CalendarClock, ArrowRight } from "lucide-react";

type CashEvent = {
  id: string;
  label: string;
  amount: number;
  day: string;
  relativeDay: string;
  type: "inflow" | "outflow";
};

type MoneyUpcomingEventsProps = {
  events?: CashEvent[];
  className?: string;
};

const DEFAULT_EVENTS: CashEvent[] = [
  {
    id: "e1",
    label: "Payroll",
    amount: 81000,
    day: "Tomorrow",
    relativeDay: "1 day",
    type: "outflow",
  },
  {
    id: "e2",
    label: "Supplier Payments",
    amount: 42000,
    day: "Wednesday",
    relativeDay: "3 days",
    type: "outflow",
  },
  {
    id: "e3",
    label: "VAT Payment",
    amount: 18000,
    day: "Friday",
    relativeDay: "5 days",
    type: "outflow",
  },
  {
    id: "e4",
    label: "Customer Receipts",
    amount: 145000,
    day: "Next Week",
    relativeDay: "8 days",
    type: "inflow",
  },
  {
    id: "e5",
    label: "Loan Payment",
    amount: 12000,
    day: "Jun 30",
    relativeDay: "12 days",
    type: "outflow",
  },
];

export function MoneyUpcomingEvents({
  events = DEFAULT_EVENTS,
  className,
}: MoneyUpcomingEventsProps) {
  const netImpact = useMemo(
    () =>
      events.reduce(
        (s, e) => s + (e.type === "inflow" ? e.amount : -e.amount),
        0,
      ),
    [events],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Upcoming Cash Events
          </h3>
        </div>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            netImpact >= 0 ? "text-balanced-green" : "text-attention-amber",
          )}
        >
          Net: {netImpact >= 0 ? "+" : ""}
          {formatCurrency(netImpact)}
        </span>
      </div>

      <div className="space-y-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted/30"
          >
            {/* Day badge */}
            <div className="flex w-16 shrink-0 flex-col items-center">
              <span className="text-[10px] font-semibold text-foreground/80">
                {event.day}
              </span>
              <span className="text-[8px] text-muted-foreground/50">
                {event.relativeDay}
              </span>
            </div>

            {/* Arrow */}
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                event.type === "inflow"
                  ? "bg-balanced-green/10 text-balanced-green"
                  : "bg-error-clay/10 text-error-clay",
              )}
            >
              <ArrowRight
                className={cn(
                  "h-3 w-3",
                  event.type === "inflow" ? "" : "rotate-180",
                )}
              />
            </div>

            {/* Label */}
            <span className="flex-1 text-xs text-foreground/80">
              {event.label}
            </span>

            {/* Amount */}
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                event.type === "inflow"
                  ? "text-balanced-green"
                  : "text-error-clay",
              )}
            >
              {event.type === "inflow" ? "+" : "-"}
              {formatCurrency(event.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
