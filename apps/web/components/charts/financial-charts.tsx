"use client";

import { useState, useMemo } from "react";
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

// ─── Time Range Selector — pill tabs, shadcn-style ──────────────────────────

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
      className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 p-0.5"
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
            "rounded-full px-2.5 py-1 text-[11px] font-medium leading-none transition-all",
            value === opt.key
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tooltip — editorial, not junior card ────────────────────────────────────

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
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl shadow-black/5">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
            <span className="font-mono text-[13px] font-medium tabular-nums text-foreground">
              {formatter
                ? formatter(entry.value)
                : `${currency} ${(entry.value ?? 0).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart Card — Stripe pattern: metric above chart, fixed height, horizontal grid ─

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  onAskAi,
  aiPrompt,
  className,
  action,
  summary,
  children,
}: {
  title: string;
  icon: typeof TrendingUp;
  iconColor: string;
  onAskAi?: () => void;
  aiPrompt?: string;
  className?: string;
  action?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border border-border/50 bg-card p-5 transition-colors hover:border-border/70",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 bg-muted/20">
            <Icon className={cn("h-3.5 w-3.5", iconColor)} aria-hidden="true" />
          </span>
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onAskAi && aiPrompt && (
            <button
              type="button"
              onClick={onAskAi}
              className="hidden items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-all hover:border-primary/30 hover:text-primary group-hover:opacity-100 sm:inline-flex"
              title={`Ask AI about ${title.toLowerCase()}`}
            >
              <Sparkles className="h-3 w-3" />
              Ask AI
            </button>
          )}
        </div>
      </div>
      {summary ? <div className="mt-4">{summary}</div> : null}
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

// ─── Revenue Trend — primary editorial ───────────────────────────────────────

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
  const filteredData = filterByTimeRange(data, timeRange);
  const latest = filteredData[filteredData.length - 1];
  const first = filteredData[0];
  const delta =
    latest && first && first.revenue
      ? ((latest.revenue - first.revenue) / first.revenue) * 100
      : null;

  const empty =
    filteredData.length === 0 || filteredData.every((d) => !d.revenue);

  return (
    <ChartCard
      title="Revenue trend"
      icon={TrendingUp}
      iconColor="text-primary"
      onAskAi={onAskAi}
      aiPrompt="Explain my revenue trend. What's driving the changes?"
      action={<TimeRangeSelector value={timeRange} onChange={setTimeRange} />}
      summary={
        latest ? (
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatCurrency(latest.revenue)}
            </span>
            {delta !== null && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums",
                  delta >= 0
                    ? "bg-balanced-green/10 text-balanced-green"
                    : "bg-error-clay/10 text-error-clay",
                )}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              vs {filteredData.length} mo
            </span>
          </div>
        ) : null
      }
    >
      <div className="h-[220px] w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              No revenue data for this period. Connect your bank to see the
              trend.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="priorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.12}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="2 6"
                opacity={0.35}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                width={36}
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--border))",
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.6,
                }}
                content={
                  <ChartTooltip
                    currency={currency}
                    formatter={(v) => formatCurrency(v ?? 0)}
                  />
                }
              />
              {filteredData[0]?.prior !== undefined && (
                <Area
                  type="monotone"
                  dataKey="prior"
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={0.55}
                  strokeWidth={1.25}
                  strokeDasharray="5 5"
                  fill="url(#priorGrad)"
                  name="Prior period"
                  dot={false}
                  activeDot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revGrad)"
                name="Revenue"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "hsl(var(--primary))",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

// ─── Expense Breakdown — single-hue bar list, not rainbow ────────────────────

export function ExpenseBreakdownChart({
  data,
  currency = "GMD",
  onAskAi,
}: {
  data: Array<{ category: string; amount: number }>;
  currency?: string;
  onAskAi?: () => void;
}) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <ChartCard
      title="Expense breakdown"
      icon={TrendingDown}
      iconColor="text-muted-foreground"
      onAskAi={onAskAi}
      aiPrompt="Break down my expenses. What's the biggest cost driver?"
      summary={
        data.length ? (
          <p className="text-[12px] text-muted-foreground">
            Top {Math.min(data.length, 8)} categories · {data.length} total
          </p>
        ) : null
      }
    >
      <div className="h-[220px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <p className="text-xs text-muted-foreground">
              No expenses in this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid
                horizontal={false}
                stroke="hsl(var(--border))"
                strokeDasharray="2 6"
                opacity={0.35}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground))",
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                content={
                  <ChartTooltip
                    currency={currency}
                    formatter={(v) =>
                      `${currency} ${(v ?? 0).toLocaleString()}`
                    }
                  />
                }
              />
              <Bar
                dataKey="amount"
                radius={[0, 8, 8, 0]}
                name="Amount"
                barSize={18}
              >
                {data.map((d, i) => {
                  const alpha = 0.92 - (i / Math.max(data.length, 1)) * 0.42;
                  return (
                    <rect key={i} fill={`hsl(var(--primary) / ${alpha})`} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {data.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
          <span className="text-[11px] text-muted-foreground">Total shown</span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-foreground">
            {formatCurrency(data.reduce((s, d) => s + d.amount, 0))}
          </span>
        </div>
      )}
    </ChartCard>
  );
}

// ─── Cash Flow — balanced green / error-clay but muted, not neon ─────────────

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
  const last = filteredData[filteredData.length - 1];
  const net = last ? last.incoming - last.outgoing : null;

  return (
    <ChartCard
      title="Cash flow"
      icon={Wallet}
      iconColor="text-primary"
      onAskAi={onAskAi}
      aiPrompt="Analyze my cash flow. Am I spending more than I'm earning?"
      action={<TimeRangeSelector value={timeRange} onChange={setTimeRange} />}
      summary={
        last ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-medium tabular-nums text-balanced-green">
              +{formatCurrency(last.incoming)}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-[13px] font-medium tabular-nums text-error-clay">
              -{formatCurrency(last.outgoing)}
            </span>
            {net !== null && (
              <span
                className={cn(
                  "ml-2 inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums",
                  net >= 0
                    ? "bg-balanced-green/10 text-balanced-green"
                    : "bg-error-clay/10 text-error-clay",
                )}
              >
                {net >= 0 ? "+" : ""}
                {formatCurrency(net)} net
              </span>
            )}
          </div>
        ) : null
      }
    >
      <div className="h-[220px] w-full">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <p className="text-xs text-muted-foreground">No cash flow data.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={10}
            >
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="2 6"
                opacity={0.35}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                content={<ChartTooltip currency={currency} />}
              />
              <Bar
                dataKey="incoming"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
                name="Incoming"
                barSize={14}
              />
              <Bar
                dataKey="outgoing"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.45}
                radius={[8, 8, 0, 0]}
                name="Outgoing"
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

// ─── Margin — line with target, editorial ─────────────────────────────────────

export function MarginTrendChart({
  data,
  onAskAi,
}: {
  data: Array<{ month: string; margin: number; target?: number }>;
  onAskAi?: () => void;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const filteredData = filterByTimeRange(data, timeRange);
  const last = filteredData[filteredData.length - 1];

  return (
    <ChartCard
      title="Profit margin"
      icon={BarChart3}
      iconColor="text-primary"
      onAskAi={onAskAi}
      aiPrompt="Analyze my profit margin trend. Is it improving or declining?"
      action={<TimeRangeSelector value={timeRange} onChange={setTimeRange} />}
      summary={
        last ? (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {last.margin.toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground">margin</span>
            {last.target !== undefined && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                target {last.target.toFixed(0)}%
              </span>
            )}
          </div>
        ) : null
      }
    >
      <div className="h-[220px] w-full">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <p className="text-xs text-muted-foreground">
              No margin data for this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="2 6"
                opacity={0.35}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, "auto"]}
                width={36}
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--border))",
                  strokeDasharray: "3 3",
                }}
                content={
                  <ChartTooltip formatter={(v) => `${(v ?? 0).toFixed(1)}%`} />
                }
              />
              {filteredData[0]?.target !== undefined && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={0.5}
                  strokeWidth={1.25}
                  strokeDasharray="6 6"
                  dot={false}
                  activeDot={false}
                  name="Target"
                />
              )}
              <Line
                type="monotone"
                dataKey="margin"
                stroke="hsl(var(--primary))"
                strokeWidth={2.25}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "hsl(var(--primary))",
                  stroke: "white",
                  strokeWidth: 2,
                }}
                name="Margin"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
