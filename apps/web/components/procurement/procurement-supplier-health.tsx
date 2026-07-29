"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Building2, Star, ChevronRight } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  outstanding: number;
  reliability: number;
  meta: string;
  metaType: "positive" | "warning" | "info";
};

type ProcurementSupplierHealthProps = {
  suppliers?: Supplier[];
  className?: string;
};

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: "sp1",
    name: "Global Logistics",
    outstanding: 82000,
    reliability: 5,
    meta: "2% Discount Available",
    metaType: "positive",
  },
  {
    id: "sp2",
    name: "Microsoft",
    outstanding: 26000,
    reliability: 5,
    meta: "Auto Pay Enabled",
    metaType: "info",
  },
  {
    id: "sp3",
    name: "Office Depot",
    outstanding: 8400,
    reliability: 4,
    meta: "Price Increased 9%",
    metaType: "warning",
  },
  {
    id: "sp4",
    name: "ABC Manufacturing",
    outstanding: 58000,
    reliability: 4,
    meta: "Payment Due Tomorrow",
    metaType: "warning",
  },
  {
    id: "sp5",
    name: "Prime Suppliers",
    outstanding: 14500,
    reliability: 3,
    meta: "New Supplier — 90 days",
    metaType: "info",
  },
];

const META_COLORS = {
  positive: "text-balanced-green bg-balanced-green/10",
  warning: "text-attention-amber bg-attention-amber/10",
  info: "text-signal-indigo bg-signal-indigo/10",
};

export function ProcurementSupplierHealth({
  suppliers = DEFAULT_SUPPLIERS,
  className,
}: ProcurementSupplierHealthProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Supplier Health
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {suppliers.length} suppliers
        </span>
      </div>

      <div className="space-y-2">
        {suppliers.map((supplier) => {
          const isHovered = hoveredId === supplier.id;
          return (
            <button
              key={supplier.id}
              type="button"
              onMouseEnter={() => setHoveredId(supplier.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/80">
                    {supplier.name}
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {formatCurrency(supplier.outstanding)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-2.5 w-2.5",
                          i < supplier.reliability
                            ? "text-attention-amber fill-attention-amber"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded-md px-1.5 py-0.5",
                      META_COLORS[supplier.metaType],
                    )}
                  >
                    {supplier.meta}
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
