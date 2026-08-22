"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  LineChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Time Range Selector ───────────────────────────────────────────────────

export type TimeRange = "1m" | "3m" | "6m" | "1y" | "ytd";

const TIME_RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "ytd", label: "YTD" },
];

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Time range"
    >
      {TIME_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
            value === opt.key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Chart Tooltip ─────────────────────────────────────────────────────────

type ChartTooltipProps = {
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  currency?: string;
  formatter?: (value: number | undefined) => string;
  active?: boolean;
};

function ChartTooltip({
  active,
  payload,
  label,
  currency = "GMD",
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-foreground">
            {formatter
              ? formatter(entry.value ?? 0)
              : `${currency} ${(entry.value ?? 0).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart Card Wrapper ────────────────────────────────────────────────────

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  onAskAi,
  aiPrompt,
  children,
}: {
  title: string;
  icon: typeof TrendingUp;
  iconColor: string;
  onAskAi?: () => void;
  aiPrompt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {onAskAi && aiPrompt && (
          <button
            type="button"
            onClick={onAskAi}
            className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary opacity-0 transition-all hover:bg-primary/10 group-hover:opacity-100"
            title={`Ask AI about ${title.toLowerCase()}`}
          >
            <Sparkles className="h-2.5 w-2.5" />
            Ask AI
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Revenue Trend Chart ───────────────────────────────────────────────────

export function RevenueTrendChart({
  data,
  currency = "GMD",
  onAskAi,
}: {
  data: Array<{ month: string; revenue: number; prior?: number }>;
  currency?: string;
  onAskAi?: () => void;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");

  // Filter data based on time range
  const filteredData = filterByTimeRange(data, timeRange);

  return (
    <ChartCard
      title="Revenue Trend"
      icon={TrendingUp}
      iconColor="text-emerald-500"
      onAskAi={onAskAi}
      aiPrompt="Explain my revenue trend. What's driving the changes?"
    >
      <div className="flex items-center justify-between mb-2">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              {filteredData[0]?.prior !== undefined && (
                <linearGradient id="priorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            {filteredData[0]?.prior !== undefined && (
              <Area
                type="monotone"
                dataKey="prior"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="url(#priorGradient)"
                name="Prior Period"
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Expense Breakdown Chart ───────────────────────────────────────────────

export function ExpenseBreakdownChart({
  data,
  currency = "GMD",
  onAskAi,
}: {
  data: Array<{ category: string; amount: number }>;
  currency?: string;
  onAskAi?: () => void;
}) {
  const COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
  ];

  return (
    <ChartCard
      title="Expense Breakdown"
      icon={TrendingDown}
      iconColor="text-red-500"
      onAskAi={onAskAi}
      aiPrompt="Break down my expenses. What's the biggest cost driver?"
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 5, left: 60, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip
              content={
                <ChartTooltip
                  currency={currency}
                  formatter={(v) => `${currency} ${(v ?? 0).toLocaleString()}`}
                />
              }
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="Amount">
              {data.map((_, i) => (
                <rect key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Cash Flow Chart ───────────────────────────────────────────────────────

export function CashFlowChart({
  data,
  currency = "GMD",
  onAskAi,
}: {
  data: Array<{ month: string; incoming: number; outgoing: number }>;
  currency?: string;
  onAskAi?: () => void;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const filteredData = filterByTimeRange(data, timeRange);

  return (
    <ChartCard
      title="Cash Flow"
      icon={Wallet}
      iconColor="text-blue-500"
      onAskAi={onAskAi}
      aiPrompt="Analyze my cash flow. Am I spending more than I'm earning?"
    >
      <div className="flex items-center justify-between mb-2">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            <Bar
              dataKey="incoming"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Incoming"
            />
            <Bar
              dataKey="outgoing"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              name="Outgoing"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Profit Margin Chart ───────────────────────────────────────────────────

export function MarginTrendChart({
  data,
  onAskAi,
}: {
  data: Array<{ month: string; margin: number; target?: number }>;
  onAskAi?: () => void;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const filteredData = filterByTimeRange(data, timeRange);

  return (
    <ChartCard
      title="Profit Margin"
      icon={BarChart3}
      iconColor="text-primary"
      onAskAi={onAskAi}
      aiPrompt="Analyze my profit margin trend. Is it improving or declining?"
    >
      <div className="flex items-center justify-between mb-2">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={
                <ChartTooltip formatter={(v) => `${(v ?? 0).toFixed(1)}%`} />
              }
            />
            {filteredData[0]?.target !== undefined && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                name="Target"
              />
            )}
            <Line
              type="monotone"
              dataKey="margin"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{
                r: 5,
                stroke: "#6366f1",
                strokeWidth: 2,
                fill: "#fff",
              }}
              name="Margin"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function filterByTimeRange<T extends Record<string, unknown>>(
  data: T[],
  range: TimeRange,
): T[] {
  switch (range) {
    case "1m":
      return data.slice(-1);
    case "3m":
      return data.slice(-3);
    case "6m":
      return data.slice(-6);
    case "1y":
      return data.slice(-12);
    case "ytd": {
      const now = new Date();
      const currentMonth = now.getMonth();
      return data.filter((_, i) => i <= currentMonth);
    }
    default:
      return data;
  }
}
