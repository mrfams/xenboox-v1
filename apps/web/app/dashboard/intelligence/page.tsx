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
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  RefreshCw,
  Settings,
  Zap,
  Target,
  Users,
  DollarSign,
  Eye,
  Send,
  Paperclip,
  Mic,
  Activity,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const activeTasks = [
  {
    id: "1",
    name: "Bank Reconciliation",
    detail: "GTBank • 1234567890",
    progress: 72,
    status: "Running",
    statusText: "Matched 1,248 / 1,730 txns",
    eta: "ETA 3 min",
    icon: RefreshCw,
    color: "bg-blue-500",
  },
  {
    id: "2",
    name: "Invoice Processing",
    detail: "",
    progress: 48,
    status: "Review",
    statusText: "Processed 36 / 75 invoices",
    eta: "ETA 5 min",
    icon: FileText,
    color: "bg-emerald-500",
    badge: "Review",
  },
  {
    id: "3",
    name: "Expense Categorization",
    detail: "May 2025 expenses",
    progress: 85,
    status: "Running",
    statusText: "Categorized 1,892 / 2,230",
    eta: "ETA 2 min",
    icon: Target,
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "Payroll Preparation",
    detail: "",
    progress: 60,
    status: "Review",
    statusText: "Calculated for 24 employees",
    eta: "ETA 10 min",
    icon: Users,
    color: "bg-amber-500",
    badge: "Review",
  },
  {
    id: "5",
    name: "VAT Return Preparation",
    detail: "May 2025",
    progress: 0,
    status: "Waiting",
    statusText: "Waiting for data",
    eta: "ETA 15 min",
    icon: FileText,
    color: "bg-red-500",
  },
];

const suggestions = [
  {
    id: "1",
    title: "3 duplicate expenses detected",
    description:
      "We found potential duplicates totaling GMD 4,560 across 5 transactions.",
    action: "Review duplicates",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    id: "2",
    title: "Uncategorized transactions",
    description: "12 transactions totaling GMD 3,240 need your review.",
    action: "Review now",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "3",
    title: "Cash flow alert",
    description: "Cash balance may drop below GMD 50,000 in 18 days.",
    action: "View forecast",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    id: "4",
    title: "Invoice overdue",
    description: "16 invoices overdue totaling GMD 78,450.",
    action: "Send reminders",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    id: "5",
    title: "Connect bank account",
    description: "GTBank Savings account not connected. Reconcile faster.",
    action: "Connect now",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
];

const insights = [
  {
    title: "Revenue increased 12.6% in May",
    detail:
      "Your revenue of GMD 245,600 is higher than April (GMD 218,100). Main drivers: Product Sales (+18%) and Services (+9%).",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Operating expenses decreased",
    detail:
      "Expenses are down 6.3% compared to April, mainly due to lower marketing spend and office expenses.",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    title: "Better collections performance",
    detail:
      "Average collection days improved to 18 days from 24 days in April.",
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Cash flow improving",
    detail: "Operating cash flow is positive GMD 26,450 this month.",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
];

export default function IntelligencePage() {
  const [search, setSearch] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                AI Workspace
              </h1>
              <p className="text-sm text-muted-foreground">
                Collaborate with AI on your accounting and financial tasks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                <span className="mr-1">●</span>Connected
              </Badge>
            </div>
          </div>

          {/* Chat Input */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium mb-3">
              What would you like Xenboox to do?
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Mic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Ask anything about your accounting..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" className="h-9 w-9">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                "Close May books",
                "Explain cash position",
                "Reconcile transactions",
                "Create payroll",
                "Forecast next month",
                "Analyze expenses",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Active AI Tasks */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Active AI Tasks</h3>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all tasks <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {activeTasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                            task.color,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {task.name}
                          </p>
                          {task.detail && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {task.detail}
                            </p>
                          )}
                        </div>
                        {task.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-100 text-amber-700"
                          >
                            {task.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {task.statusText}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {task.eta}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs h-7"
                      >
                        {task.status === "Review"
                          ? "Review now"
                          : task.status === "Waiting"
                            ? "Start task"
                            : "View details"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                AI Suggestions
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-lg border p-3 hover:shadow-sm cursor-pointer transition-all",
                    s.bgColor,
                  )}
                >
                  <p className="text-sm font-medium mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {s.description}
                  </p>
                  <button className="text-xs font-medium text-primary hover:underline">
                    {s.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Financial Insights */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Financial Insights{" "}
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-primary/10 text-primary"
                  >
                    AI generated
                  </Badge>
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all insights <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {insights.map((insight, i) => {
                  const Icon = insight.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                          insight.bgColor,
                        )}
                      >
                        <Icon className={cn("h-4 w-4", insight.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {insight.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="text-xs text-primary hover:underline mt-3">
                View all insights →
              </button>
            </div>

            {/* Cash Flow Overview */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Cash Flow Overview</h3>
                <Select defaultValue="month">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-4">
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(26450)}
                </p>
                <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                <p className="text-xs text-emerald-600">
                  ↑ 18.4% vs last month
                </p>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[30, 45, 35, 60, 50, 75, 55, 65, 80, 70, 85, 90].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-primary/20 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Cash In
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-red-400" />
                  <span className="text-[10px] text-muted-foreground">
                    Cash Out
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-primary" />
                  <span className="text-[10px] text-muted-foreground">
                    Net Cash Flow
                  </span>
                </div>
              </div>
              <button className="text-xs text-primary hover:underline mt-3">
                View cash flow statement →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="AI Assistant"
            subtitle="Active"
            insights={[
              {
                id: "1",
                type: "success",
                title: "Cash position is strong",
                description: "You have 45 days of cash runway.",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Upcoming payroll",
                description: "GMD 78,450 due in 3 days.",
                action: { label: "View payroll", onClick: () => {} },
              },
              {
                id: "3",
                type: "info",
                title: "2 large receipts expected",
                description: "Totaling GMD 156,000 this week.",
                action: { label: "View invoices", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Reconcile 18 transactions",
                description: "Match bank feed",
              },
              {
                id: "2",
                icon: <AlertTriangle className="h-4 w-4" />,
                label: "Follow up 5 overdue invoices",
                description: "Send reminders",
              },
              {
                id: "3",
                icon: <FileText className="h-4 w-4" />,
                label: "Review upcoming bills",
                description: "Approve payments",
              },
              {
                id: "4",
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Create cash flow forecast",
                description: "Predict next month",
              },
              {
                id: "5",
                icon: <Target className="h-4 w-4" />,
                label: "Optimize cash position",
                description: "Suggest transfers",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
