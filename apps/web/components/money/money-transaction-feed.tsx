"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowRightLeft, Brain } from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  direction: "inflow" | "outflow";
  description: string;
  status: "matched" | "pending_match" | "scheduled" | "flagged";
  date: string;
  time: string;
  category: string;
};

type MoneyTransactionFeedProps = {
  transactions?: Transaction[];
  className?: string;
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    amount: 8400,
    direction: "inflow",
    description: "Customer Payment — Basiq Trading",
    status: "matched",
    date: "Today",
    time: "10:32 AM",
    category: "Receivables",
  },
  {
    id: "tx2",
    amount: 3200,
    direction: "outflow",
    description: "Office Rent — June",
    status: "matched",
    date: "Today",
    time: "09:15 AM",
    category: "Rent",
  },
  {
    id: "tx3",
    amount: 41000,
    direction: "outflow",
    description: "Payroll — 5 employees",
    status: "scheduled",
    date: "Today",
    time: "Scheduled",
    category: "Payroll",
  },
  {
    id: "tx4",
    amount: 12000,
    direction: "inflow",
    description: "Invoice Payment — Customer #1042",
    status: "pending_match",
    date: "Yesterday",
    time: "04:20 PM",
    category: "Receivables",
  },
  {
    id: "tx5",
    amount: 2800,
    direction: "outflow",
    description: "Internet & Phone Services",
    status: "matched",
    date: "Yesterday",
    time: "02:00 PM",
    category: "Utilities",
  },
  {
    id: "tx6",
    amount: 15000,
    direction: "outflow",
    description: "Supplier Payment — Office Supplies",
    status: "flagged",
    date: "Yesterday",
    time: "11:45 AM",
    category: "Supplies",
  },
];

const STATUS_COLORS = {
  matched: {
    dot: "bg-balanced-green",
    bg: "bg-balanced-green/10",
    text: "text-balanced-green",
    label: "Matched",
  },
  pending_match: {
    dot: "bg-attention-amber",
    bg: "bg-attention-amber/10",
    text: "text-attention-amber",
    label: "Pending Match",
  },
  scheduled: {
    dot: "bg-signal-indigo",
    bg: "bg-signal-indigo/10",
    text: "text-signal-indigo",
    label: "Scheduled",
  },
  flagged: {
    dot: "bg-error-clay",
    bg: "bg-error-clay/10",
    text: "text-error-clay",
    label: "Flagged",
  },
};

export function MoneyTransactionFeed({
  transactions = DEFAULT_TRANSACTIONS,
  className,
}: MoneyTransactionFeedProps) {
  const [explainingId, setExplainingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: { date: string; txs: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();
    transactions.forEach((tx) => {
      const existing = dateMap.get(tx.date) ?? [];
      existing.push(tx);
      dateMap.set(tx.date, existing);
    });
    dateMap.forEach((txs, date) => {
      groups.push({ date, txs });
    });
    return groups;
  }, [transactions]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Recent Transactions
        </h3>
      </div>

      {grouped.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              {group.date}
            </span>
            <div className="h-px flex-1 bg-muted/30" />
          </div>

          <div className="space-y-0.5">
            {group.txs.map((tx) => {
              const isExplaining = explainingId === tx.id;
              const status = STATUS_COLORS[tx.status];

              return (
                <div key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setExplainingId(isExplaining ? null : tx.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/30",
                      isExplaining && "bg-muted/20 rounded-b-none",
                    )}
                  >
                    {/* Direction icon */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        tx.direction === "inflow"
                          ? "bg-balanced-green/10"
                          : "bg-error-clay/10",
                      )}
                    >
                      {tx.direction === "inflow" ? (
                        <ArrowDown className="h-4 w-4 text-balanced-green" />
                      ) : (
                        <ArrowUp className="h-4 w-4 text-error-clay" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground/80 truncate">
                          {tx.description}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium",
                            status.bg,
                            status.text,
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/50">
                          {tx.time}
                        </span>
                        <span className="text-[10px] text-muted-foreground/30">
                          ·
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {tx.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        tx.direction === "inflow"
                          ? "text-balanced-green"
                          : "text-error-clay",
                      )}
                    >
                      {tx.direction === "inflow" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </button>

                  {/* AI Explain panel */}
                  {isExplaining && (
                    <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Brain className="h-3 w-3 text-signal-indigo" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          AI Explanation
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                        {tx.direction === "inflow"
                          ? `This ${tx.amount >= 10000 ? "large " : ""}payment matches invoice #${tx.id.slice(-4)} from ${tx.description.split(" — ")[1] || "the customer"}. Categorized under ${tx.category.toLowerCase()} based on the payment reference.`
                          : `This ${tx.description.toLowerCase()} has been matched to the corresponding ${tx.category.toLowerCase()} budget line. ${tx.status === "flagged" ? "It was flagged because the amount exceeds the category average by 35%." : ""}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
