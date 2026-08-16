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
  currentTaskProgress: number;
  currentTaskEta: string | null;
  currentTaskStartedAt: string | null;
  model: string | null;
  toolsCount: number;
  memoryUsageGb: string | null;
  tasksRunning: number;
  tasksCompleted: number;
  tasksReview: number;
  tasksFailed: number;
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
  activeWorkflows: number;
  queueLength: number;
}

interface WorkloadDistribution {
  completed: number;
  inProgress: number;
  review: number;
  scheduled: number;
  failed: number;
  totalTasks: number;
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
export function useAgentMonitorData() {
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
    summary?.tasksRunning ?? agents.reduce((s, a) => s + a.tasksRunning, 0);
  const tasksCompleted =
    summary?.tasksCompleted ?? agents.reduce((s, a) => s + a.tasksCompleted, 0);
  const humanReviewCount =
    summary?.humanReviewCount ?? agents.reduce((s, a) => s + a.tasksReview, 0);
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
    Running: "bg-blue-100 text-blue-700",
    Review: "bg-amber-100 text-amber-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Failed: "bg-red-100 text-red-700",
    healthy: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status === "healthy" ? "Running" : status}
    </span>
  );
}

function ConfidenceBadge({ value }: { value: string }) {
  const num = parseFloat(value);
  const color =
    num >= 95
      ? "text-emerald-600"
      : num >= 90
        ? "text-blue-600"
        : "text-amber-600";
  const label = num >= 95 ? "High" : num >= 90 ? "High" : "Medium";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {num}% <span className="text-xs">({label})</span>
    </span>
  );
}

