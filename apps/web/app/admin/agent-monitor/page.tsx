"use client";

import { useState } from "react";
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

// --- Mock Data (would come from API) ---
const mockAgents: Agent[] = [
  {
    id: "1",
    name: "bank_reconciler",
    displayName: "Bank Reconciler",
    category: "Reconciliation Agent",
    status: "healthy",
    healthScore: 96,
    successRate: "98.9",
    runs24h: 1245,
    errors24h: 14,
    avgLatencyMs: 1850,
    avgLatency: "1.85",
    trendData: [85, 92, 88, 95, 90, 94, 96],
    lastRunAt: "2025-05-30T10:32:00Z",
    isActive: true,
    currentTask: "Reconcile GTBank **** 6789 May 2025 transactions",
    currentTaskProgress: 78,
    currentTaskEta: "2m",
    currentTaskStartedAt: "2025-05-30T10:15:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 5,
    memoryUsageGb: "1.2",
    tasksRunning: 3,
    tasksCompleted: 45,
    tasksReview: 2,
    tasksFailed: 0,
  },
  {
    id: "2",
    name: "invoice_processor",
    displayName: "Invoice Processor",
    category: "Document Agent",
    status: "healthy",
    healthScore: 94,
    successRate: "98.1",
    runs24h: 1980,
    errors24h: 34,
    avgLatencyMs: 2450,
    avgLatency: "2.45",
    trendData: [88, 90, 92, 89, 93, 91, 94],
    lastRunAt: "2025-05-30T10:31:00Z",
    isActive: true,
    currentTask: "Process 23 uploaded invoices Extracting data with OCR",
    currentTaskProgress: 45,
    currentTaskEta: "6m",
    currentTaskStartedAt: "2025-05-30T10:25:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "0.8",
    tasksRunning: 2,
    tasksCompleted: 38,
    tasksReview: 3,
    tasksFailed: 1,
  },
  {
    id: "3",
    name: "payroll_assistant",
    displayName: "Payroll Assistant",
    category: "Payroll Agent",
    status: "healthy",
    healthScore: 93,
    successRate: "96.8",
    runs24h: 1320,
    errors24h: 42,
    avgLatencyMs: 1880,
    avgLatency: "1.88",
    trendData: [86, 89, 91, 88, 92, 90, 93],
    lastRunAt: "2025-05-30T10:30:00Z",
    isActive: true,
    currentTask: "Prepare May 2025 payroll Calculating salaries & taxes",
    currentTaskProgress: 62,
    currentTaskEta: "12m",
    currentTaskStartedAt: "2025-05-30T10:18:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 6,
    memoryUsageGb: "0.9",
    tasksRunning: 1,
    tasksCompleted: 28,
    tasksReview: 1,
    tasksFailed: 0,
  },
  {
    id: "4",
    name: "journal_entry_agent",
    displayName: "Journal Entry Agent",
    category: "Accounting Agent",
    status: "healthy",
    healthScore: 97,
    successRate: "97.6",
    runs24h: 2842,
    errors24h: 68,
    avgLatencyMs: 2110,
    avgLatency: "2.11",
    trendData: [90, 93, 91, 95, 94, 96, 97],
    lastRunAt: "2025-05-30T10:29:00Z",
    isActive: true,
    currentTask: "Categorize 18 transactions Auto-categorizing expenses",
    currentTaskProgress: 88,
    currentTaskEta: "1m",
    currentTaskStartedAt: "2025-05-30T10:28:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 3,
    memoryUsageGb: "0.6",
    tasksRunning: 4,
    tasksCompleted: 52,
    tasksReview: 1,
    tasksFailed: 0,
  },
  {
    id: "5",
    name: "ap_payment_scanner",
    displayName: "AP Payment Scanner",
    category: "Bill Processing Agent",
    status: "healthy",
    healthScore: 91,
    successRate: "95.6",
    runs24h: 1542,
    errors24h: 68,
    avgLatencyMs: 2090,
    avgLatency: "2.09",
    trendData: [84, 87, 89, 86, 90, 88, 91],
    lastRunAt: "2025-05-30T10:28:00Z",
    isActive: true,
    currentTask: "Scan & process 12 bills Matching with POs",
    currentTaskProgress: 35,
    currentTaskEta: "8m",
    currentTaskStartedAt: "2025-05-30T10:20:00Z",
    model: "Claude 3.5 Haiku",
    toolsCount: 4,
    memoryUsageGb: "0.7",
    tasksRunning: 2,
    tasksCompleted: 32,
    tasksReview: 2,
    tasksFailed: 1,
  },
  {
    id: "6",
    name: "tax_compliance",
    displayName: "Tax Compliance",
    category: "Tax Agent",
    status: "healthy",
    healthScore: 95,
    successRate: "95.7",
    runs24h: 420,
    errors24h: 18,
    avgLatencyMs: 3200,
    avgLatency: "3.20",
    trendData: [88, 90, 92, 89, 93, 91, 95],
    lastRunAt: "2025-05-30T10:27:00Z",
    isActive: true,
    currentTask: "VAT return preparation Collecting required data",
    currentTaskProgress: 20,
    currentTaskEta: "25m",
    currentTaskStartedAt: "2025-05-30T10:02:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 5,
    memoryUsageGb: "1.1",
    tasksRunning: 1,
    tasksCompleted: 18,
    tasksReview: 1,
    tasksFailed: 0,
  },
  {
    id: "7",
    name: "forecasting_agent",
    displayName: "Forecasting Agent",
    category: "Analytics Agent",
    status: "review",
    healthScore: 89,
    successRate: "96.5",
    runs24h: 580,
    errors24h: 20,
    avgLatencyMs: 2650,
    avgLatency: "2.65",
    trendData: [82, 85, 87, 84, 88, 86, 89],
    lastRunAt: "2025-05-30T10:26:00Z",
    isActive: true,
    currentTask: "Cash flow forecast Analyzing trends",
    currentTaskProgress: 90,
    currentTaskEta: "3m",
    currentTaskStartedAt: "2025-05-30T10:23:00Z",
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "1.4",
    tasksRunning: 1,
    tasksCompleted: 22,
    tasksReview: 3,
    tasksFailed: 0,
  },
  {
    id: "8",
    name: "expense_auditor",
    displayName: "Expense Auditor",
    category: "Audit Agent",
    status: "review",
    healthScore: 87,
    successRate: "95.1",
    runs24h: 380,
    errors24h: 19,
    avgLatencyMs: 2180,
    avgLatency: "2.18",
    trendData: [80, 83, 85, 82, 86, 84, 87],
    lastRunAt: "2025-05-30T10:25:00Z",
    isActive: true,
    currentTask: "Review 30 flagged expenses Checking for duplicates",
    currentTaskProgress: 70,
    currentTaskEta: "5m",
    currentTaskStartedAt: "2025-05-30T10:20:00Z",
    model: "Claude 3.5 Haiku",
    toolsCount: 3,
    memoryUsageGb: "0.5",
    tasksRunning: 1,
    tasksCompleted: 15,
    tasksReview: 4,
    tasksFailed: 2,
  },
];

