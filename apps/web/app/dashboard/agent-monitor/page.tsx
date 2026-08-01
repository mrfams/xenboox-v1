"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  Bot,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Activity,
  FileText,
  RefreshCw,
  Settings,
  Play,
  Pause,
  BarChart3,
  Target,
  Timer,
  BrainCircuit,
  Cpu,
  Users,
  Zap,
  Shield,
  Eye,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockAgents = [
  {
    id: "1",
    name: "Bank Reconciler",
    type: "Reconciliation Agent",
    currentTask: "Reconcile GTBank •••• 6789 May 2025 transactions",
    progress: 78,
    status: "Running",
    confidence: 96,
    eta: "2m",
    lastUpdate: "10:32 AM",
    icon: RefreshCw,
    color: "bg-blue-500",
  },
  {
    id: "2",
    name: "Invoice Processor",
    type: "Document Agent",
    currentTask: "Process 23 uploaded invoices Extracting data with OCR",
    progress: 45,
    status: "Running",
    confidence: 94,
    eta: "6m",
    lastUpdate: "10:31 AM",
    icon: FileText,
    color: "bg-emerald-500",
  },
  {
    id: "3",
    name: "Payroll Assistant",
    type: "Payroll Agent",
    currentTask: "Prepare May 2025 payroll Calculating salaries & taxes",
    progress: 62,
    status: "Running",
    confidence: 93,
    eta: "12m",
    lastUpdate: "10:30 AM",
    icon: Users,
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "Journal Entry Agent",
    type: "Accounting Agent",
    currentTask: "Categorize 18 transactions Auto-categorizing expenses",
    progress: 88,
    status: "Running",
    confidence: 97,
    eta: "1m",
    lastUpdate: "10:29 AM",
    icon: FileText,
    color: "bg-amber-500",
  },
  {
    id: "5",
    name: "AP Payment Scanner",
    type: "Bill Processing Agent",
    currentTask: "Scan & process 12 bills Matching with POs",
    progress: 35,
    status: "Running",
    confidence: 91,
    eta: "8m",
    lastUpdate: "10:28 AM",
    icon: Eye,
    color: "bg-indigo-500",
  },
  {
    id: "6",
    name: "Tax Compliance",
    type: "Tax Agent",
    currentTask: "VAT return preparation Collecting required data",
    progress: 20,
    status: "Running",
    confidence: 95,
    eta: "25m",
    lastUpdate: "10:27 AM",
    icon: Shield,
    color: "bg-red-500",
  },
  {
    id: "7",
    name: "Forecasting Agent",
    type: "Analytics Agent",
    currentTask: "Cash flow forecast Analyzing trends",
    progress: 90,
    status: "Review",
    confidence: 89,
    eta: "3m",
    lastUpdate: "10:26 AM",
    icon: TrendingUp,
    color: "bg-teal-500",
  },
  {
    id: "8",
    name: "Expense Auditor",
    type: "Audit Agent",
    currentTask: "Review 30 flagged expenses Checking for duplicates",
    progress: 70,
    status: "Review",
    confidence: 87,
    eta: "5m",
    lastUpdate: "10:25 AM",
    icon: Target,
    color: "bg-orange-500",
  },
];