function AlertIcon({ severity }: { severity: string }) {
  if (severity === "critical")
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (severity === "warning")
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "matched")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (type === "identified") return <Eye className="h-4 w-4 text-amber-500" />;
  if (type === "downloaded")
    return <Download className="h-4 w-4 text-blue-500" />;
  if (type === "connected") return <Link className="h-4 w-4 text-indigo-500" />;
  return <Activity className="h-4 w-4 text-gray-500" />;
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
    isLoading,
    refetch,
    isRefetching,
  } = useAgentMonitorData();

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agent Monitor</h1>
              <p className="text-sm text-gray-500">
                Real-time visibility into your AI agents and automated
                workflows.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option>All Agents</option>
                <option>Running</option>
                <option>Review</option>
                <option>Completed</option>
              </select>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={() => void refetch()}
                disabled={isRefetching}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
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
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
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
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Active Agents</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activeAgents}</p>
              <p className="text-xs text-gray-500 mt-1">
                of {totalAgents} agents
              </p>
              <p className="text-xs text-emerald-600 mt-1">↑ 3 vs yesterday</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Tasks Running</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Play className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{tasksRunning}</p>
              <p className="text-xs text-gray-500 mt-1">in progress</p>
              <p className="text-xs text-emerald-600 mt-1">↑ 8 vs yesterday</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Tasks Completed</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {tasksCompleted}
              </p>
              <p className="text-xs text-gray-500 mt-1">today</p>
              <p className="text-xs text-emerald-600 mt-1">
                ↑ 18.4% vs yesterday
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Human Review</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {humanReviewCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">awaiting review</p>
              <p className="text-xs text-red-600 mt-1">↓ 2 vs yesterday</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Success Rate</span>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
              <p className="text-xs text-gray-500 mt-1">last 7 days</p>
              <p className="text-xs text-emerald-600 mt-1">
                ↑ 1.2% vs last 7 days
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Time Saved</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-cyan-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {timeSavedHours} hrs
              </p>
              <p className="text-xs text-gray-500 mt-1">this month</p>
              <p className="text-xs text-emerald-600 mt-1">↑ 12.7 hrs vs Apr</p>
            </div>
          </div>

          {/* Active Agents Table */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Active Agents ({activeAgents})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <tbody className="divide-y divide-gray-100">
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        Loading agent data…
                      </td>
                    </tr>
                  )}
                  {!isLoading && agents.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No agent data yet. Run the seed to populate the monitor.
                      </td>
                    </tr>
                  )}
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedAgent?.id === agent.id ? "bg-indigo-50" : ""}`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {agent.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {agent.displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {agent.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 max-w-[200px] truncate">
                          {agent.currentTask || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${agent.currentTaskProgress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {agent.currentTaskProgress}%
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
                        <span className="text-sm text-gray-600">
                          {agent.currentTaskEta || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {agent.lastRunAt
                            ? new Date(agent.lastRunAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View all agents <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Agent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Agent Activity (Last 7 Days)
              </h3>
              <div className="h-40 flex items-end justify-between gap-1 mb-3">
                {[65, 72, 68, 75, 80, 78, 85].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div
                      className="h-20 bg-emerald-100 rounded-t"
                      style={{ height: `${h * 0.6}%` }}
                    />
                    <div
                      className="h-16 bg-blue-100 rounded-t"
                      style={{ height: `${h * 0.3}%` }}
                    />
                    <div
                      className="h-8 bg-amber-100 rounded-t"
                      style={{ height: `${h * 0.15}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>May 24</span>
                <span>May 25</span>
                <span>May 26</span>
                <span>May 27</span>
                <span>May 28</span>
                <span>May 29</span>
                <span>May 30</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                  Completed
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> In
                  Progress
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Review
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" /> Failed
                </span>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-3 flex items-center gap-1">
                View activity report <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Top Performing Agents */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Top Performing Agents
                </h3>
                <select className="text-xs border border-gray-200 rounded px-2 py-1">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
              <div className="space-y-3">
                {topPerformers.map((agent, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-900 flex-1">
                      {agent.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {agent.successRate}%
                    </span>
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${agent.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-4 flex items-center gap-1">
                View all performance <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Recent Alerts
                </h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-700">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <AlertIcon severity={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {alert.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
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
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Agent Details
                </h3>
                <button
                  onClick={() => setShowAgentDetails(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {/* Agent Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {selectedAgent.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedAgent.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
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
              <div className="border-b border-gray-100">
                <div className="flex gap-1 px-4">
                  {["Overview", "Task Details", "Logs", "Activity"].map(
                    (tab) => (
                      <button
                        key={tab}
                        className={`px-3 py-2 text-xs font-medium ${tab === "Overview" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {tab}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Current Task */}
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Current Task
                </h4>
                <p className="text-sm text-gray-900 mb-2">
                  {selectedAgent.currentTask || "No active task"}
                </p>
                {selectedAgent.currentTask && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${selectedAgent.currentTaskProgress}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedAgent.currentTaskProgress}%
                    </span>
                  </div>
                )}
                {selectedAgent.currentTask && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Started</p>
                      <p className="text-sm font-medium text-gray-900">
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
                      <p className="text-xs text-gray-500">ETA</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedAgent.currentTaskEta || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-sm font-medium text-gray-900">
                        17m 32s
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Information */}
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Agent Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Model</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedAgent.model || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tools</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedAgent.toolsCount}{" "}
                      <ChevronRight className="inline h-3 w-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory Usage</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedAgent.memoryUsageGb} GB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedAgent.successRate}%{" "}
                      <ChevronRight className="inline h-3 w-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Dependencies</span>
                    <span className="text-sm font-medium text-gray-900">
                      Bank Connector{" "}
                      <CheckCircle2 className="inline h-3 w-3 text-emerald-500" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Recent Activity
                </h4>
                <div className="space-y-3">
                  {activity
                    .filter((a) => a.agentName === selectedAgent.name)
                    .map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <ActivityIcon type={a.activityType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{a.title}</p>
                          <p className="text-xs text-gray-500">
                            {a.description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
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
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Ask this agent</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  placeholder={`Ask ${selectedAgent.displayName} anything...`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                AI agents work 24/7 to keep your books accurate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
