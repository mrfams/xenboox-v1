"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from "@xenboox/ui";
import {
  Search,
  Plus,
  Download,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Zap,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  MoreHorizontal,
  Send,
  Sparkles,
  Building,
  FileText,
  Tag,
  CreditCard,
  Users,
  Bot,
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
  const isNegativeGood = label === "Exceptions";
  const deltaColor = isNegativeGood
    ? isPositive
      ? "text-red-500"
      : "text-emerald-500"
    : isPositive
      ? "text-emerald-500"
      : "text-red-500";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUp className={cn("h-3 w-3", deltaColor)} />
            ) : (
              <ArrowDown className={cn("h-3 w-3", deltaColor)} />
            )}
            <span className={cn("text-xs font-medium", deltaColor)}>
              {isPositive ? "↑" : "↓"} {Math.abs(delta)}
              {label === "Accuracy Rate" ? "%" : ""}
            </span>
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Template Card Component ────────────────────────────────────────────────

function TemplateCard({
  name,
  description,
  tag,
  icon,
  iconColor,
  iconBg,
}: {
  name: string;
  description: string;
  tag?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    building: <Building className="h-5 w-5" />,
    "file-text": <FileText className="h-5 w-5" />,
    tag: <Tag className="h-5 w-5" />,
    "credit-card": <CreditCard className="h-5 w-5" />,
    users: <Users className="h-5 w-5" />,
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <div className={iconColor}>
              {icons[icon] || <Zap className="h-5 w-5" />}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
            {tag && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] mt-2",
                  tag === "popular"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700",
                )}
              >
                {tag === "popular" ? "⭐ Popular" : "✨ New"}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-emerald-100 text-emerald-700",
    completed: "bg-blue-100 text-blue-700",
    paused: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.running}>
      {status === "running"
        ? "● Running"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ─── Confidence Bar Component ───────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8">{value}%</span>
    </div>
  );
}

// ─── Donut Chart Component ──────────────────────────────────────────────────

