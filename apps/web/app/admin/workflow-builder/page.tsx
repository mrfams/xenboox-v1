"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Share,
  ChevronRight,
  Plus,
  Search,
  Copy,
  RefreshCw,
  Zap,
  Bot,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowRight,
  MoreHorizontal,
  Download,
  Pencil,
  Check,
  X,
  ChevronDown,
  FileText,
  Users,
  Database,
  Mail,
  Target,
  Sparkles,
  Workflow,
} from "lucide-react";

// --- Types ---
interface WorkflowNode {
  id: string;
  name: string;
  type: "trigger" | "ai_agent" | "action" | "condition" | "approval" | "review";
  x: number;
  y: number;
  status: "completed" | "running" | "pending" | "error" | "active";
  icon: string;
  color: string;
  description?: string;
  confidence?: number;
  stepNumber?: number;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: "solid" | "dashed";
}

interface WorkflowInsight {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

interface Suggestion {
  title: string;
  description: string;
  impact: string;
}

interface AgentComponent {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface PerformanceMetric {
  label: string;
  value: string;
  color: string;
}

interface RunStatus {
  label: string;
  count: number;
  percentage: string;
  color: string;
}

// --- Live Data (workflowBuilder router) ---
import { trpc } from "@/lib/trpc/client";

const NODE_ICONS: Record<string, string> = {
  trigger: "email",
  ai_agent: "bot",
  action: "file",
  condition: "check",
  approval: "users",
  review: "users",
};

const NODE_COLORS: Record<string, string> = {
  trigger: "bg-emerald-100 border-emerald-300",
  ai_agent: "bg-purple-100 border-purple-300",
  action: "bg-emerald-100 border-emerald-300",
  condition: "bg-amber-100 border-amber-300",
  approval: "bg-indigo-100 border-indigo-300",
  review: "bg-indigo-100 border-indigo-300",
};

function useWorkflowBuilderData() {
  const workflows = trpc.workflowBuilder.getWorkflows.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const first = workflows.data?.[0];
  const workflowId = first?.id ?? "";

  const detail = trpc.workflowBuilder.getWorkflowDetail.useQuery(
    { workflowId },
    { enabled: !!workflowId, refetchInterval: 30_000 },
  );

  const perf = trpc.workflowBuilder.getPerformance.useQuery(
    { workflowId },
    { enabled: !!workflowId, refetchInterval: 60_000 },
  );

  const wf = detail.data?.workflow;
  const latestRun = detail.data?.latestRun;
  const versions = detail.data?.versions ?? [];

  const nodes: WorkflowNode[] = (detail.data?.nodes ?? []).map((n, i) => ({
    id: n.id,
    name: n.name,
    type: n.type as WorkflowNode["type"],
    x: n.x ?? 0,
    y: n.y ?? 0,
    status:
      latestRun && i < (latestRun.completedSteps ?? 0)
        ? "completed"
        : latestRun && i === (latestRun.completedSteps ?? 0)
          ? "running"
          : "pending",
    icon: NODE_ICONS[n.type] ?? "bot",
    color: NODE_COLORS[n.type] ?? "bg-gray-100 border-gray-300",
    description: (n.config as { description?: string })?.description ?? n.name,
    confidence: n.confidenceThreshold ?? undefined,
    stepNumber: n.stepNumber ?? i + 1,
  }));

  const edges: WorkflowEdge[] = (detail.data?.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    type: e.condition ? "dashed" : "solid",
  }));

  const totalRuns = perf.data?.totalRuns ?? 0;
  const successRate = perf.data?.successRate ?? 0;
  const avgDuration = perf.data?.avgDuration ?? "0";

  const performanceMetrics: PerformanceMetric[] = [
    {
      label: "Success Rate",
      value: `${successRate}%`,
      color: "bg-emerald-500",
    },
    { label: "Avg Duration", value: `${avgDuration}s`, color: "bg-blue-500" },
    { label: "Total Runs", value: String(totalRuns), color: "bg-purple-500" },
    {
      label: "Steps",
      value: String(wf?.totalSteps ?? nodes.length),
      color: "bg-amber-500",
    },
  ];

  const runStatuses: RunStatus[] = latestRun
    ? [
        {
          label: "Last Run",
          count: 1,
          percentage: latestRun.status === "completed" ? "100%" : "0%",
          color:
            latestRun.status === "completed"
              ? "bg-emerald-500"
              : "bg-amber-500",
        },
        {
          label: "Steps Done",
          count: latestRun.completedSteps ?? 0,
          percentage: `${latestRun.completedSteps ?? 0}/${latestRun.totalSteps ?? 0}`,
          color: "bg-blue-500",
        },
      ]
    : [];

