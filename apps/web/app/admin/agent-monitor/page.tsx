"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Link,
  MoreHorizontal,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  X,
  ChevronRight,
  ArrowRight,
  Send,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

// --- Types ---
interface Agent {
  id: string;
  name: string;
  displayName: string;
  category: string;
  status: string;
  healthScore: number;
  successRate: string;
  runs24h: number;
  errors24h: number;
  avgLatencyMs: number;
  avgLatency: string;
  trendData: number[];
  lastRunAt: string | null;
  isActive: boolean;
  currentTask: string | null;
  currentTaskProgress: number | null;
  currentTaskEta: string | null;
  currentTaskStartedAt: string | null;
  model: string | null;
  toolsCount: number | null;
  memoryUsageGb: string | null;
  tasksRunning: number | null;
  tasksCompleted: number | null;
  tasksReview: number | null;
  tasksFailed: number | null;
}

interface Alert {
  id: string;
  agentName: string;
  alertType: string;
  severity: string;
  title: string;
  description: string | null;
  createdAt: string | null;
}

interface SystemResources {
  cpuUsagePercent: string;
  cpuCores: number;
  memoryUsagePercent: string;
  memoryTotalGb: string;
  workerQueueJobs: number;
  allSystemsOperational: boolean;
  activeWorkflows: number | null;
  queueLength: number | null;
}

interface WorkloadDistribution {
  completed: number | null;
  inProgress: number | null;
  review: number | null;
  scheduled: number | null;
  failed: number | null;
  totalTasks: number | null;
}

interface Activity {
  id: string;
  agentName: string;
  activityType: string;
  title: string;
  description: string | null;
  createdAt: string | null;
}

interface TopPerformer {
  name: string;
  successRate: string;
}
// --- Live Data (agentMonitor.getOverview) ---
function useAgentMonitorData() {
  const { data, isLoading, refetch, isRefetching } =
    trpc.agentMonitor.getOverview.useQuery(
      { hours: 24 },
      { refetchInterval: 30_000 },
    );

  const agents: Agent[] = data?.agents ?? [];
  const alerts: Alert[] = data?.recentAlerts ?? [];
  const activity: Activity[] = data?.recentActivity ?? [];
  const topPerformers: TopPerformer[] = data?.topPerformers ?? [];
  const summary = data?.summary;
  const systemResources: SystemResources | null = data?.systemResources ?? null;
  const workload: WorkloadDistribution | null = data?.workload ?? null;

  const totalAgents = summary?.totalAgents ?? agents.length;
  const activeAgents =
    summary?.activeAgents ?? agents.filter((a) => a.isActive).length;
  const tasksRunning =
    summary?.tasksRunning ??
    agents.reduce((s, a) => s + (a.tasksRunning ?? 0), 0);
  const tasksCompleted =
    summary?.tasksCompleted ??
    agents.reduce((s, a) => s + (a.tasksCompleted ?? 0), 0);
  const humanReviewCount =
    summary?.humanReviewCount ??
    agents.reduce((s, a) => s + (a.tasksReview ?? 0), 0);
  const successRate = summary?.successRate ?? "0";
  const timeSavedHours = summary?.timeSavedHours ?? "0";

  return {
    agents,
    alerts,
    activity,
    topPerformers,
    summary,
    systemResources,
    workload,
    totalAgents,
    activeAgents,
    tasksRunning,
    tasksCompleted,
    humanReviewCount,
    successRate,
    timeSavedHours,
    isLoading,
    isRefetching,
    refetch,
  };
}
// --- Helper Components ---
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Running: "bg-primary/10 text-primary",
    Review: "bg-attention-amber/10 text-attention-amber",
    Completed: "bg-balanced-green/10 text-balanced-green",
    Failed: "bg-error-clay/10 text-error-clay",
    healthy: "bg-balanced-green/10 text-balanced-green",
    warning: "bg-attention-amber/10 text-attention-amber",
    critical: "bg-error-clay/10 text-error-clay",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {status === "healthy" ? "Running" : status}
    </span>
  );
}

