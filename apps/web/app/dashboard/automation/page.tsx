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
  Zap,
  Plus,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Activity,
  FileText,
  Bot,
  RefreshCw,
  Settings,
  Play,
  Pause,
  BarChart3,
  Target,
  Timer,
  BrainCircuit,
  Upload,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockAutomations = [
  {
    id: "1",
    name: "Daily Bank Reconciliation",
    description: "Reconcile GTBank accounts",
    trigger: "Every day at 2:00 AM",
    lastRun: "Today, 2:03 AM",
    successRate: 98.6,
    status: "Running",
    confidence: 96,
  },
  {
    id: "2",
    name: "Invoice Capture & Recording",
    description: "Process incoming vendor invoices",
    trigger: "On invoice upload",
    lastRun: "Today, 10:42 AM",
    successRate: 99.1,
    status: "Running",
    confidence: 97,
  },
  {
    id: "3",
    name: "Expense Auto-Categorization",
    description: "Categorize bank & card expenses",
    trigger: "Every hour",
    lastRun: "Today, 11:00 AM",
    successRate: 99.3,
    status: "Running",
    confidence: 94,
  },
  {
    id: "4",
    name: "Customer Payment Matching",
    description: "Match payments to invoices",
    trigger: "Every 30 minutes",
    lastRun: "Today, 11:10 AM",
    successRate: 98.7,
    status: "Running",
    confidence: 95,
  },
  {
    id: "5",
    name: "Payroll Journal Entry",
    description: "Create payroll journal entries",
    trigger: "On payroll completion",
    lastRun: "May 15, 2025",
    successRate: 100,
    status: "Completed",
    confidence: 99,
  },
  {
    id: "6",
    name: "VAT Return Preparation",
    description: "Prepare VAT draft return",
    trigger: "Monthly on 1st",
    lastRun: "May 1, 2025",
    successRate: 97.8,
    status: "Completed",
    confidence: 93,
  },
  {
    id: "7",
    name: "Aging Report Automation",
    description: "Update AR/AP aging reports",
    trigger: "Every day at 8:00 AM",
    lastRun: "Today, 8:01 AM",
    successRate: 99.0,
    status: "Running",
    confidence: 96,
  },
  {
    id: "8",
    name: "Cash Flow Forecast Update",
    description: "Update 13-week cash flow",
    trigger: "Every day at 7:00 AM",
    lastRun: "Today, 7:02 AM",
    successRate: 98.2,
    status: "Running",
    confidence: 94,
  },
];

const templates = [
  {
    name: "Bank Reconciliation",
    description: "Automatically match and reconcile bank transactions.",
    icon: RefreshCw,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    badge: "Popular",
  },
  {
    name: "Invoice Processing",
    description: "Extract, validate and record vendor invoices.",
    icon: FileText,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    badge: "Popular",
  },
  {
    name: "Expense Categorization",
    description: "Auto-categorize expenses using AI rules.",
    icon: Target,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    badge: "Popular",
  },
  {
    name: "Payment Matching",
    description: "Match incoming payments to open invoices.",
    icon: CheckCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    badge: "New",
  },
  {
    name: "Payroll Journal",
    description: "Create payroll journal entries automatically.",
    icon: Bot,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
    badge: "New",
  },
];

export default function AutomationStudioPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "automations", label: "All Automations" },
    { id: "templates", label: "Templates" },
    { id: "triggers", label: "Triggers" },
    { id: "connections", label: "Connections" },
    { id: "logs", label: "Logs" },
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
                <Zap className="h-6 w-6 text-primary" />
                Automation Studio
              </h1>
              <p className="text-sm text-muted-foreground">
                Build, run and improve AI automations that keep your books
                accurate.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Automation
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
                label: "Automations Running",
                value: "18",
                change: "+3 vs last month",
                icon: Activity,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Tasks Automated",
                value: "2,846",
                change: "+27% vs last month",
                icon: Zap,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Time Saved",
                value: "127 hrs",
                change: "+32% vs last month",
                icon: Timer,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Accuracy Rate",
                value: "99.2%",
                change: "+1.4% vs last month",
                icon: Target,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Exceptions",
                value: "23",
                change: "+5 vs last month",
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Cost Savings",
                value: formatCurrency(18450),
                change: "+21% vs last month",
                icon: DollarSign,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
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
                    {kpi.change}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recommended Templates */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Recommended Templates
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-primary/10 text-primary"
                  >
                    AI
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-built automations for common accounting workflows.
                </p>
              </div>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all templates <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.name}
                    className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg mb-3",
                        template.bgColor,
                      )}
                    >
                      <Icon className={cn("h-5 w-5", template.color)} />
                    </div>
                    <h4 className="text-sm font-medium">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-2">
                      {template.badge} ★
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Automations Table */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">
                Active Automations{" "}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  18
                </Badge>
              </h3>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all automations <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Automation
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Trigger
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Last Run
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Success Rate
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      AI Confidence
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockAutomations.map((auto) => (
                    <tr
                      key={auto.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium">{auto.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {auto.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {auto.trigger}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {auto.lastRun}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${auto.successRate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-mono">
                            {auto.successRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            auto.status === "Running"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700",
                          )}
                        >
                          {auto.status === "Running" ? "● " : "✓ "}
                          {auto.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${auto.confidence}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-mono">
                            {auto.confidence}%
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t">
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                View all automations →
              </button>
            </div>
          </div>

          {/* Build with AI */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Build with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Describe what you want to automate and we'll build it for you.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="E.g., When a new invoice is received, extract the data, validate it and record it in bills..."
                className="flex-1"
              />
              <Button size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Generate Automation
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                Natural language builder
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                AI tests & validates
              </span>
              <span className="flex items-center gap-1">
                <BrainCircuit className="h-3 w-3" />
                Smart suggestions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Assistant"
            subtitle="I can help you build and improve automations."
            insights={[
              {
                id: "1",
                type: "info",
                title: "AI Suggestion",
                description:
                  "You could automate VAT return data extraction from your sales and purchase journals.",
                action: { label: "Preview", onClick: () => {} },
              },
              {
                id: "2",
                type: "warning",
                title: "1 automation failed yesterday",
                description:
                  "Bank reconciliation encountered a data format issue.",
                action: { label: "View details", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Zap className="h-4 w-4" />,
                label: "Suggest an automation for invoice processing",
                description: "AI recommended",
              },
              {
                id: "2",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Show me automations saving the most time",
                description: "View top performers",
              },
              {
                id: "3",
                icon: <Target className="h-4 w-4" />,
                label: "Help me build a bank reconciliation flow",
                description: "Step by step",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