  return {
    workflows: workflows.data ?? [],
    nodes,
    edges,
    versions,
    latestRun,
    workflowName: wf?.name ?? first?.name ?? "New Workflow",
    workflowStatus: wf?.status ?? first?.status ?? "Active",
    workflowVersion: wf?.version ?? versions[0]?.version ?? "v1.0",
    performanceMetrics,
    runStatuses,
    totalRuns,
    successRate,
    avgDuration,
    isLoading: workflows.isLoading || (!!workflowId && detail.isLoading),
    refetch: () => {
      void workflows.refetch();
      void detail.refetch();
      void perf.refetch();
    },
  };
}

// --- Static builder chrome (component palette + copilot content) ---
const paletteAgents: AgentComponent[] = [
  {
    name: "Extraction Agent",
    description: "Extract invoice data using OCR + AI",
    icon: <Bot className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-100",
  },
  {
    name: "Validation Agent",
    description: "Validate data accuracy & completeness",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    name: "Categorization Agent",
    description: "Map to chart of accounts",
    icon: <Layers className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-100",
  },
  {
    name: "Matching Agent",
    description: "Match with POs & GRNs",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-100",
  },
  {
    name: "Exception Agent",
    description: "Handle exceptions intelligently",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-600 bg-red-100",
  },
  {
    name: "Posting Agent",
    description: "Post entries to ledger",
    icon: <Database className="h-4 w-4" />,
    color: "text-indigo-600 bg-indigo-100",
  },
];

const copilotInsights: WorkflowInsight[] = [
  {
    label: "Success Prediction",
    value: "High (97%)",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-emerald-600",
  },
  {
    label: "Estimated Time Saved",
    value: "3.4 hrs / week",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-600",
  },
  {
    label: "Error Reduction",
    value: "82%",
    icon: <Target className="h-4 w-4" />,
    color: "text-purple-600",
  },
  {
    label: "Cost Impact",
    value: "GMD 12,450 / month",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-amber-600",
  },
];

const copilotSuggestions: Suggestion[] = [
  {
    title: "Add vendor duplicate check",
    description: "Reduce duplicates by 64%",
    impact: "High",
  },
  {
    title: "Auto-match purchase orders",
    description: "Increase accuracy by 17%",
    impact: "Medium",
  },
  {
    title: "Route high risk invoices",
    description: "Reduce fraud risk",
    impact: "High",
  },
];

// --- Helper Components ---
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Running: "bg-blue-100 text-blue-700 border-blue-200",
    Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Error: "bg-red-100 text-red-700 border-red-200",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
    Failed: "bg-red-100 text-red-700 border-red-200",
    Success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

