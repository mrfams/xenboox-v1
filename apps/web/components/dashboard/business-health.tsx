"use client";

import { cn, formatCurrency } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
} from "lucide-react";

type HealthMetric = {
  id: string;
  label: string;
  value: number;
  format: "currency";
  change: number;
  icon: typeof Wallet;
  sparkline: number[];
};

type BusinessHealthProps = {
  className?: string;
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HealthCard({ metric }: { metric: HealthMetric }) {
  const Icon = metric.icon;
  const isPositive = metric.change >= 0;
  const sparkColor = isPositive ? "#10B981" : "#EF4444";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          {metric.label}
        </p>
        <button
          type="button"
          className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
          title={`Info about ${metric.label}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M7 6v4M7 4.5v0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <p className="text-xl font-bold tracking-tight tabular-nums text-foreground">
        {formatCurrency(metric.value)}
      </p>

      <div className="flex items-center justify-between mt-3">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold",
            isPositive ? "text-balanced-green" : "text-error-clay",
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? "+" : ""}
          {metric.change}%
        </span>

        <MiniSparkline data={metric.sparkline} color={sparkColor} />
      </div>
    </div>
  );
}

export function BusinessHealth({ className }: BusinessHealthProps) {
  const metrics: HealthMetric[] = [
    {
      id: "cash",
      label: "Cash Balance",
      value: 1234567,
      format: "currency",
      change: 12.5,
      icon: Wallet,
      sparkline: [
        800000, 900000, 850000, 1000000, 1100000, 1050000, 1200000, 1234567,
      ],
    },
    {
      id: "revenue",
      label: "Revenue",
      value: 2345890,
      format: "currency",
      change: 8.1,
      icon: DollarSign,
      sparkline: [
        1800000, 1900000, 2000000, 2100000, 2000000, 2200000, 2300000, 2345890,
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      value: 1345221,
      format: "currency",
      change: -3.4,
      icon: Receipt,
      sparkline: [
        1400000, 1350000, 1300000, 1320000, 1380000, 1360000, 1350000, 1345221,
      ],
    },
    {
      id: "profit",
      label: "Profit",
      value: 1000669,
      format: "currency",
      change: 12.2,
      icon: TrendingUp,
      sparkline: [
        600000, 700000, 650000, 800000, 850000, 900000, 950000, 1000669,
      ],
    },
    {
      id: "ar",
      label: "A/R (Outstanding)",
      value: 234550,
      format: "currency",
      change: 5.6,
      icon: CreditCard,
      sparkline: [
        200000, 210000, 220000, 230000, 225000, 235000, 230000, 234550,
      ],
    },
    {
      id: "ap",
      label: "A/P (Outstanding)",
      value: 345667,
      format: "currency",
      change: -2.1,
      icon: Wallet,
      sparkline: [
        360000, 355000, 350000, 345000, 350000, 348000, 346000, 345667,
      ],
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Business Health
        </h2>
        <select className="text-[11px] font-medium text-muted-foreground bg-transparent border border-border/50 rounded-lg px-2 py-1 outline-none">
          <option>This month</option>
          <option>Last month</option>
          <option>This quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {metrics.map((metric) => (
          <HealthCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
