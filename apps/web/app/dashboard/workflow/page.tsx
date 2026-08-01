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
  GitBranch,
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
  Eye,
  Bot,
  Settings,
  Upload,
  Play,
  Pause,
  Target,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  FileText,
  Cpu,
  Workflow,
  RefreshCw,
  Save,
  Share2,
  TestTube,
  History,
  Shield,
  Activity,
  BarChart3,
  Timer,
  BrainCircuit,
  Sparkles,
  Copy,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const workflowNodes = [
  {
    id: "trigger",
    type: "trigger",
    label: "Trigger",
    description: "Invoice Received",
    sublabel: "Email / Upload / API",
    status: "active",
    x: 80,
    y: 180,
  },
  {
    id: "extraction",
    type: "agent",
    label: "Extraction Agent",
    description: "Extract data",
    sublabel: "(OCR + AI)",
    status: "active",
    x: 280,
    y: 180,
    confidence: 98,
  },
  {
    id: "validation",
    type: "decision",
    label: "Validation",
    description: "Valid?",
    status: "active",
    x: 480,
    y: 180,
  },
  {
    id: "categorization",
    type: "agent",
    label: "Categorization Agent",
    description: "Classify & Code",
    sublabel: "GL Mapping",
    status: "active",
    x: 680,
    y: 120,
  },
  {
    id: "create-entry",
    type: "action",
    label: "Create Entry",
    description: "Journal Entry",
    sublabel: "Draft",
    status: "active",
    x: 880,
    y: 120,
  },
  {
    id: "human-review",
    type: "human",
    label: "Human Review",
    description: "Approval Required",
    sublabel: "If > GMD 5,000",
    status: "active",
    x: 1080,
    y: 120,
  },
  {
    id: "post-entry",
    type: "action",
    label: "Post Entry",
    description: "Post to Ledger",
    status: "active",
    x: 1080,
    y: 260,
  },
  {
    id: "exception",
    type: "error",
    label: "Exception Agent",
    description: "Flag & Route",
    sublabel: "for Review",
    status: "active",
    x: 680,
    y: 260,
  },
];

const workflowComponents = [
  {
    type: "Agents",
    items: [
      {
        name: "Extraction Agent",
        description: "Extract invoice data using OCR + AI",
        icon: Cpu,
        color: "text-blue-500",
      },
      {
        name: "Validation Agent",
        description: "Validate data accuracy & completeness",
        icon: CheckCircle,
        color: "text-emerald-500",
      },
      {
        name: "Categorization Agent",
        description: "Map to chart of accounts",
        icon: Target,
        color: "text-purple-500",
      },
      {
        name: "Matching Agent",
        description: "Match with POs & GRNs",
        icon: RefreshCw,
        color: "text-amber-500",
      },
      {
        name: "Exception Agent",
        description: "Handle exceptions intelligently",
        icon: AlertTriangle,
        color: "text-red-500",
      },
      {
        name: "Posting Agent",
        description: "Post entries to ledger",
        icon: FileText,
        color: "text-indigo-500",
      },
    ],
  },
];

const testRunSteps = [
  {
    step: "Trigger",
    status: "completed",
    time: "2.1s",
    detail: "Invoice received from vendor@example.com",
  },
  {
    step: "Extraction Agent",
    status: "completed",
    time: "4.8s",
    detail: "Extracted 14 fields from invoice.pdf",
  },
  {
    step: "Validation",
    status: "completed",
    time: "1.2s",
    detail: "All required fields validated",
  },
  {
    step: "Categorization",
    status: "completed",
    time: "1.4s",
    detail: "Mapped to 6200 - Office Supplies",
  },
  {
    step: "Create Entry",
    status: "completed",
    time: "1.1s",
    detail: "Draft journal entry created",
  },
  {
    step: "Human Review",
    status: "pending",
    time: "-",
    detail: "Approved by Finance Manager",
  },
  {
    step: "Post Entry",
    status: "completed",
    time: "0.9s",
    detail: "Posted to ledger successfully",
  },
];

const extractedData = {
  "Invoice Number": "INV-2025-4821",
  Vendor: "GTBank Gambia Ltd",
  Amount: "GMD 25,600.00",
  Date: "May 19, 2025",
  "Due Date": "Jun 18, 2025",
  Currency: "GMD",
  "Tax (VAT)": "GMD 2,400.00",
  Category: "Bank Charges",
  "Confidence Score": "98%",
};

