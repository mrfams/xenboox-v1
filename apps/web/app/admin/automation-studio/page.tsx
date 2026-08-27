"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Download,
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
  X,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  HelpCircle,
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
      ? "text-error-clay"
      : "text-balanced-green"
    : isPositive
      ? "text-balanced-green"
      : "text-error-clay";

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUp className={`h-3 w-3 ${deltaColor}`} />
          ) : (
            <ArrowDown className={`h-3 w-3 ${deltaColor}`} />
          )}
          <span className={`text-xs font-medium ${deltaColor}`}>
            {isPositive ? "↑" : "↓"} {Math.abs(delta)}
            {label === "Accuracy Rate" ? "%" : ""}
          </span>
          <span className="text-xs text-gray-500">{deltaLabel}</span>
        </div>
      )}
    </div>
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
    <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <div className={iconColor}>
            {icons[icon] || <Zap className="h-5 w-5" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {description}
          </p>
          {tag && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-2",
                tag === "popular"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-100 text-blue-700",
              )}
            >
              {tag === "popular" ? "⭐ Popular" : "✨ New"}
            </span>
          )}
        </div>
      </div>
    </div>
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
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colors[status] || colors.running,
      )}
    >
      {status === "running"
        ? "● Running"
        : status === "completed"
          ? "✓ Completed"
          : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Confidence Bar Component ───────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-signal-indigo rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-8">{value}%</span>
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
          <span className="text-2xl font-bold text-gray-900">
            {centerValue}
          </span>
          <span className="text-[10px] text-gray-500">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-1 mt-4">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-gray-500">{segment.name}</span>
            <span className="font-medium text-gray-900">
              {segment.value.toLocaleString()}
            </span>
            <span className="text-gray-500">({segment.percentage}%)</span>
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
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [aiMessage, setAiMessage] = useState("");

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

  const tabs = [
    "overview",
    "all",
    "templates",
    "triggers",
    "connections",
    "logs",
    "audit",
  ] as const;

  const tabLabels: Record<string, string> = {
    overview: "Overview",
    all: "All Automations",
    templates: "Templates",
    triggers: "Triggers",
    connections: "Connections",
    logs: "Logs",
    audit: "Audit Trail",
  };

  const quickActions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      text: "Suggest an automation for invoice processing",
    },
    {
      icon: <HelpCircle className="h-4 w-4" />,
      text: "Why did this automation fail yesterday?",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      text: "Show me automations saving the most time",
    },
    {
      icon: <Bot className="h-4 w-4" />,
      text: "Help me build a bank reconciliation flow",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Automation Studio
                </h1>
                <p className="text-sm text-gray-500">
                  Build, run and improve AI automations that keep your books
                  accurate.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Automation
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Import
              </button>
              <button
                onClick={() => seedMutation.mutate()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Seed Data
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${showAiAssistant ? "pr-0" : ""}`}>
          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-4 mb-6">
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

          {/* Recommended Templates */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Recommended Templates
                </h3>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                  AI
                </span>
              </div>
              <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all templates <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-4">
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
            </div>
          </div>

          {/* Active Automations */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Active Automations
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {automations?.length ?? 0}
                </span>
              </div>
              <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all automations <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 py-3">Automation</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Last Run</th>
                    <th className="px-4 py-3">Success Rate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">AI Confidence</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {automations?.slice(0, 8).map((auto: any) => (
                    <tr key={auto.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {auto.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {auto.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {auto.triggerSchedule}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {auto.lastRunAt
                          ? new Date(auto.lastRunAt).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {auto.successRate}%
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={auto.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBar value={auto.aiConfidence ?? 0} />
                      </td>
                      <td className="px-4 py-3">
                        {" "}
                        <button
                          aria-label="More options"
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                View all automations <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Build with AI */}
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Build with AI
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Describe what you want to automate and we&apos;ll build it for
              you.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                placeholder="E.g., When a new invoice is received, extract the data, validate it and record it in bills..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Automation
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Bot className="h-3 w-3" /> Natural language builder
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CheckCircle2 className="h-3 w-3" /> AI tests & validates
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Sparkles className="h-3 w-3" /> Smart suggestions
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - AI Assistant */}
        {showAiAssistant && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Xenboox AI Assistant
                    </p>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                      Beta
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiAssistant(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Greeting */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Hello Famara! 👋
                </h3>
                <p className="text-sm text-gray-500">
                  I can help you build and improve automations.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    className="w-full p-3 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                  >
                    <span className="text-signal-indigo">{action.icon}</span>
                    {action.text}
                  </button>
                ))}
              </div>

              {/* AI Suggestion */}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    AI Suggestion
                  </h4>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  You could automate VAT return data extraction from your sales
                  and purchase journals.
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Preview
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Automation
                  </button>
                </div>
              </div>

              {/* Automation Performance */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Automation Performance
                  </h4>
                  <select className="text-xs border border-gray-200 rounded px-2 py-1">
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>Last 3 Months</option>
                  </select>
                </div>
                <DonutChart
                  segments={perfSegments}
                  centerValue={performance?.totalTasks?.toLocaleString() ?? "0"}
                  centerLabel="Tasks Automated"
                />
              </div>

              {/* Top Time Saving */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Top Time Saving Automations
                </h4>
                <div className="space-y-2">
                  {timeSavings?.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 w-5">
                          {s.rank}
                        </span>
                        <span className="text-sm text-gray-900">
                          {s.automationName}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">
                        {s.timeSavedHours} hrs
                      </span>
                    </div>
                  ))}
                </div>
                <button className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-3 flex items-center gap-1">
                  View full report <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  placeholder="Ask Xenboox AI anything..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
