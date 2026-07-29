"use client";

import { cn } from "@/lib/utils";
import { Database, ArrowRight } from "lucide-react";

export function KnowledgeCompanyMemory() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Company Memory</h3>
      </div>
      <div className="p-4">
        <p className="text-[10px] text-muted-foreground mb-3">
          What Xenboox knows about your company
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Customers",
              value: 482,
              color: "text-signal-indigo bg-signal-indigo/10",
            },
            {
              label: "Suppliers",
              value: 126,
              color: "text-balanced-green bg-balanced-green/10",
            },
            {
              label: "Employees",
              value: 148,
              color: "text-purple-600 bg-purple-500/10",
            },
            {
              label: "Policies",
              value: 32,
              color: "text-attention-amber bg-attention-amber/10",
            },
            {
              label: "Contracts",
              value: 842,
              color: "text-cyan-600 bg-cyan-500/10",
            },
            {
              label: "Documents",
              value: "24.8k",
              color: "text-rose-600 bg-rose-500/10",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg p-3 text-center",
                item.color,
              )}
            >
              <span className="text-sm font-bold">
                {item.value.toLocaleString()}
              </span>
              <span className="text-[9px] font-medium mt-0.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            { q: "What is our travel policy?", href: "#" },
            { q: "What is our refund policy?", href: "#" },
            { q: "Who approves marketing spend?", href: "#" },
          ].map((item, idx) => (
            <button
              key={idx}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span>{item.q}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
