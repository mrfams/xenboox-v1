"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

type EventStatus = "upcoming" | "due_soon" | "overdue" | "completed";

type FinancialEvent = {
  id: string;
  label: string;
  date: Date;
  status: EventStatus;
  amount?: string;
};

type UpcomingEventsProps = {
  events: FinancialEvent[];
  className?: string;
};

const STATUS_STYLES: Record<
  EventStatus,
  {
    icon: typeof Calendar;
    dot: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  upcoming: {
    icon: Calendar,
    dot: "bg-muted-foreground/40",
    bg: "bg-muted/20",
    text: "text-muted-foreground",
    border: "border-muted/20",
  },
  due_soon: {
    icon: Clock,
    dot: "bg-attention-amber",
    bg: "bg-attention-amber-bg",
    text: "text-attention-amber",
    border: "border-attention-amber/20",
  },
  overdue: {
    icon: AlertTriangle,
    dot: "bg-error-clay",
    bg: "bg-error-clay-bg",
    text: "text-error-clay",
    border: "border-error-clay/20",
  },
  completed: {
    icon: CheckCircle2,
    dot: "bg-balanced-green",
    bg: "bg-balanced-green-bg",
    text: "text-balanced-green",
    border: "border-balanced-green/20",
  },
};

function EventRow({ event }: { event: FinancialEvent }) {
  const styles = STATUS_STYLES[event.status];
  const Icon = styles.icon;
  const daysUntil = useMemo(() => {
    if (event.status === "completed") return null;
    const diff = Math.ceil(
      (event.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${diff} days`;
  }, [event.date, event.status]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200",
        styles.border,
        styles.bg,
        event.status === "due_soon" && "hover:shadow-sm",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", styles.text)} />

      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium", styles.text)}>{event.label}</p>
        {event.amount && (
          <p className="text-[10px] text-muted-foreground/60">{event.amount}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {daysUntil && (
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              event.status === "overdue" && "text-error-clay",
              event.status === "due_soon" && "text-attention-amber",
              event.status === "upcoming" && "text-muted-foreground",
            )}
          >
            {daysUntil}
          </span>
        )}
        {event.status === "completed" && (
          <span className="text-[10px] text-balanced-green">Done</span>
        )}
      </div>
    </div>
  );
}

export function UpcomingEvents({ events, className }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h2 className="text-sm font-semibold text-foreground">
          Upcoming Financial Events
        </h2>
        <div className="rounded-xl border border-dashed py-6 text-center">
          <p className="text-xs text-muted-foreground">No upcoming events</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-sm font-semibold text-foreground">
        Upcoming Financial Events
      </h2>

      <div className="space-y-1.5">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

// ─── Default Events Factory ──────────────────────────────────────────────

export function createDefaultEvents(): FinancialEvent[] {
  const now = new Date();
  return [
    {
      id: "event-1",
      label: "VAT Filing Due",
      date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      status: "due_soon",
      amount: "GMD 106,902 estimated",
    },
    {
      id: "event-2",
      label: "Payroll Run",
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: "due_soon",
      amount: "GMD 147,050",
    },
    {
      id: "event-3",
      label: "Loan Repayment",
      date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      status: "upcoming",
      amount: "GMD 12,500",
    },
    {
      id: "event-4",
      label: "Subscription Renewal",
      date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      status: "due_soon",
      amount: "GMD 2,400",
    },
    {
      id: "event-5",
      label: "Corporate Tax Filing",
      date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: "upcoming",
    },
  ];
}
