"use client";

import { cn } from "@/lib/utils";
import { FileText, Brain, CheckCircle2 } from "lucide-react";

export function KnowledgeDocumentIntelligence() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Document Intelligence</h3>
      </div>

      <div className="p-4">
        {/* Document card */}
        <div className="rounded-lg border bg-accent/30 p-3.5 mb-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium">Microsoft Invoice #INV-8821</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paid on August 12, 2026
              </p>
            </div>
            <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-medium text-balanced-green">
              Extracted
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Amount", value: "$12,400" },
              { label: "Supplier", value: "Microsoft" },
              { label: "Category", value: "Software" },
              { label: "Status", value: "Paid" },
              { label: "Approved By", value: "Sarah" },
              { label: "Budget Impact", value: "Within budget" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {item.label}:
                </span>
                <span className="text-[10px] font-medium text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* AI Understanding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-signal-indigo" />
              <span className="text-[10px] text-muted-foreground">
                AI Understanding
              </span>
            </div>
            <span className="text-[10px] font-bold tabular-nums text-balanced-green">
              98%
            </span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-balanced-green"
              style={{ width: "98%" }}
            />
          </div>
        </div>

        {/* AI Processing Queue */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            AI Processing Queue
          </p>
          {[
            { text: "Extracted 84 invoices", done: true },
            { text: "Categorized expenses", done: true },
            { text: "Matched receipts", done: true },
            { text: "Updated supplier records", done: true },
            { text: "Detected duplicate documents", done: true },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2
                className={cn(
                  "h-3 w-3 shrink-0",
                  item.done
                    ? "text-balanced-green"
                    : "text-muted-foreground/30",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  item.done ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Processing:{" "}
          <span className="font-medium text-attention-amber">12 remaining</span>
        </div>
      </div>
    </div>
  );
}