export default function AgentMonitorPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "agents", label: "All Agents" },
    { id: "workflows", label: "Workflows" },
    { id: "schedules", label: "Schedules" },
    { id: "tools", label: "Tools" },
    { id: "logs", label: "Logs" },
    { id: "performance", label: "Performance" },
  ];

  const selected = selectedAgent
    ? mockAgents.find((a) => a.id === selectedAgent)
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Agent Monitor
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time visibility into your AI agents and automated
                workflows.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              {
                label: "Active Agents",
                value: "12",
                subtext: "of 28 agents",
                change: "+3 vs yesterday",
                icon: Bot,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Tasks Running",
                value: "24",
                subtext: "in progress",
                change: "+8 vs yesterday",
                icon: Activity,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Tasks Completed",
                value: "156",
                subtext: "today",
                change: "+18.4% vs yesterday",
                icon: CheckCircle,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Human Review",
                value: "7",
                subtext: "awaiting review",
                change: "-2 vs yesterday",
                icon: Users,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Success Rate",
                value: "98.6%",
                subtext: "last 7 days",
                change: "+1.2% vs last 7 days",
                icon: Target,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Total Time Saved",
                value: "47.3 hrs",
                subtext: "this month",
                change: "+12.7 hrs vs Apr",
                icon: Timer,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        kpi.bgColor,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", kpi.color)} />
                    </div>
                  </div>
                  <p className="text-xl font-bold tracking-tight tabular-nums">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.subtext}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {kpi.change}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Active Agents Table */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">
                Active Agents ({mockAgents.length})
              </h3>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all agents <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Agent
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Current Task
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Progress
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Confidence
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      ETA
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Last Update
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockAgents.map((agent) => {
                    const Icon = agent.icon;
                    return (
                      <tr
                        key={agent.id}
                        className={cn(
                          "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                          selectedAgent === agent.id && "bg-primary/5",
                        )}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                                agent.color,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {agent.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {agent.type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {agent.currentTask}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    agent.progress >= 80
                                      ? "bg-emerald-500"
                                      : agent.progress >= 50
                                        ? "bg-blue-500"
                                        : "bg-amber-500",
                                  )}
                                  style={{ width: `${agent.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-mono w-8">
                              {agent.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              agent.status === "Running"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {agent.status === "Running" ? "● " : "◎ "}
                            {agent.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={cn(
                                "text-xs font-mono",
                                agent.confidence >= 95
                                  ? "text-emerald-600"
                                  : agent.confidence >= 90
                                    ? "text-blue-600"
                                    : "text-amber-600",
                              )}
                            >
                              {agent.confidence}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {agent.confidence >= 95
                                ? "High"
                                : agent.confidence >= 90
                                  ? "High"
                                  : "Medium"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                          {agent.eta}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                          {agent.lastUpdate}
                        </td>
                        <td
                          className="py-3 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Agent Activity */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Agent Activity (Last 7 Days)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View activity report <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary/20 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Agents */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Top Performing Agents</h3>
                <Select defaultValue="7days">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "Bank Reconciler",
                    rate: 98.9,
                    color: "bg-emerald-500",
                  },
                  {
                    name: "Invoice Processor",
                    rate: 98.1,
                    color: "bg-blue-500",
                  },
                  {
                    name: "Journal Entry Agent",
                    rate: 97.6,
                    color: "bg-primary",
                  },
                  {
                    name: "Payroll Assistant",
                    rate: 96.8,
                    color: "bg-purple-500",
                  },
                  { name: "Tax Compliance", rate: 95.7, color: "bg-amber-500" },
                ].map((agent, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", agent.color)}
                            style={{ width: `${agent.rate}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono w-10 text-right">
                        {agent.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Recent Alerts</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    text: "High error rate detected",
                    detail: "Expense Auditor has 5 failed tasks",
                    time: "10:22 AM",
                    icon: AlertTriangle,
                    color: "text-red-500",
                  },
                  {
                    text: "Human review required",
                    detail: "7 tasks are waiting for your review",
                    time: "10:18 AM",
                    icon: Users,
                    color: "text-amber-500",
                  },
                  {
                    text: "New agent available",
                    detail: "Fixed Asset Manager is ready to use",
                    time: "9:45 AM",
                    icon: Bot,
                    color: "text-emerald-500",
                  },
                ].map((alert, i) => {
                  const Icon = alert.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <Icon
                        className={cn("h-4 w-4 mt-0.5 shrink-0", alert.color)}
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.detail}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {alert.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Details Panel (Right Sidebar) */}
      {selected ? (
        <div className="w-80 border-l bg-card hidden lg:block overflow-y-auto">
          <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                  selected.color,
                )}
              >
                <selected.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.type}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedAgent(null)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Current Task</p>
              <p className="text-sm font-medium">{selected.currentTask}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-xs font-mono">
                    {selected.progress}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      selected.progress >= 80
                        ? "bg-emerald-500"
                        : selected.progress >= 50
                          ? "bg-blue-500"
                          : "bg-amber-500",
                    )}
                    style={{ width: `${selected.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Started: {selected.lastUpdate}</span>
                <span>ETA: {selected.eta}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Agent Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span>Claude 3.5 Sonnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tools</span>
                  <span>5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span>1.2 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span>{selected.confidence}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Recent Activity
              </h4>
              <div className="space-y-2">
                {[
                  "Matched 48 transactions",
                  "Identified 2 possible matches",
                  "Downloaded 256 transactions",
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">{activity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Ask this agent
              </h4>
              <div className="flex gap-2">
                <Input
                  placeholder={`Ask ${selected.name} anything...`}
                  className="flex-1"
                />
                <Button size="icon" className="h-9 w-9">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Agent Monitor"
            subtitle="Real-time visibility into your AI agents."
            insights={[
              {
                id: "1",
                type: "success",
                title: "All systems operational",
                description:
                  "12 agents running smoothly with 98.6% success rate.",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "2",
                type: "warning",
                title: "2 agents need review",
                description:
                  "Forecasting Agent and Expense Auditor have items for review.",
                action: { label: "Review now", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Bot className="h-4 w-4" />,
                label: "View all agents",
                description: "See all 28 agents",
              },
              {
                id: "2",
                icon: <BarChart3 className="h-4 w-4" />,
                label: "Performance report",
                description: "Agent metrics",
              },
              {
                id: "3",
                icon: <Settings className="h-4 w-4" />,
                label: "Agent settings",
                description: "Configure agents",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