function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  centerValue: string;
  centerLabel: string;
}) {
  const radius = 50;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={140} height={140}>
          {segments.map((segment, i) => {
            const segmentLength = (segment.percentage / 100) * circumference;
            const dashOffset = -(accumulatedPercentage / 100) * circumference;
            accumulatedPercentage += segment.percentage;

            return (
              <circle
                key={i}
                cx={70}
                cy={70}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{centerValue}</span>
          <span className="text-[10px] text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="space-y-1 mt-4">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.name}</span>
            <span className="font-medium">
              {segment.value.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              ({segment.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AutomationStudioPage() {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "all"
    | "templates"
    | "triggers"
    | "connections"
    | "logs"
    | "audit"
  >("overview");
  const [buildPrompt, setBuildPrompt] = useState("");

  // Fetch data
  const { data: overview, isLoading: overviewLoading } =
    trpc.automationStudio.getOverview.useQuery({ days: 30 });
  const { data: automations } = trpc.automationStudio.getAutomations.useQuery();
  const { data: templates } = trpc.automationStudio.getTemplates.useQuery();
  const { data: activity } = trpc.automationStudio.getActivity.useQuery({
    limit: 5,
  });
  const { data: performance } = trpc.automationStudio.getPerformance.useQuery();
  const { data: timeSavings } =
    trpc.automationStudio.getTopTimeSavings.useQuery();

  // Seed demo data mutation
  const seedMutation = trpc.automationStudio.seedDemoData.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const perfSegments = useMemo(() => {
    if (!performance) return [];
    return [
      {
        name: "Successful",
        value: performance.successful,
        percentage: performance.successfulPercent,
        color: "#10b981",
      },
      {
        name: "Review Required",
        value: performance.reviewRequired,
        percentage: performance.reviewPercent,
        color: "#f59e0b",
      },
      {
        name: "Failed",
        value: performance.failed,
        percentage: performance.failedPercent,
        color: "#ef4444",
      },
      {
        name: "Skipped",
        value: performance.skipped,
        percentage: performance.skippedPercent,
        color: "#6b7280",
      },
    ];
  }, [performance]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Automation Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Build, run and improve AI automations that keep your books
              accurate.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-1" />
            New Automation
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            variant="outline"
            size="sm"
          >
            Seed Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(
            [
              "overview",
              "all",
              "templates",
              "triggers",
              "connections",
              "logs",
              "audit",
            ] as const
          ).map((tab) => (
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
              {tab === "all"
                ? "All Automations"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        <KpiCard
          label="Automations Running"
          value={overview?.kpis?.automationsRunning ?? 0}
          delta={overview?.kpis?.runningDelta}
          deltaLabel="vs last month"
          icon={<Zap className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <KpiCard
          label="Tasks Automated"
          value={overview?.kpis?.tasksAutomated ?? 0}
          delta={overview?.kpis?.tasksDelta}
          deltaLabel="vs last month"
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <KpiCard
          label="Time Saved"
          value={`${overview?.kpis?.timeSavedHours ?? 0} hrs`}
          delta={overview?.kpis?.timeDelta}
          deltaLabel="vs last month"
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
        />
        <KpiCard
          label="Accuracy Rate"
          value={`${overview?.kpis?.accuracyRate ?? 0}%`}
          delta={overview?.kpis?.accuracyDelta}
          deltaLabel="vs last month"
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <KpiCard
          label="Exceptions"
          value={overview?.kpis?.exceptions ?? 0}
          delta={overview?.kpis?.exceptionsDelta}
          deltaLabel="vs last month"
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
        <KpiCard
          label="Cost Savings"
          value={`${overview?.kpis?.costSavingsCurrency ?? "GMD"} ${(overview?.kpis?.costSavings ?? 0).toLocaleString()}`}
          delta={overview?.kpis?.costSavingsDelta}
          deltaLabel="vs last month"
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recommended Templates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">
                  Recommended Templates
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 text-[10px]"
                >
                  AI
                </Badge>
              </div>
              <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all templates <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Pre-built automations for common accounting workflows.
              </p>
              <div className="grid grid-cols-5 gap-3">
                {templates
                  ?.slice(0, 5)
                  .map((t: any) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      description={t.description}
                      tag={t.tag}
                      icon={t.icon}
                      iconColor={t.iconColor}
                      iconBg={t.iconBg}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Automations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">
                  Active Automations
                </CardTitle>
                <Badge variant="secondary">{automations?.length ?? 0}</Badge>
              </div>
              <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all automations <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Automation
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Trigger
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Last Run
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Success Rate
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      AI Confidence
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {automations?.slice(0, 8).map((auto: any) => (
                    <tr key={auto.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{auto.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {auto.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {auto.triggerSchedule}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {auto.lastRunAt
                          ? new Date(auto.lastRunAt).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="py-3 text-sm font-medium">
                        {auto.successRate}%
                      </td>
                      <td className="py-3">
                        <StatusBadge status={auto.status} />
                      </td>
                      <td className="py-3">
                        <ConfidenceBar value={auto.aiConfidence ?? 0} />
                      </td>
                      <td className="py-3">
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-4">
                View all automations <ChevronRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>

          {/* Build with AI */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-semibold">Build with AI</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Describe what you want to automate and we&apos;ll build it for
                you.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="E.g., When a new invoice is received, extract the data, validate it and record it in bills..."
                  value={buildPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBuildPrompt(e.target.value)
                  }
                  className="flex-1"
                />
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate Automation
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bot className="h-3 w-3" /> Natural language builder
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" /> AI tests & validates
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Smart suggestions
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Automation Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                Automation Activity
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 text-[10px]"
              >
                Live
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity?.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg",
                        a.status === "success"
                          ? "bg-emerald-100"
                          : "bg-red-100",
                      )}
                    >
                      {a.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.automationName}</p>
                      <p className="text-xs text-muted-foreground">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleTimeString()
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-4">
                View full activity log <ChevronRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>

          {/* Automation Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                Automation Performance
              </CardTitle>
              <select className="text-xs border rounded px-2 py-1">
                <option>This Month</option>
                <option>Last Month</option>
                <option>Last 3 Months</option>
              </select>
            </CardHeader>
            <CardContent>
              <DonutChart
                segments={perfSegments}
                centerValue={performance?.totalTasks?.toLocaleString() ?? "0"}
                centerLabel="Tasks Automated"
              />
            </CardContent>
          </Card>

          {/* Top Time Saving */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                Top Time Saving Automations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeSavings?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        {s.rank}
                      </span>
                      <span className="text-sm">{s.automationName}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-600">
                      {s.timeSavedHours} hrs
                    </span>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-4">
                View full report <ChevronRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