const mockAlerts: Alert[] = [
  {
    id: "1",
    agentName: "expense_auditor",
    alertType: "high_error_rate",
    severity: "critical",
    title: "High error rate detected",
    description: "Expense Auditor has 5 failed tasks",
    createdAt: "2025-05-30T10:22:00Z",
  },
  {
    id: "2",
    agentName: "payroll_assistant",
    alertType: "human_review_required",
    severity: "warning",
    title: "Human review required",
    description: "7 tasks are waiting for your review",
    createdAt: "2025-05-30T10:18:00Z",
  },
  {
    id: "3",
    agentName: "cash_flow_forecasting",
    alertType: "agent_deployed",
    severity: "info",
    title: "New agent available",
    description: "Fixed Asset Manager is ready to use",
    createdAt: "2025-05-30T09:45:00Z",
  },
];

const mockSystemResources: SystemResources = {
  cpuUsagePercent: "24",
  cpuCores: 16,
  memoryUsagePercent: "48",
  memoryTotalGb: "64.0",
  workerQueueJobs: 7,
  allSystemsOperational: true,
  activeWorkflows: 18,
  queueLength: 7,
};

const mockWorkload: WorkloadDistribution = {
  completed: 68,
  inProgress: 24,
  review: 22,
  scheduled: 28,
  failed: 14,
  totalTasks: 156,
};

const mockActivity: Activity[] = [
  {
    id: "1",
    agentName: "bank_reconciler",
    activityType: "matched",
    title: "Matched 48 transactions",
    description: "Auto-matched with high confidence",
    createdAt: "2025-05-30T10:32:00Z",
  },
  {
    id: "2",
    agentName: "invoice_processor",
    activityType: "identified",
    title: "Identified 2 possible matches",
    description: "Awaiting confirmation",
    createdAt: "2025-05-30T10:30:00Z",
  },
  {
    id: "3",
    agentName: "bank_reconciler",
    activityType: "downloaded",
    title: "Downloaded 256 transactions",
    description: "From GTBank **** 6789",
    createdAt: "2025-05-30T10:28:00Z",
  },
  {
    id: "4",
    agentName: "bank_reconciler",
    activityType: "connected",
    title: "Connected to bank",
    description: "Secure connection established",
    createdAt: "2025-05-30T10:25:00Z",
  },
];

const mockTopPerformers: TopPerformer[] = [
  { name: "Bank Reconciler", successRate: "98.9" },
  { name: "Invoice Processor", successRate: "98.1" },
  { name: "Journal Entry Agent", successRate: "97.6" },
  { name: "Payroll Assistant", successRate: "96.8" },
  { name: "Tax Compliance", successRate: "95.7" },
];

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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(
    mockAgents[0],
  );
  const [showAgentDetails, setShowAgentDetails] = useState(true);
  const [agentMessage, setAgentMessage] = useState("");

  const tabs = [
    "Overview",
    "All Agents",
    "Workflows",
    "Schedules",
    "Tools",
    "Logs",
    "Performance",
  ] as const;

  // Calculate stats
  const activeAgents = mockAgents.filter((a) => a.isActive).length;
  const totalAgents = 28;
  const tasksRunning = mockAgents.reduce((sum, a) => sum + a.tasksRunning, 0);
  const tasksCompleted = mockAgents.reduce(
    (sum, a) => sum + a.tasksCompleted,
    0,
  );
  const humanReviewCount = mockAgents.reduce(
    (sum, a) => sum + a.tasksReview,
    0,
  );

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
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <RefreshCw className="h-4 w-4" />
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
              <p className="text-2xl font-bold text-gray-900">98.6%</p>
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
              <p className="text-2xl font-bold text-gray-900">47.3 hrs</p>
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
                  {mockAgents.map((agent) => (
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
                {mockTopPerformers.map((agent, i) => (
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
                {mockAlerts.map((alert) => (
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
                  {mockActivity
                    .filter((a) => a.agentName === selectedAgent.name)
                    .map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <ActivityIcon type={activity.activityType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {activity.createdAt
                            ? new Date(activity.createdAt).toLocaleTimeString(
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
