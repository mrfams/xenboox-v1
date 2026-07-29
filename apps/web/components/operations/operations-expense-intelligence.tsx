"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Receipt, TrendingUp, TrendingDown, Minus } from "lucide-react";

type ExpenseCategory = {
  id: string;
  label: string;
  change: number;
  direction: "up" | "down" | "flat";
  note: string;
};

type OperationsExpenseIntelligenceProps = {
  categories?: ExpenseCategory[];
  largestIncrease?: string;
  className?: string;
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  {
    id: "ec1",
    label: "Travel",
    change: 14,
    direction: "up",
    note: "Up $12,400 month-over-month",
  },
  {
    id: "ec2",
    label: "Marketing",
    change: 31,
    direction: "up",
    note: "Campaign spend driving growth",
  },
  {
    id: "ec3",
    label: "Software",
    change: 2,
    direction: "down",
    note: "License optimization savings",
  },
  {
    id: "ec4",
    label: "Utilities",
    change: 5,
    direction: "down",
    note: "Seasonal decrease",
  },
  {
    id: "ec5",
    label: "Office",
    change: 4,
    direction: "up",
    note: "Supply chain costs",
  },
];

export function OperationsExpenseIntelligence({
  categories = DEFAULT_CATEGORIES,
  largestIncrease = "Marketing Campaigns",
  className,
}: OperationsExpenseIntelligenceProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Expense Intelligence
        </h3>
      </div>

      <div className="space-y-1.5">
        {categories.map((cat) => {
          const DirectionIcon =
            cat.direction === "up"
              ? TrendingUp
              : cat.direction === "down"
                ? TrendingDown
                : Minus;
          const color =
            cat.direction === "up"
              ? "text-error-clay"
              : cat.direction === "down"
                ? "text-balanced-green"
                : "text-muted-foreground";
          const bgColor =
            cat.direction === "up"
              ? "bg-error-clay/10"
              : cat.direction === "down"
                ? "bg-balanced-green/10"
                : "bg-muted/30";
          return (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted/20"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  bgColor,
                )}
              >
                <DirectionIcon className={cn("h-4 w-4", color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">
                    {cat.label}
                  </span>
                  <span className={cn("text-xs font-bold", color)}>
                    {cat.direction === "up"
                      ? "↑"
                      : cat.direction === "down"
                        ? "↓"
                        : "→"}{" "}
                    {cat.change}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {cat.note}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-muted/20 px-3 py-2 text-xs">
        <span className="text-muted-foreground/70">Largest Increase: </span>
        <span className="font-medium text-foreground/80">
          {largestIncrease}
        </span>
      </div>
    </div>
  );
}
