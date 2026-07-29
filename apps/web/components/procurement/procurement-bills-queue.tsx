"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { FileText, Brain, ChevronDown, ChevronUp } from "lucide-react";

type BillItem = {
  id: string;
  number: string;
  supplier: string;
  amount: number;
  due: string;
  aiRecommendation: string;
  recColor: string;
};

type ProcurementBillsQueueProps = {
  bills?: BillItem[];
  className?: string;
};

const DEFAULT_BILLS: BillItem[] = [
  {
    id: "bl1",
    number: "B-2034",
    supplier: "Microsoft",
    amount: 12300,
    due: "Tomorrow",
    aiRecommendation: "Pay Today",
    recColor: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "bl2",
    number: "B-2088",
    supplier: "Office Depot",
    amount: 2100,
    due: "Today",
    aiRecommendation: "Delay 5 Days",
    recColor: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "bl3",
    number: "B-2102",
    supplier: "ABC Manufacturing",
    amount: 28900,
    due: "Friday",
    aiRecommendation: "Negotiate Price",
    recColor: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "bl4",
    number: "B-2091",
    supplier: "Global Logistics",
    amount: 45000,
    due: "Next Week",
    aiRecommendation: "Schedule Payment",
    recColor: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "bl5",
    number: "B-2076",
    supplier: "Prime Suppliers",
    amount: 5600,
    due: "In 3 days",
    aiRecommendation: "Pay on Due Date",
    recColor: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "bl6",
    number: "B-2105",
    supplier: "OfficeMax",
    amount: 3200,
    due: "Overdue",
    aiRecommendation: "Pay Immediately",
    recColor: "text-error-clay bg-error-clay/10",
  },
];

export function ProcurementBillsQueue({
  bills = DEFAULT_BILLS,
  className,
}: ProcurementBillsQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Bills Queue
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {bills.length} bills
        </span>
      </div>

      <div className="hidden sm:grid grid-cols-6 gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20 rounded-lg">
        <span>Bill</span>
        <span>Supplier</span>
        <span className="text-right">Amount</span>
        <span>Due</span>
        <span className="col-span-2">AI Recommendation</span>
      </div>

      <div className="space-y-1">
        {bills.map((bill) => {
          const isExpanded = expandedId === bill.id;
          return (
            <div key={bill.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                className={cn(
                  "grid w-full grid-cols-1 sm:grid-cols-6 items-center gap-2 rounded-lg px-3 py-3 text-left transition-all hover:bg-muted/30",
                  isExpanded && "bg-muted/20 rounded-b-none",
                )}
              >
                <span className="text-xs font-medium text-foreground/80">
                  {bill.number}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {bill.supplier}
                </span>
                <span className="text-xs font-bold tabular-nums sm:text-right">
                  {formatCurrency(bill.amount)}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {bill.due}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium col-span-1 sm:col-span-1",
                    bill.recColor,
                  )}
                >
                  <Brain className="h-2.5 w-2.5" />
                  {bill.aiRecommendation}
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
                    {bill.supplier} invoice {bill.number} for{" "}
                    {formatCurrency(bill.amount)} is {bill.due.toLowerCase()}.
                    {bill.aiRecommendation === "Pay Today"
                      ? ` Paying today captures a 2% early payment discount saving ${formatCurrency(bill.amount * 0.02)}.`
                      : bill.aiRecommendation === "Delay 5 Days"
                        ? ` This can be safely delayed 5 days without penalty, helping optimize cash flow.`
                        : bill.aiRecommendation === "Negotiate Price"
                          ? ` This supplier has increased prices by 11%. Recommend negotiating before processing.`
                          : bill.aiRecommendation === "Pay Immediately"
                            ? ` This bill is overdue. Pay now to maintain supplier relationship and avoid service disruption.`
                            : ` Schedule payment for the due date to optimize cash flow.`}
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