export default function WorkflowBuilderPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("builder");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [activeComponentTab, setActiveComponentTab] = useState("Agents");

  const tabs = [
    { id: "builder", label: "Builder" },
    { id: "config", label: "Config" },
    { id: "runs", label: "Runs" },
    { id: "versions", label: "Versions" },
    { id: "permissions", label: "Permissions" },
    { id: "audit", label: "Audit Trail" },
  ];

  const componentTabs = ["Agents", "Tools", "Conditions", "Integrations"];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Workflow className="h-6 w-6 text-primary" />
                AI Workflow Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                Design, test, and deploy AI-powered accounting workflows.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <TestTube className="mr-2 h-4 w-4" />
                Test Run
              </Button>
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" />
                Publish
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

          {/* Workflow Title Bar */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>New Workflow</span>
                <ChevronRight className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold">
                Invoice Processing Automation
              </h2>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 text-[10px]"
              >
                ● Active
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Auto-save
                </span>
                <span>2 min ago</span>
              </div>
              <Select defaultValue="v2.3">
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2.3">v2.3</SelectItem>
                  <SelectItem value="v2.2">v2.2</SelectItem>
                  <SelectItem value="v2.1">v2.1</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Visual Workflow Builder */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Simplified Workflow Diagram */}
              <div className="relative bg-white rounded-lg border p-6 min-h-[200px]">
                <div className="flex items-center gap-4 overflow-x-auto pb-4">
                  {/* Trigger Node */}
                  <div className="flex-shrink-0 w-40 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        Trigger
                      </span>
                    </div>
                    <p className="text-sm font-medium">Invoice Received</p>
                    <p className="text-xs text-muted-foreground">
                      Email / Upload / API
                    </p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Extraction Agent */}
                  <div className="flex-shrink-0 w-40 rounded-lg border-2 border-blue-300 bg-blue-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700">
                        Extraction Agent
                      </span>
                    </div>
                    <p className="text-sm font-medium">Extract data</p>
                    <p className="text-xs text-muted-foreground">(OCR + AI)</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="h-3 w-3" />
                      98% confidence
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Validation Decision */}
                  <div className="flex-shrink-0 w-32 rounded-lg border-2 border-amber-300 bg-amber-50 p-3 rotate-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">
                        Validation
                      </span>
                    </div>
                    <p className="text-sm font-medium">Valid?</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        Yes
                      </span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        No
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Categorization Agent */}
                  <div className="flex-shrink-0 w-40 rounded-lg border-2 border-purple-300 bg-purple-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">
                        Categorization Agent
                      </span>
                    </div>
                    <p className="text-sm font-medium">Classify & Code</p>
                    <p className="text-xs text-muted-foreground">GL Mapping</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="h-3 w-3" />
                      97% confidence
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Create Entry */}
                  <div className="flex-shrink-0 w-36 rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-700">
                        Create Entry
                      </span>
                    </div>
                    <p className="text-sm font-medium">Journal Entry</p>
                    <p className="text-xs text-muted-foreground">Draft</p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Human Review */}
                  <div className="flex-shrink-0 w-36 rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">
                        Human Review
                      </span>
                    </div>
                    <p className="text-sm font-medium">Approval Required</p>
                    <p className="text-xs text-muted-foreground">
                      If &gt; GMD 5,000
                    </p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  {/* Post Entry */}
                  <div className="flex-shrink-0 w-36 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        Post Entry
                      </span>
                    </div>
                    <p className="text-sm font-medium">Post to Ledger</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - 3 columns */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Workflow Components */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold mb-3">
                  Workflow Components
                </h3>
                <div className="flex gap-1 border-b">
                  {componentTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveComponentTab(tab)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        activeComponentTab === tab
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 space-y-2">
                {workflowComponents[0].items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Icon className={cn("h-5 w-5", item.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="mr-2 h-3 w-3" />
                  Add Custom Agent
                </Button>
              </div>
            </div>

            {/* Test Run Output */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-semibold">Test Run Output</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View Full Log <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">
                    Run completed successfully
                  </span>
                </div>
                <div className="space-y-2">
                  {testRunSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          step.status === "completed"
                            ? "bg-emerald-500"
                            : "bg-amber-500",
                        )}
                      />
                      <span className="font-medium min-w-[120px]">
                        {step.step}
                      </span>
                      <span className="text-muted-foreground flex-1 truncate">
                        {step.detail}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {step.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Data */}
              <div className="border-t">
                <div className="p-4 border-b bg-muted/30">
                  <h4 className="text-xs font-semibold text-muted-foreground">
                    Extracted Data
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium font-mono text-xs">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Workflow Performance */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-semibold">Workflow Performance</h3>
                <Select defaultValue="month">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="day">Today</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 space-y-4">
                {[
                  {
                    label: "Accuracy",
                    value: "98.6%",
                    bar: 98.6,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Speed",
                    value: "96.1%",
                    bar: 96.1,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Automation Rate",
                    value: "87.3%",
                    bar: 87.3,
                    color: "bg-primary",
                  },
                  {
                    label: "Human Touchpoints",
                    value: "12.7%",
                    bar: 12.7,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Error Rate",
                    value: "1.4%",
                    bar: 1.4,
                    color: "bg-red-500",
                  },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        {metric.label}
                      </span>
                      <span className="text-sm font-medium font-mono">
                        {metric.value}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          metric.color,
                        )}
                        style={{ width: `${metric.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Success Rate Donut */}
              <div className="border-t p-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg
                      className="w-20 h-20 transform -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="98.6, 100"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">2,846</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Successful</span>
                      <span className="font-mono">2,807 (98.6%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span>Failed</span>
                      <span className="font-mono">18 (0.6%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Pending</span>
                      <span className="font-mono">21 (0.8%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                      <span>Cancelled</span>
                      <span className="font-mono">0 (0%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  {[
                    { icon: TestTube, label: "Simulate with sample data" },
                    { icon: Download, label: "Export workflow JSON" },
                    { icon: Copy, label: "Clone this workflow" },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        className="flex items-center gap-2 w-full p-2 text-sm text-left hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
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
            subtitle="I can help you optimize this workflow."
            insights={[
              {
                id: "1",
                type: "success",
                title: "Workflow Insights",
                description: "Success Prediction: High (97%)",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Estimated Time Saved",
                description: "3.4 hrs / week",
                action: { label: "Optimize", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "Error Reduction",
                description: "82% fewer manual errors",
                action: { label: "View report", onClick: () => {} },
              },
              {
                id: "4",
                type: "info",
                title: "Cost Impact",
                description: "GMD 12,450 / month saved",
                action: { label: "View savings", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "Add vendor duplicate check",
                description: "Reduce duplicates by 64%",
              },
              {
                id: "2",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Auto-match purchase orders",
                description: "Increase accuracy by 17%",
              },
              {
                id: "3",
                icon: <Shield className="h-4 w-4" />,
                label: "Route high risk invoices",
                description: "Reduce fraud risk",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