function StepIndicator({ step, status }: { step: number; status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500 text-white",
    running: "bg-blue-500 text-white",
    pending: "bg-gray-200 text-gray-500",
    error: "bg-red-500 text-white",
  };
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${colors[status] || colors.pending}`}
    >
      {status === "completed" ? <Check className="h-3 w-3" /> : step}
    </div>
  );
}

// --- Canvas Node Component ---
function CanvasNode({ node }: { node: WorkflowNode }) {
  const iconMap: Record<string, React.ReactNode> = {
    email: <Mail className="h-5 w-5" />,
    bot: <Bot className="h-5 w-5" />,
    check: <CheckCircle2 className="h-5 w-5" />,
    layers: <Layers className="h-5 w-5" />,
    alert: <AlertTriangle className="h-5 w-5" />,
    file: <FileText className="h-5 w-5" />,
    users: <Users className="h-5 w-5" />,
  };

  const borderColor: Record<string, string> = {
    completed: "border-emerald-400",
    running: "border-blue-400 animate-pulse",
    pending: "border-gray-300",
    error: "border-red-400",
    active: "border-blue-400",
  };

  return (
    <div
      className={`absolute flex flex-col items-center gap-1`}
      style={{ left: node.x, top: node.y }}
    >
      <div
        className={`w-16 h-16 rounded-xl ${node.color} ${borderColor[node.status]} border-2 flex items-center justify-center shadow-sm`}
      >
        {iconMap[node.icon] || <Zap className="h-5 w-5" />}
      </div>
      <span className="text-xs font-medium text-gray-700 text-center max-w-[100px]">
        {node.name}
      </span>
      {node.description && (
        <span className="text-[10px] text-gray-500 text-center max-w-[100px]">
          {node.description}
        </span>
      )}
      {node.confidence !== undefined && (
        <span className="text-[10px] text-emerald-600 font-medium">
          ✓ {node.confidence}% confidence
        </span>
      )}
      {node.status === "completed" && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
      {node.status === "error" && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <X className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function WorkflowBuilderPage() {
  const {
    nodes,
    edges,
    versions,
    latestRun,
    workflowName,
    workflowStatus,
    workflowVersion,
    performanceMetrics,
    runStatuses,
    totalRuns,
    successRate,
    avgDuration,
    isLoading,
    refetch,
  } = useWorkflowBuilderData();

  const [activeTab, setActiveTab] = useState<
    "Builder" | "Config" | "Runs" | "Versions" | "Permissions" | "Audit Trail"
  >("Builder");
  const [activeComponentTab, setActiveComponentTab] = useState<
    "Agents" | "Tools" | "Conditions" | "Integrations"
  >("Agents");
  const [autoSave, setAutoSave] = useState(true);
  const [version, setVersion] = useState(workflowVersion);
  const [showCopilot, setShowCopilot] = useState(true);
  const [testRunTab, setTestRunTab] = useState<"output" | "extracted">(
    "output",
  );

  const tabs = [
    "Builder",
    "Config",
    "Runs",
    "Versions",
    "Permissions",
    "Audit Trail",
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  AI Workflow Builder
                </h1>
                <p className="text-sm text-gray-500">
                  Design, test, and deploy AI-powered accounting workflows.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Share className="h-4 w-4" />
                Share
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Test Run
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                Publish
                <ChevronDown className="h-4 w-4" />
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

      {/* Breadcrumb & Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </button>{" "}
            <span>New Workflow</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{workflowName}</span>
            <StatusBadge status={workflowStatus} />
            <button className="text-gray-400 hover:text-gray-600">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-emerald-500">●</span>
              Saved 2 min ago
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Refresh workflow data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>{" "}
              <button
                aria-label="Move right"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Auto-save</span>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoSave ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoSave ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value={workflowVersion}>{workflowVersion}</option>
              {versions.slice(0, 4).map((v) => (
                <option key={v.id} value={v.version}>
                  {v.version}
                </option>
              ))}
            </select>{" "}
            <button
              aria-label="More options"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Left Panel - Tools & Components */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Tools */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <button className="p-2 text-indigo-600 bg-indigo-50 rounded-lg">
                <Target className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                <Plus className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                <Search className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                <Layers className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Workflow Components */}
          <div className="flex-1 overflow-auto">
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Workflow Components
              </h3>
              <div className="flex gap-1 mb-3">
                {(
                  ["Agents", "Tools", "Conditions", "Integrations"] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveComponentTab(tab)}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      activeComponentTab === tab
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {paletteAgents.map((agent, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${agent.color}`}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {agent.description}
                      </p>
                    </div>{" "}
                    <button
                      aria-label="Add item"
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full mt-3 px-3 py-2 text-sm font-medium text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Agent
              </button>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-gray-50 relative overflow-auto">
          <div
            className="absolute inset-0"
            style={{ minWidth: 900, minHeight: 400 }}
          >
            {/* Edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ minWidth: 900, minHeight: 400 }}
            >
              {edges.map((edge) => {
                const source = nodes.find((n) => n.id === edge.source);
                const target = nodes.find((n) => n.id === edge.target);
                if (!source || !target) return null;

                const sx = source.x + 32;
                const sy = source.y + 32;
                const tx = target.x + 32;
                const ty = target.y + 32;

                const midX = (sx + tx) / 2;

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
                      stroke={edge.type === "dashed" ? "#ef4444" : "#6366f1"}
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={edge.type === "dashed" ? "6 3" : "none"}
                    />
                    {edge.label && (
                      <text
                        x={midX}
                        y={(sy + ty) / 2 - 5}
                        textAnchor="middle"
                        className="text-xs font-medium"
                        fill={edge.label === "Yes" ? "#10b981" : "#ef4444"}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {isLoading && nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Loading workflow…
              </div>
            )}
            {nodes.map((node) => (
              <CanvasNode key={node.id} node={node} />
            ))}
          </div>
        </div>

        {/* Right Panel - AI Copilot */}
        {showCopilot && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Xenboox AI Copilot
                    </p>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded">
                      Beta
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCopilot(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Workflow Insights */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Workflow Insights
                </h4>
                <div className="space-y-2">
                  {copilotInsights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={insight.color}>{insight.icon}</span>
                        <span className="text-sm text-gray-700">
                          {insight.label}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {insight.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Suggestions
                </h4>
                <div className="space-y-2">
                  {copilotSuggestions.map((s, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {s.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.description}
                          </p>
                        </div>
                        <button className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Test */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Workflow Test
                </h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {latestRun
                        ? `Last run: ${latestRun.completedSteps ?? 0}/${latestRun.totalSteps ?? 0} steps`
                        : "No runs yet"}
                    </span>
                    <StatusBadge
                      status={
                        latestRun?.status === "completed"
                          ? "Success"
                          : (latestRun?.status ?? "Pending")
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Total Runs</p>
                      <p className="text-lg font-bold text-gray-900">
                        {totalRuns.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg. Duration</p>
                      <p className="text-lg font-bold text-gray-900">
                        {avgDuration}s
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">Success Rate</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {successRate}%
                    </p>
                  </div>
                  {/* Mini chart */}
                  <div className="mt-3 h-16 bg-white rounded-lg border border-gray-200 flex items-end justify-between px-2 pb-2 gap-1">
                    {[65, 72, 68, 75, 80, 78, 85, 82, 88, 90, 87, 92].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-indigo-200 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Workflow Performance */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Workflow Performance
                  </h4>
                  <select className="text-xs border border-gray-200 rounded px-2 py-1">
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>Last 3 Months</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {performanceMetrics.map((metric, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{metric.label}</span>
                        <span className="font-medium text-gray-900">
                          {metric.value}
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.color}`}
                          style={{ width: metric.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Run Status Breakdown */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-3">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray={`${Math.min(successRate, 100)} ${Math.max(100 - successRate, 0)}`}
                          strokeDashoffset="25"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeDasharray={`${Math.max(100 - successRate, 0)} ${Math.min(successRate, 100)}`}
                          strokeDashoffset="73.6"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {totalRuns.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-500">Runs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {runStatuses.map((status, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${status.color}`}
                          />
                          <span className="text-gray-600">{status.label}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {status.count.toLocaleString()} ({status.percentage})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <button className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    Simulate with sample data
                  </button>
                  <button className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <Download className="h-4 w-4 text-indigo-500" />
                    Export workflow JSON
                  </button>
                  <button className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <Copy className="h-4 w-4 text-indigo-500" />
                    Clone this workflow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel - Test Run Output & Extracted Data */}
      <div className="bg-white border-t border-gray-200">
        <div className="flex">
          {/* Workflow Components Detail */}
          <div className="w-1/3 border-r border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Workflow Components
            </h3>
            <div className="flex gap-1 mb-3">
              {(["Agents", "Tools", "Conditions", "Integrations"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveComponentTab(tab)}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      activeComponentTab === tab
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
            <div className="space-y-2">
              {paletteAgents.map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${agent.color}`}
                  >
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {agent.description}
                    </p>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-indigo-600">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 px-3 py-2 text-sm font-medium text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add Custom Agent
            </button>
          </div>

          {/* Test Run Output */}
          <div className="w-1/3 border-r border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Test Run Output
              </h3>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View Full Log <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">
                Run completed successfully
              </span>
            </div>
            <div className="space-y-1">
              {nodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-3 py-1.5">
                  <StepIndicator
                    step={i + 1}
                    status={
                      latestRun && i < (latestRun.completedSteps ?? 0)
                        ? "completed"
                        : "pending"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {node.name}
                    </p>
                    {node.description && (
                      <p className="text-xs text-gray-500">
                        {node.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">—</span>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Data */}
          <div className="w-1/3 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setTestRunTab("output")}
                  className={`text-sm font-medium ${testRunTab === "output" ? "text-indigo-600" : "text-gray-500"}`}
                >
                  Extracted Data
                </button>
                <button
                  onClick={() => setTestRunTab("extracted")}
                  className={`text-sm font-medium ${testRunTab === "extracted" ? "text-indigo-600" : "text-gray-500"}`}
                >
                  Journal Entry
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {!latestRun ? (
                <p className="text-sm text-gray-500">
                  No test run yet. Run the workflow to see extracted data.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {latestRun.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Steps</span>
                    <span className="text-sm font-medium text-gray-900">
                      {latestRun.completedSteps ?? 0} /{" "}
                      {latestRun.totalSteps ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">
                      Fields Extracted
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {latestRun.fieldsExtracted ?? 0} /{" "}
                      {latestRun.fieldsTotal ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Confidence</span>
                    <span className="text-sm font-medium text-gray-900">
                      {latestRun.confidence ?? "—"}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-gray-900">
                      {latestRun.durationMinutes ?? "—"} min
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
