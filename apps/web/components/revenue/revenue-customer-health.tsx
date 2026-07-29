"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type CustomerHealth = {
  id: string;
  name: string;
  outstanding: number;
  risk: "low" | "medium" | "high";
  paymentBehavior: string;
};

type RevenueCustomerHealthProps = {
  customers?: CustomerHealth[];
  className?: string;
};

const DEFAULT_CUSTOMERS: CustomerHealth[] = [
  {
    id: "ch1",
    name: "Acme Holdings",
    outstanding: 82000,
    risk: "low",
    paymentBehavior: "Pays early",
  },
  {
    id: "ch2",
    name: "BlueWave Ltd",
    outstanding: 42000,
    risk: "medium",
    paymentBehavior: "Usually pays 9 days late",
  },
  {
    id: "ch3",
    name: "Nova Tech",
    outstanding: 28000,
    risk: "high",
    paymentBehavior: "Invoice disputed",
  },
  {
    id: "ch4",
    name: "Global Logistics",
    outstanding: 35000,
    risk: "medium",
    paymentBehavior: "Pays on due date",
  },
  {
    id: "ch5",
    name: "Metro Group",
    outstanding: 12000,
    risk: "high",
    paymentBehavior: "67 days overdue",
  },
];

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    color: "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
    badge: "Low",
    dot: "bg-balanced-green",
  },
  medium: {
    icon: AlertTriangle,
    color:
      "text-attention-amber bg-attention-amber/10 border-attention-amber/20",
    badge: "Medium",
    dot: "bg-attention-amber",
  },
  high: {
    icon: XCircle,
    color: "text-error-clay bg-error-clay/10 border-error-clay/20",
    badge: "High",
    dot: "bg-error-clay",
  },
};

export function RevenueCustomerHealth({
  customers = DEFAULT_CUSTOMERS,
  className,
}: RevenueCustomerHealthProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Customer Health
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {customers.length} accounts
        </span>
      </div>

      <div className="space-y-2">
        {customers.map((customer) => {
          const risk = RISK_CONFIG[customer.risk];
          const RiskIcon = risk.icon;
          const isHovered = hoveredId === customer.id;

          return (
            <button
              key={customer.id}
              type="button"
              onMouseEnter={() => setHoveredId(customer.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  risk.color,
                )}
              >
                <RiskIcon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/80">
                    {customer.name}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                      risk.color,
                    )}
                  >
                    <span
                      className={cn("h-1 w-1 rounded-full mr-1", risk.dot)}
                    />
                    {risk.badge} Risk
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold tabular-nums">
                    {formatCurrency(customer.outstanding)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    ·
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {customer.paymentBehavior}
                  </span>
                </div>
              </div>

              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 transition-all",
                  isHovered
                    ? "text-muted-foreground opacity-100"
                    : "text-muted-foreground/30 opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
