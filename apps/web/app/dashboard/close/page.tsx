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
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  FileText,
  Bot,
  Settings,
  Shield,
  BookOpen,
  Users,
  CalendarDays,
  Play,
  BarChart3,
  Target,
  Timer,
  Eye,
  ChevronDown,
  ChevronRight,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const checklistPhases = [
  {
    name: "1. Pre-Close",
    tasks: 6,
    items: [
      {
        name: "Review bank feeds & categorize",
        agent: "Bank Reconciler Agent",
        status: "Completed",
        confidence: 98,
        due: "May 20",
      },
      {
        name: "Reconcile all bank accounts",
        agent: "Bank Reconciler Agent",
        status: "Completed",
        confidence: 95,
        due: "May 21",
      },
      {
        name: "Review accounts payable aging",
        agent: "AP Agent",
        status: "Completed",
        confidence: 97,
        due: "May 21",
      },
      {
        name: "Review accounts receivable aging",
        agent: "AR Agent",
        status: "In Review",
        confidence: 92,
        due: "May 22",
      },
      {
        name: "Verify payroll for the month",
        agent: "Payroll Agent",
        status: "Pending",
        confidence: null,
        due: "May 22",
      },
      {
        name: "Review open items & accruals",
        agent: "Journal Agent",
        status: "Pending",
        confidence: null,
        due: "May 23",
      },
    ],
  },
  { name: "2. Closing Entries", tasks: 12, items: [] },
  { name: "3. Reconciliations", tasks: 10, items: [] },
  { name: "4. Reviews & Approvals", tasks: 8, items: [] },
  { name: "5. Reporting & Finalization", tasks: 4, items: [] },
];

export default function CloseCenterPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(
    "1. Pre-Close",
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Checklist" },
    { id: "reconciliations", label: "Reconciliations" },
    { id: "journal", label: "Journal Entries" },
    { id: "reviews", label: "Reviews" },
    { id: "reports", label: "Reports" },
    { id: "audit", label: "Audit Trail" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Month-End Close Center
              </h1>
              <p className="text-sm text-muted-foreground">
                AI orchestrated. Accurate. Always on time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="may2025">
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="may2025">May 2025</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Overall Progress with Circle */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted/30"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary"
                      strokeDasharray="68 32"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">68%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Overall Progress
                  </p>
                  <p className="text-sm font-semibold">Tasks Completed</p>
                  <p className="text-xs text-muted-foreground">27 / 40</p>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-100 text-emerald-700 mt-1"
                  >
                    On Track
                  </Badge>
                </div>
              </div>
            </div>

            {[
              {
                label: "Close Status",
                value: "On Track",
                subtext: "Estimated Close Date\nJun 2, 2025\n3 days remaining",
                icon: Clock,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Auto-Completed by AI",
                value: "15",
                subtext: "37% of tasks\n+6 vs last month",
                icon: Bot,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Adjustments Detected",
                value: "8",
                subtext: "Requires review\n+2 vs last month",
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Risks & Blockers",
                value: "2",
                subtext: "Needs attention\n-1 vs last month",
                icon: Shield,
                color: "text-red-600",
                bgColor: "bg-red-50",
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
                  <p className="text-xl font-bold tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                    {kpi.subtext}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Close Checklist */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">
                Close Checklist{" "}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  40 Tasks
                </Badge>
              </h3>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="All Tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="phase">
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Group by: Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase">Group by: Phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {checklistPhases.map((phase) => (
                <div key={phase.name}>
                  <button
                    onClick={() =>
                      setExpandedPhase(
                        expandedPhase === phase.name ? null : phase.name,
                      )
                    }
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedPhase === phase.name ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{phase.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {phase.tasks} tasks
                      </Badge>
                    </div>
                  </button>
                  {expandedPhase === phase.name && phase.items.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {phase.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center",
                                item.status === "Completed"
                                  ? "bg-emerald-100"
                                  : item.status === "In Review"
                                    ? "bg-amber-100"
                                    : "bg-muted",
                              )}
                            >
                              {item.status === "Completed" && (
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                              )}
                              {item.status === "In Review" && (
                                <Eye className="h-3 w-3 text-amber-600" />
                              )}
                              {item.status === "Pending" && (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.agent}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                item.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.status === "In Review"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {item.status}
                            </Badge>
                            {item.confidence && (
                              <span className="text-xs font-mono text-muted-foreground">
                                {item.confidence}%
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.due}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <button className="text-sm text-primary hover:underline">
                View full checklist →
              </button>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Task Completion Trend */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">
                Task Completion Trend
              </h3>
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

            {/* Time Saved by AI */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Time Saved by AI</h3>
                <Select defaultValue="month">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-full w-full">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary"
                      strokeDasharray="33 67"
                      strokeDashoffset="25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-emerald-500"
                      strokeDasharray="25 75"
                      strokeDashoffset="92"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-500"
                      strokeDasharray="15 85"
                      strokeDashoffset="67"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-500"
                      strokeDasharray="14 86"
                      strokeDashoffset="52"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="8 92"
                      strokeDashoffset="38"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold">37.6</span>
                    <span className="text-[10px] text-muted-foreground">
                      Total Hours
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Bank Reconciliations",
                      hours: "12.4 hrs",
                      color: "bg-primary",
                    },
                    {
                      label: "Transaction Categorization",
                      hours: "9.8 hrs",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Data Validation",
                      hours: "7.1 hrs",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Journal Entry Drafting",
                      hours: "5.3 hrs",
                      color: "bg-blue-500",
                    },
                    { label: "Other", hours: "3.0 hrs", color: "bg-gray-300" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("h-2 w-2 rounded-full", item.color)}
                        />
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Close History */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Close History</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    month: "Apr 2025",
                    date: "Closed on Apr 30, 2025",
                    rate: "100%",
                  },
                  {
                    month: "Mar 2025",
                    date: "Closed on Mar 31, 2025",
                    rate: "100%",
                  },
                  {
                    month: "Feb 2025",
                    date: "Closed on Feb 28, 2025",
                    rate: "100%",
                  },
                  {
                    month: "Jan 2025",
                    date: "Closed on Jan 31, 2025",
                    rate: "100%",
                  },
                  {
                    month: "Dec 2024",
                    date: "Closed on Dec 31, 2024",
                    rate: "100%",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.date}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-emerald-100 text-emerald-700"
                    >
                      {item.rate}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="Here's the current status for May 2025:"
            insights={[
              {
                id: "1",
                type: "info",
                title: "You're on track to close on Jun 2, 2025",
                description:
                  "I've analyzed your progress and identified 2 risks that could delay your close.",
                action: { label: "View close checklist", onClick: () => {} },
              },
              {
                id: "2",
                type: "warning",
                title: "Unreconciled bank accounts",
                description:
                  "2 accounts are unreconciled for more than 7 days.",
                action: { label: "Reconcile now", onClick: () => {} },
              },
              {
                id: "3",
                type: "warning",
                title: "Accruals missing",
                description: "4 recurring accruals are due but not created.",
                action: { label: "Create accruals", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <CheckCircle className="h-4 w-4" />,
                label: "What are the open tasks?",
                description: "View checklist",
              },
              {
                id: "2",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Show me reconciliation status",
                description: "Bank accounts",
              },
              {
                id: "3",
                icon: <AlertTriangle className="h-4 w-4" />,
                label: "Why is this task delayed?",
                description: "Get explanation",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
