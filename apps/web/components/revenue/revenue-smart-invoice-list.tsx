"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { FileText, Brain, ChevronDown, ChevronUp } from "lucide-react";

type InvoiceItem = {
  id: string;
  number: string;
  customer: string;
  amount: number;
  due: string;
  aiStatus: string;
  statusColor: string;
};

type RevenueSmartInvoiceListProps = {
  invoices?: InvoiceItem[];
  className?: string;
};

const DEFAULT_INVOICES: InvoiceItem[] = [
  {
    id: "inv1",
    number: "INV-1024",
    customer: "Acme Holdings",
    amount: 18000,
    due: "Tomorrow",
    aiStatus: "Likely to Pay",
    statusColor: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "inv2",
    number: "INV-1056",
    customer: "Nova Tech",
    amount: 7800,
    due: "5 Days Late",
    aiStatus: "Needs Follow-up",
    statusColor: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "inv3",
    number: "INV-1041",
    customer: "BlueWave Ltd",
    amount: 12300,
    due: "Due Today",
    aiStatus: "Reminder Recommended",
    statusColor: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "inv4",
    number: "INV-1038",
    customer: "Global Logistics",
    amount: 35000,
    due: "Next Week",
    aiStatus: "On Track",
    statusColor: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "inv5",
    number: "INV-1002",
    customer: "Metro Group",
    amount: 12000,
    due: "67 Days Overdue",
    aiStatus: "Escalate Recommended",
    statusColor: "text-error-clay bg-error-clay/10",
  },
  {
    id: "inv6",
    number: "INV-1051",
    customer: "Prime Services",
    amount: 5600,
    due: "In 2 days",
    aiStatus: "Likely to Pay",
    statusColor: "text-balanced-green bg-balanced-green/10",
  },
];

export function RevenueSmartInvoiceList({
  invoices = DEFAULT_INVOICES,
  className,
}: RevenueSmartInvoiceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Active Invoices
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {invoices.length} invoices
        </span>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-6 gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20 rounded-lg">
        <span>Invoice</span>
        <span>Customer</span>
        <span className="text-right">Amount</span>
        <span>Due</span>
        <span className="col-span-2">AI Status</span>
      </div>

      <div className="space-y-1">
        {invoices.map((inv) => {
          const isExpanded = expandedId === inv.id;
          return (
            <div key={inv.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                className={cn(
                  "grid w-full grid-cols-1 sm:grid-cols-6 items-center gap-2 rounded-lg px-3 py-3 text-left transition-all hover:bg-muted/30",
                  isExpanded && "bg-muted/20 rounded-b-none",
                )}
              >
                <span className="text-xs font-medium text-foreground/80">
                  {inv.number}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {inv.customer}
                </span>
                <span className="text-xs font-bold tabular-nums sm:text-right">
                  {formatCurrency(inv.amount)}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {inv.due}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium col-span-1 sm:col-span-1",
                    inv.statusColor,
                  )}
                >
                  <Brain className="h-2.5 w-2.5" />
                  {inv.aiStatus}
                </span>
                <div className="hidden sm:flex justify-end">
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/30" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-signal-indigo" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI Analysis
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    {inv.customer} has{" "}
                    {inv.aiStatus === "Likely to Pay"
                      ? "a strong payment history with consistent on-time payments. No action needed."
                      : inv.aiStatus === "Needs Follow-up"
                        ? "a history of late payments averaging 9 days. Recommend sending a reminder today."
                        : inv.aiStatus === "Reminder Recommended"
                          ? "been invoiced $12,300 due today. Based on their payment pattern, a reminder would increase likelihood of on-time payment by 40%."
                          : inv.aiStatus === "Escalate Recommended"
                            ? "an outstanding balance of $12,000 that is 67 days overdue. Recommend escalation to collections."
                            : "a consistent payment record. Payment expected within standard terms."}
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
