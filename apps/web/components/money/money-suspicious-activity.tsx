"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Search,
} from "lucide-react";

type SuspiciousItem = {
  id: string;
  icon: string;
  text: string;
  severity: "high" | "medium" | "low";
};

type MoneySuspiciousActivityProps = {
  items?: SuspiciousItem[];
  className?: string;
};

const DEFAULT_ITEMS: SuspiciousItem[] = [
  {
    id: "sa1",
    icon: "⚠",
    text: "Duplicate payment of GMD 85,000 to Basiq Trading",
    severity: "high",
  },
  {
    id: "sa2",
    icon: "⚠",
    text: "Large weekend withdrawal of GMD 120,000 from GTBank",
    severity: "high",
  },
  {
    id: "sa3",
    icon: "⚠",
    text: "New supplier paid GMD 45,000 — no purchase order match",
    severity: "medium",
  },
  {
    id: "sa4",
    icon: "⚠",
    text: "Unusual transfer of GMD 250,000 to foreign account",
    severity: "medium",
  },
];

export function MoneySuspiciousActivity({
  items = DEFAULT_ITEMS,
  className,
}: MoneySuspiciousActivityProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);

  const visible = items.filter((i) => !resolvedIds.has(i.id));

  if (visible.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 px-1">
          <ShieldAlert className="h-4 w-4 text-balanced-green" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Potential Issues
          </h3>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed py-6 text-center">
          <div className="space-y-1">
            <CheckCircle2 className="h-6 w-6 text-balanced-green mx-auto mb-1" />
            <p className="text-xs text-muted-foreground/60">
              All clear — no suspicious activity detected
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <ShieldAlert className="h-4 w-4 text-error-clay" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Potential Issues
        </h3>
        <span className="rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-medium text-error-clay">
          {visible.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border bg-card px-3 py-2.5 transition-all",
              item.severity === "high" && "border-l-[3px] border-l-error-clay",
              item.severity === "medium" &&
                "border-l-[3px] border-l-attention-amber",
              item.severity === "low" &&
                "border-l-[3px] border-l-attention-amber/50",
              investigatingId === item.id && "bg-signal-indigo/[0.02]",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-sm mt-0.5">{item.icon}</span>
              <p className="flex-1 text-xs text-foreground/80 leading-relaxed">
                {item.text}
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-2 ml-6">
              <button
                type="button"
                onClick={() =>
                  setInvestigatingId(
                    investigatingId === item.id ? null : item.id,
                  )
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                  investigatingId === item.id
                    ? "bg-signal-indigo/10 text-signal-indigo"
                    : "bg-signal-indigo/10 text-signal-indigo hover:bg-signal-indigo/20",
                )}
              >
                {investigatingId === item.id ? "Close" : "Investigate"}
                <Search className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={() => setResolvedIds((p) => new Set(p).add(item.id))}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium text-balanced-green hover:bg-balanced-green/10 transition-all"
              >
                Mark Safe
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all"
              >
                Explain
              </button>
            </div>

            {investigatingId === item.id && (
              <div className="mt-2 ml-6 rounded-md bg-muted/20 px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed border">
                <p className="font-medium text-foreground/80 mb-1">
                  AI Investigation
                </p>
                <p>
                  This transaction does not match typical spending patterns. The
                  amount exceeds the 90th percentile of similar transactions by
                  340%. Recommended action: verify with the counterparty before
                  posting.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