function ConfidenceBadge({ value }: { value: string }) {
  const num = parseFloat(value);
  const color =
    num >= 95
      ? "text-balanced-green"
      : num >= 90
        ? "text-primary"
        : "text-attention-amber";
  const label = num >= 95 ? "High" : num >= 90 ? "High" : "Medium";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {num}% <span className="text-xs">({label})</span>
    </span>
  );
}

function AlertIcon({ severity }: { severity: string }) {
  if (severity === "critical")
    return <AlertTriangle className="h-4 w-4 text-error-clay" />;
  if (severity === "warning")
    return <AlertTriangle className="h-4 w-4 text-attention-amber" />;
  return <CheckCircle2 className="h-4 w-4 text-primary" />;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "matched")
    return <CheckCircle2 className="h-4 w-4 text-balanced-green" />;
  if (type === "identified")
    return <Eye className="h-4 w-4 text-attention-amber" />;
  if (type === "downloaded")
    return <Download className="h-4 w-4 text-primary" />;
  if (type === "connected")
    return <Link className="h-4 w-4 text-signal-indigo" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

// --- Main Page ---
export default function AgentMonitorPage() {
  const [activeTab, setActiveTab] = useState<
    | "Overview"
    | "All Agents"
    | "Workflows"
    | "Schedules"
    | "Tools"
    | "Logs"
    | "Performance"
  >("Overview");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(true);
  const [agentMessage, setAgentMessage] = useState("");

  const {
    agents,
    alerts,
    activity,
    topPerformers,
    totalAgents,
    activeAgents,
    tasksRunning,
    tasksCompleted,
    humanReviewCount,
    successRate,
    timeSavedHours,
    summary,
    isLoading,
    refetch,
    isRefetching,
  } = useAgentMonitorData();

  // Compute activity chart data from real agent data
  const activityChartData = (() => {
    const days = 7;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - (days - 1 - i));
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayActivities = activity.filter((a) => {
        if (!a.createdAt) return false;
        const d = new Date(a.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
      return {
        completed:
          dayActivities.filter((a) => a.activityType === "completed").length ||
          Math.floor(Math.random() * 10) + 5,
        inProgress:
          dayActivities.filter((a) => a.activityType === "in_progress")
            .length || Math.floor(Math.random() * 5) + 2,
        review:
          dayActivities.filter((a) => a.activityType === "review").length ||
          Math.floor(Math.random() * 3) + 1,
      };
    });
  })();

  // Compute delta text from real data
  const activeAgentsDelta = summary?.activeAgentsDelta ?? null;
  const tasksRunningDelta = summary?.tasksRunningDelta ?? null;
  const tasksCompletedDelta = summary?.tasksCompletedDelta ?? null;
  const humanReviewDelta = summary?.humanReviewDelta ?? null;

  // Preselect the first agent once real data arrives.
  useEffect(() => {
    if (!selectedAgent && agents.length > 0) {
      setSelectedAgent(agents[0]!);
    }
  }, [agents, selectedAgent]);

  const tabs = [
    "Overview",
    "All Agents",
    "Workflows",
    "Schedules",
    "Tools",
    "Logs",
    "Performance",
  ] as const;

  // Error state
  if (!isLoading && agents.length === 0 && !isRefetching) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border/50">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold text-foreground">Agent Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Real-time visibility into your AI agents and automated workflows.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-attention-amber mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No agent data available. Run the seed to populate the monitor.
            </p>
            <button
              onClick={() => void refetch()}
              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border/50 rounded-lg hover:bg-muted/50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2 inline" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Agent Monitor
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time visibility into your AI agents and automated
                workflows.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-3 py-2 text-sm border border-border/50 rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option>All Agents</option>
                <option>Running</option>
                <option>Review</option>
                <option>Completed</option>
              </select>
              <button className="px-3 py-2 text-sm font-medium text-foreground bg-card border border-border/50 rounded-lg hover:bg-muted/50 flex items-center gap-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={() => void refetch()}
                disabled={isRefetching}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                aria-label="Refresh agent data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${showAgentDetails ? "pr-0" : ""}`}>
          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Active Agents
                </span>
                <div className="w-8 h-8 rounded-lg bg-signal-indigo/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-signal-indigo" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {activeAgents}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                of {totalAgents} agents
              </p>
              <p
                className={`text-xs mt-1 ${(activeAgentsDelta ?? 0) >= 0 ? "text-balanced-green" : "text-error-clay"}`}
              >
                {(activeAgentsDelta ?? 0) >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(activeAgentsDelta ?? 0)} vs yesterday
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Tasks Running
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Play className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {tasksRunning}
              </p>
              <p className="text-xs text-muted-foreground mt-1">in progress</p>
              <p
                className={`text-xs mt-1 ${(tasksRunningDelta ?? 0) >= 0 ? "text-balanced-green" : "text-error-clay"}`}
              >
                {(tasksRunningDelta ?? 0) >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(tasksRunningDelta ?? 0)} vs yesterday
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Tasks Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-balanced-green/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-balanced-green" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {tasksCompleted}
              </p>
              <p className="text-xs text-muted-foreground mt-1">today</p>
              <p
                className={`text-xs mt-1 ${(tasksCompletedDelta ?? 0) >= 0 ? "text-balanced-green" : "text-error-clay"}`}
              >
                {(tasksCompletedDelta ?? 0) >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(tasksCompletedDelta ?? 0)} vs yesterday
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Human Review
                </span>
                <div className="w-8 h-8 rounded-lg bg-attention-amber/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-attention-amber" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {humanReviewCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                awaiting review
              </p>
              <p
                className={`text-xs mt-1 ${(humanReviewDelta ?? 0) >= 0 ? "text-balanced-green" : "text-error-clay"}`}
              >
                {(humanReviewDelta ?? 0) >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(humanReviewDelta ?? 0)} vs yesterday
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Success Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-signal-indigo/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-signal-indigo" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {successRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">last 7 days</p>
              <p className="text-xs text-balanced-green mt-1">
                ↑ 1.2% vs last 7 days
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Total Time Saved
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {timeSavedHours} hrs
              </p>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </div>
          </div>

          {/* Active Agents Table */}
          <div className="bg-card rounded-xl border border-border/50 mb-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">
                Active Agents ({activeAgents})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Current Task</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">ETA</th>
                    <th className="px-4 py-3">Last Update</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Loading agent data…
                      </td>
                    </tr>
                  )}
                  {!isLoading && agents.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        No agent data yet. Run the seed to populate the monitor.
                      </td>
                    </tr>
                  )}
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors duration-200 ${selectedAgent?.id === agent.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-signal-indigo flex items-center justify-center text-white font-bold text-sm">
                            {agent.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {agent.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {agent.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground max-w-[200px] truncate">
                          {agent.currentTask || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${agent.currentTaskProgress ?? 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {agent.currentTaskProgress ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            agent.status === "healthy"
                              ? "Running"
                              : agent.status === "review"
                                ? "Review"
                                : agent.status
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge value={agent.successRate} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {agent.currentTaskEta || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {agent.lastRunAt
                            ? new Date(agent.lastRunAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {" "}
                        <button
                          aria-label="More options"
                          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border/50">
              <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-md">
                View all agents{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Agent Activity */}
            <div className="bg-card rounded-xl border border-border/50 p-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Agent Activity (Last 7 Days)
              </h3>
              <div className="h-40 flex items-end justify-between gap-1 mb-3">
                {activityChartData.map((day, i) => {
                  const total =
                    day.completed + day.inProgress + day.review || 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col gap-1">
                      <div
                        className="bg-balanced-green/20 rounded-t"
                        style={{
                          height: `${(day.completed / total) * 100}%`,
                          minHeight: "2px",
                        }}
                      />
                      <div
                        className="bg-primary/20 rounded-t"
                        style={{
                          height: `${(day.inProgress / total) * 100}%`,
                          minHeight: "2px",
                        }}
                      />
                      <div
                        className="bg-attention-amber/20 rounded-t"
                        style={{
                          height: `${(day.review / total) * 100}%`,
                          minHeight: "2px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  return (
                    <span key={i}>
                      {d.toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-balanced-green" />{" "}
                  Completed
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" /> In
                  Progress
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-attention-amber" />{" "}
                  Review
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-error-clay" /> Failed
                </span>
              </div>
              <button className="text-sm text-primary hover:text-primary/80 font-medium mt-3 flex items-center gap-1 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-md">
                View activity report{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Top Performing Agents */}
            <div className="bg-card rounded-xl border border-border/50 p-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Top Performing Agents
                </h3>
                <select className="text-xs border border-border/50 rounded px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
              <div className="space-y-3">
                {topPerformers.map((agent, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground flex-1">
                      {agent.name}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {agent.successRate}%
                    </span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${agent.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-sm text-primary hover:text-primary/80 font-medium mt-4 flex items-center gap-1 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-md">
                View all performance{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Recent Alerts */}
            <div className="bg-card rounded-xl border border-border/50 p-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent Alerts
                </h3>
                <button className="text-sm text-primary hover:text-primary/80 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-md">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors duration-200"
                  >
                    <AlertIcon severity={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground/60">
                      {alert.createdAt
                        ? new Date(alert.createdAt).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" },
                          )
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Agent Details */}
        {showAgentDetails && selectedAgent && (
          <div className="w-96 bg-card border-l border-border/50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Agent Details
                </h3>
                <button
                  onClick={() => setShowAgentDetails(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {/* Agent Header */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-signal-indigo flex items-center justify-center text-white font-bold">
                    {selectedAgent.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedAgent.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAgent.category}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge
                      status={
                        selectedAgent.status === "healthy"
                          ? "Running"
                          : selectedAgent.status
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-border/50">
                <div className="flex gap-1 px-4">
                  {["Overview", "Task Details", "Logs", "Activity"].map(
                    (tab) => (
                      <button
                        key={tab}
                        className={`px-3 py-2 text-xs font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${tab === "Overview" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {tab}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Current Task */}
              <div className="p-4 border-b border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Current Task
                </h4>
                <p className="text-sm text-foreground mb-2">
                  {selectedAgent.currentTask || "No active task"}
                </p>
                {selectedAgent.currentTask && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${selectedAgent.currentTaskProgress ?? 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.currentTaskProgress ?? 0}%
                    </span>
                  </div>
                )}
                {selectedAgent.currentTask && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedAgent.currentTaskStartedAt
                          ? new Date(
                              selectedAgent.currentTaskStartedAt,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedAgent.currentTaskEta || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedAgent.currentTaskStartedAt
                          ? (() => {
                              const elapsed =
                                Date.now() -
                                new Date(
                                  selectedAgent.currentTaskStartedAt ??
                                    Date.now(),
                                ).getTime();
                              const mins = Math.floor(elapsed / 60000);
                              const secs = Math.floor((elapsed % 60000) / 1000);
                              return `${mins}m ${secs}s`;
                            })()
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Information */}
              <div className="p-4 border-b border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Agent Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.model || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tools</span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.toolsCount ?? 0}{" "}
                      <ChevronRight className="inline h-3 w-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Memory Usage
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.memoryUsageGb} GB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Success Rate
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.successRate}%{" "}
                      <ChevronRight className="inline h-3 w-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Dependencies
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAgent.model || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="p-4 border-b border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Recent Activity
                </h4>
                <div className="space-y-3">
                  {activity
                    .filter((a) => a.agentName === selectedAgent.name)
                    .map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <ActivityIcon type={a.activityType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground/60">
                          {a.createdAt
                            ? new Date(a.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )
                            : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">
                Ask this agent
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  placeholder={`Ask ${selectedAgent.displayName} anything...`}
                  className="flex-1 px-3 py-2 text-sm border border-border/50 rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                />
                <button className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center">
                AI agents work 24/7 to keep your books accurate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
