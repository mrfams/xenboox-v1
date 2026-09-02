"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Download, Maximize2, Minimize2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "sparkline";

export type ChartDataPoint = Record<string, string | number>;

export type ChartSeries = {
  key: string;
  label: string;
  color?: string;
  type?: "bar" | "line" | "area";
};

export type ChartAnnotation = {
  x?: string | number;
  y?: string | number;
  label: string;
};

export type ChartProps = {
  type: ChartType;
  title?: string;
  data: ChartDataPoint[];
  /** Key for x-axis labels */
  xKey?: string;
  /** Key(s) for y-axis values */
  yKey?: string;
  /** Multiple series for combo charts */
  series?: ChartSeries[];
  /** Currency for formatting */
  currency?: string;
  /** Annotations to show on the chart */
  annotations?: ChartAnnotation[];
  /** Show legend */
  showLegend?: boolean;
  /** Chart height */
  height?: number;
  /** Optional summary text below chart */
  summary?: string;
  /** Optional className */
  className?: string;
};

// ─── Colors ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
];

// ─── Formatters ────────────────────────────────────────────────────────────

function format(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label && (
        <p className="mb-1 text-[11px] font-medium text-foreground">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {currency
              ? format(entry.value ?? 0, currency)
              : formatNumber(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Export to CSV ─────────────────────────────────────────────────────────

function exportChartCSV(
  data: ChartDataPoint[],
  title: string,
  xKey: string,
  yKeys: string[],
) {
  const headers = [xKey, ...yKeys].join(",");
  const rows = data.map((row) =>
    [xKey, ...yKeys]
      .map((key) => {
        const val = row[key];
        if (val === null || val === undefined) return "";
        return String(val);
      })
      .join(","),
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Chart Card Wrapper ────────────────────────────────────────────────────

function ChartCard({
  title,
  children,
  onExport,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  onExport?: () => void;
  className?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 overflow-hidden",
        isFullscreen && "fixed inset-4 z-50 flex flex-col",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-1">
            {onExport && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onExport}
                aria-label="Export chart data"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsFullscreen((p) => !p)}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      <div className={cn("p-4", isFullscreen ? "flex-1" : "")}>{children}</div>
    </div>
  );
}

// ─── Sparkline (Mini Chart) ────────────────────────────────────────────────

function SparklineChart({
  data,
  dataKey,
  color = "#6366f1",
  height = 40,
}: {
  data: ChartDataPoint[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${dataKey})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ChartInline({
  type,
  title,
  data,
  xKey = "name",
  yKey = "value",
  series,
  currency,
  annotations,
  showLegend = true,
  height = 250,
  summary,
  className,
}: ChartProps) {
  const { format } = useFormatCurrency();
  // Determine which keys to use for y-axis
  const yKeys = useMemo(() => {
    if (series?.length) return series.map((s) => s.key);
    return [yKey];
  }, [series, yKey]);

  // Colors for each series
  const colors = useMemo(() => {
    if (series?.length) {
      return series.map(
        (s, i) => s.color ?? CHART_COLORS[i % CHART_COLORS.length],
      );
    }
    return CHART_COLORS;
  }, [series]);

  const handleExport = () => {
    exportChartCSV(data, title ?? "chart", xKey, yKeys);
  };

  // ── Sparkline (no card wrapper) ─────────────────────────────────────
  if (type === "sparkline") {
    return (
      <SparklineChart
        data={data}
        dataKey={yKey}
        color={colors[0]}
        height={height}
      />
    );
  }

  // ── Pie / Donut ────────────────────────────────────────────────────
  if (type === "pie" || type === "donut") {
    return (
      <ChartCard title={title} onExport={handleExport} className={className}>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={type === "donut" ? height * 0.25 : 0}
                outerRadius={height * 0.38}
                dataKey={yKey}
                nameKey={xKey}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip currency={currency} />} />
              {showLegend && (
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {summary && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">{summary}</p>
        )}
      </ChartCard>
    );
  }

  // ── Bar Chart ──────────────────────────────────────────────────────
  if (type === "bar") {
    return (
      <ChartCard title={title} onExport={handleExport} className={className}>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              {showLegend && yKeys.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                  name={series?.find((s) => s.key === key)?.label ?? key}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {summary && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">{summary}</p>
        )}
      </ChartCard>
    );
  }

  // ── Line Chart ─────────────────────────────────────────────────────
  if (type === "line") {
    return (
      <ChartCard title={title} onExport={handleExport} className={className}>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              {showLegend && yKeys.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors[i % colors.length] }}
                  activeDot={{ r: 5 }}
                  name={series?.find((s) => s.key === key)?.label ?? key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {summary && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">{summary}</p>
        )}
      </ChartCard>
    );
  }

  // ── Area Chart (default) ───────────────────────────────────────────
  return (
    <ChartCard title={title} onExport={handleExport} className={className}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              {yKeys.map((key, i) => (
                <linearGradient
                  key={key}
                  id={`grad-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[i % colors.length]}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[i % colors.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            {showLegend && yKeys.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                iconSize={8}
              />
            )}
            {yKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                fill={`url(#grad-${key})`}
                name={series?.find((s) => s.key === key)?.label ?? key}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {summary && (
        <p className="mt-2 text-[11px] text-muted-foreground/70">{summary}</p>
      )}
    </ChartCard>
  );
}
