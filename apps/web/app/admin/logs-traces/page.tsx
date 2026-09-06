"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Button, Input, Skeleton } from "@xenboox/ui";
import {
  Search,
  Filter,
  Download,
  Radio,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Activity,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card Component ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaColor = isPositive ? "text-balanced-green" : "text-error-clay";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUp className={cn("h-3 w-3", deltaColor)} />
            ) : (
              <ArrowDown className={cn("h-3 w-3", deltaColor)} />
            )}
            <span className={cn("text-xs font-medium", deltaColor)}>
              {isPositive ? "↑" : "↓"} {Math.abs(delta)}
              {typeof delta === "number" && delta > 100 ? "" : "%"}
            </span>
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
    unset: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.unset}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    debug: "bg-gray-100 text-gray-700",
    info: "bg-blue-100 text-blue-700",
    warn: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    fatal: "bg-red-200 text-red-800",
  };

  return (
    <Badge variant="secondary" className={colors[level] || colors.info}>
      {level.toUpperCase()}
    </Badge>
  );
}

// ─── Trace Timeline Component ───────────────────────────────────────────────

function TraceTimeline({ spans }: { spans: any[] }) {
  if (!spans || spans.length === 0) return null;

  const maxDuration = Math.max(...spans.map((s) => s.durationMs));
  const startTime = Math.min(
    ...spans.map((s) => new Date(s.startTime).getTime()),
  );

  const getBarStyle = (span: any) => {
    const spanStart = new Date(span.startTime).getTime();
    const offset = ((spanStart - startTime) / maxDuration) * 100;
    const width = (span.durationMs / maxDuration) * 100;
    return { left: `${offset}%`, width: `${Math.max(width, 2)}%` };
  };

  const getBarColor = (serviceName: string) => {
    const colors: Record<string, string> = {
      "reconciliation-service": "bg-signal-indigo",
      database: "bg-orange-500",
      external: "bg-primary",
      cache: "bg-attention-amber",
      storage: "bg-cyan-500",
    };
    return colors[serviceName] || "bg-signal-indigo";
  };

  return (
    <div className="space-y-2">
      {/* Time axis */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>0ms</span>
        <span>{Math.round(maxDuration * 0.308)}ms</span>
        <span>{Math.round(maxDuration * 0.615)}ms</span>
        <span>{Math.round(maxDuration * 0.923)}ms</span>
        <span>{maxDuration}ms</span>
      </div>

      {/* Service & Operation header */}
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
        <span>Service & Operation</span>
      </div>

      {/* Spans */}
      <div className="relative">
        {spans.map((span) => {
          const indent = span.parentSpanId ? 1 : 0;
          return (
            <div
              key={span.spanId}
              className={cn(
                "flex items-center gap-2 py-1.5",
                indent > 0 && "ml-6",
              )}
            >
              <div className="w-48 shrink-0">
                <span className="text-sm truncate block">
                  {span.operationName}
                </span>
              </div>
              <div className="flex-1 relative h-6">
                <div
                  className={cn(
                    "absolute h-4 rounded-sm",
                    getBarColor(span.serviceName),
                  )}
                  style={getBarStyle(span)}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                {span.durationMs}ms
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t">
        {[
          "reconciliation-service",
          "database",
          "external",
          "cache",
          "storage",
        ].map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <div
              className={cn("h-2.5 w-2.5 rounded-full", getBarColor(name))}
            />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Span Details Panel ─────────────────────────────────────────────────────

function SpanDetailsPanel({
  span,
  onClose,
}: {
  span: any;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "details" | "logs" | "tags" | "metadata"
  >("details");

  if (!span) return null;

  return (
    <div className="w-[360px] border-l bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{span.operationName}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Span ID: {span.spanId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <StatusBadge status={span.status} />
          <span className="text-sm text-muted-foreground">Duration</span>
          <span className="text-sm font-medium">{span.durationMs}ms</span>
          <span className="text-sm text-muted-foreground ml-2">Start</span>
          <span className="text-sm font-medium">
            {Math.round(span.durationMs * 0.308)}ms
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(["details", "logs", "tags", "metadata"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "text-purple-600 border-purple-600"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "logs" && span.logs && ` (${span.logs.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                Matches bank transactions with ledger transactions
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Service</span>
                <span className="text-sm font-medium">{span.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Operation</span>
                <span className="text-sm font-medium">
                  {span.operationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Parent Span
                </span>
                <span className="text-sm font-medium">
                  Reconciliation Workflow
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={span.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Kind</span>
                <span className="text-sm font-medium capitalize">
                  {span.kind}
                </span>
              </div>
            </div>

            {/* Tags */}
            {span.tags && Object.keys(span.tags).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(span.tags).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-2">
            {span.logs && span.logs.length > 0 ? (
              span.logs.map((log: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs font-mono"
                >
                  <span className="text-muted-foreground shrink-0">
                    {log.timestamp}
                  </span>
                  <LogLevelBadge level={log.level} />
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No logs for this span.
              </p>
            )}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="space-y-2">
            {span.tags && Object.keys(span.tags).length > 0 ? (
              Object.entries(span.tags).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-1 border-b"
                >
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No tags for this span.
              </p>
            )}
          </div>
        )}

        {activeTab === "metadata" && (
          <div className="text-sm text-muted-foreground">
            <p>No additional metadata.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700">
          View full span in explorer
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LogsTracesPage() {
  const [activeTab, setActiveTab] = useState<
    "logs" | "traces" | "errors" | "performance"
  >("traces");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("1h");
  const [selectedSpan, setSelectedSpan] = useState<any>(null);
  const [page, setPage] = useState(1);

  // Fetch KPIs
  const { data: overview, isLoading: overviewLoading } =
    trpc.logsTraces.getOverview.useQuery({
      days: 7,
    });

  // Fetch traces
  const { data: tracesData, isLoading: tracesLoading } =
    trpc.logsTraces.getTraces.useQuery({
      search: searchQuery || undefined,
      service: serviceFilter !== "all" ? serviceFilter : undefined,
      environment: envFilter !== "all" ? envFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      timeRange,
      page,
      pageSize: 50,
    });

  // Fetch trace detail for first trace
  const firstTraceId = tracesData?.traces?.[0]?.traceId;
  const { data: traceDetail } = trpc.logsTraces.getTraceDetail.useQuery(
    { traceId: firstTraceId || "" },
    { enabled: !!firstTraceId },
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">10</span>
                <h1 className="text-2xl font-bold tracking-tight">
                  Logs & Traces
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Explore system logs, traces, and errors to debug and monitor
                your platform.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    const end = new Date();
                    const start = new Date(end.getTime() - 7 * 86400000);
                    const fmt = (d: Date) =>
                      d.toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      });
                    return `${fmt(start)} – ${fmt(end)}`;
                  })()}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Radio className="h-4 w-4 mr-1" />
                Live Tail
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
                          </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-6 gap-4">
            <KpiCard
              label="Total Logs (7d)"
              value={formatNumber(overview?.kpis?.totalLogs ?? 0)}
              delta={overview?.kpis?.totalLogsDelta}
              deltaLabel="vs prior 7d"
              icon={<Info className="h-4 w-4" />}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <KpiCard
              label="Error Logs"
              value={formatNumber(overview?.kpis?.errorLogs ?? 0)}
              delta={overview?.kpis?.errorLogsDelta}
              deltaLabel="vs prior 7d"
              icon={<AlertCircle className="h-4 w-4" />}
              iconColor="text-red-600"
              iconBg="bg-red-100"
            />
            <KpiCard
              label="Warning Logs"
              value={formatNumber(overview?.kpis?.warningLogs ?? 0)}
              delta={overview?.kpis?.warningLogsDelta}
              deltaLabel="vs prior 7d"
              icon={<AlertTriangle className="h-4 w-4" />}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
            />
            <KpiCard
              label="Info Logs"
              value={formatNumber(overview?.kpis?.infoLogs ?? 0)}
              delta={overview?.kpis?.infoLogsDelta}
              deltaLabel="vs prior 7d"
              icon={<Info className="h-4 w-4" />}
              iconColor="text-violet-600"
              iconBg="bg-violet-100"
            />
            <KpiCard
              label="P95 Latency"
              value={`${overview?.kpis?.p95Latency ?? 0} ms`}
              delta={overview?.kpis?.p95LatencyDelta}
              deltaLabel="vs prior 7d"
              icon={<Clock className="h-4 w-4" />}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <KpiCard
              label="Traces (7d)"
              value={formatNumber(overview?.kpis?.traces ?? 0)}
              delta={overview?.kpis?.tracesDelta}
              deltaLabel="vs prior 7d"
              icon={<Activity className="h-4 w-4" />}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b bg-white">
          <div className="flex gap-6">
            {(["logs", "traces", "errors", "performance"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="pl-9"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Services</option>
            <option value="reconciliation-service">
              Reconciliation Service
            </option>
            <option value="invoice-service">Invoice Service</option>
            <option value="ingestion-service">Ingestion Service</option>
            <option value="document-service">Document Service</option>
            <option value="payroll-service">Payroll Service</option>
            <option value="reporting-service">Reporting Service</option>
            <option value="auth-service">Auth Service</option>
          </select>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
          {activeTab === "traces" && (
            <select className="px-3 py-2 border rounded-md text-sm">
              <option value="any">Latency: Any</option>
              <option value="fast">Fast ({"<"} 100ms)</option>
              <option value="medium">Medium (100-500ms)</option>
              <option value="slow">Slow ({">"} 500ms)</option>
            </select>
          )}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery("");
              setServiceFilter("all");
              setEnvFilter("all");
              setStatusFilter("all");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Traces List (Left Panel) */}
          <div className="w-[320px] border-r bg-white overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tracesData?.pagination?.total ?? 0} traces
                </span>
                <select className="text-xs border rounded px-2 py-1">
                  <option>Sort by: Start Time (Newest)</option>
                  <option>Sort by: Duration (Longest)</option>
                  <option>Sort by: Duration (Shortest)</option>
                </select>
              </div>
            </div>
            <div className="divide-y">
              {tracesData?.traces?.map((trace: any) => (
                <div
                  key={trace.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer",
                    traceDetail?.trace?.traceId === trace.traceId &&
                      "bg-purple-50",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {trace.status === "success" ? (
                          <div className="h-2 w-2 rounded-full bg-balanced-green" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-error-clay" />
                        )}
                        <p className="text-sm font-medium truncate">
                          {trace.rootOperation}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {trace.serviceName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {trace.durationMs >= 1000
                            ? `${(trace.durationMs / 1000).toFixed(2)}s`
                            : `${trace.durationMs}ms`}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {trace.startTime
                            ? new Date(trace.startTime).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </div>{" "}
                    <button
                      aria-label="Expand details"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 rounded text-sm",
                      p === page
                        ? "bg-purple-600 text-white"
                        : "hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
                <span className="text-muted-foreground mx-1">...</span>
                <span className="text-sm text-muted-foreground">8,647</span>
              </div>
              <select className="text-xs border rounded px-2 py-1">
                <option>50 / page</option>
                <option>25 / page</option>
                <option>100 / page</option>
              </select>
            </div>
          </div>

          {/* Trace Detail (Center Panel) */}
          <div className="flex-1 overflow-y-auto bg-white">
            {traceDetail ? (
              <div className="p-6">
                {/* Trace Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {traceDetail.trace.rootOperation}
                    </h2>
                    <div className="mt-2">
                      <StatusBadge status={traceDetail.trace.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-purple-600 hover:text-purple-700">
                      View in Explorer ↗
                    </button>{" "}
                    <button
                      aria-label="Expand details"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Trace Metadata */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Trace ID</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="font-mono text-xs">
                        {traceDetail.trace.traceId}
                      </span>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Service</span>
                      <p className="mt-1">{traceDetail.trace.serviceName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Environment</span>
                      <p className="mt-1">{traceDetail.trace.environment}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Time</span>
                    <p className="mt-1">
                      {traceDetail.trace.startTime
                        ? new Date(traceDetail.trace.startTime).toLocaleString()
                        : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="mt-1">
                      {traceDetail.trace.durationMs >= 1000
                        ? `${(traceDetail.trace.durationMs / 1000).toFixed(2)}s`
                        : `${traceDetail.trace.durationMs}ms`}
                    </p>
                  </div>
                </div>

                {/* Trace Detail Tabs */}
                <div className="border-b mb-6">
                  <div className="flex gap-6">
                    {[
                      "Trace Timeline",
                      "Span List",
                      `Logs (${traceDetail.spans.reduce((acc: number, s: any) => acc + (s.logs?.length || 0), 0)})`,
                      "Metadata",
                    ].map((tab, i) => (
                      <button
                        key={tab}
                        className={cn(
                          "py-2 text-sm font-medium border-b-2 transition-colors",
                          i === 0
                            ? "border-purple-600 text-purple-600"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trace Timeline */}
                <TraceTimeline spans={traceDetail.spans} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a trace to view details
              </div>
            )}
          </div>

          {/* Span Details (Right Panel) */}
          {selectedSpan && (
            <SpanDetailsPanel
              span={selectedSpan}
              onClose={() => setSelectedSpan(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
