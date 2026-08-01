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
  RefreshCw,
  Plus,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Eye,
  FileText,
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
  BookOpen,
  Zap,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const matchedTransactions = [
  {
    id: "1",
    date: "May 19, 2025",
    description: "Transfer from Access Bank",
    statement: 15000,
    book: 15000,
    status: "Matched",
    confidence: 100,
  },
  {
    id: "2",
    date: "May 19, 2025",
    description: "INV-1052 Payment from Alpha Ltd",
    statement: 47500,
    book: 47500,
    status: "Matched",
    confidence: 99,
  },
  {
    id: "3",
    date: "May 18, 2025",
    description: "POS Purchase – Office Supplies",
    statement: -2350,
    book: -2350,
    status: "Matched",
    confidence: 98,
  },
  {
    id: "4",
    date: "May 17, 2025",
    description: "Internet Banking Transfer Fee",
    statement: -50,
    book: -50,
    status: "Matched",
    confidence: 100,
  },
  {
    id: "5",
    date: "May 17, 2025",
    description: "Cash Deposit",
    statement: 20000,
    book: 20000,
    status: "Matched",
    confidence: 100,
  },
];

const unmatchedTransactions = [
  {
    id: "6",
    date: "May 19, 2025",
    description: "Cheque 002583",
    statement: -5000,
    book: null,
    status: "Unmatched",
    confidence: null,
  },
  {
    id: "7",
    date: "May 18, 2025",
    description: "Bank Charge",
    statement: -120,
    book: null,
    status: "Unmatched",
    confidence: null,
  },
  {
    id: "8",
    date: "May 18, 2025",
    description: "Unknown Deposit",
    statement: 3200,
    book: null,
    status: "Unmatched",
    confidence: null,
  },
  {
    id: "9",
    date: "May 16, 2025",
    description: "Mobile Money Deposit",
    statement: 1500,
    book: null,
    status: "Unmatched",
    confidence: null,
  },
];

const aiSuggestions = [
  {
    id: "1",
    source: "Cheque 002583",
    date: "May 19, 2025",
    amount: -5000,
    match: "Payment to Supplier – ABC Ltd",
    matchDate: "May 18, 2025",
    matchAmount: -5000,
    confidence: 97,
  },
  {
    id: "2",
    source: "Mobile Money Deposit",
    date: "May 16, 2025",
    amount: 1500,
    match: "Sales – May to Deposith",
    matchDate: "May 18, 2025",
    matchAmount: -1300,
    confidence: 94,
  },
];

export default function ReconciliationCenterPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "all", label: "All Transactions", count: 164 },
    { id: "matched", label: "Matched", count: 156 },
    { id: "unmatched", label: "Unmatched", count: 8 },
    { id: "auto", label: "Auto-Matched", count: 142 },
    { id: "ignored", label: "Ignored", count: 0 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Reconciliation Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Automatically reconcile your bank transactions with your books.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import Statement
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Rules
              </Button>
              <Button size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Auto-Reconcile
              </Button>
            </div>
          </div>

          {/* Bank Account Selector */}
          <div className="flex items-center gap-4">
            <Select defaultValue="gtbank">
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gtbank">
                  GTBank Gambia Ltd – 1546 •••• 7890
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>May 1 – May 19, 2025</span>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 text-[10px]"
              >
                ● In Progress
              </Badge>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Statement Balance",
                value: formatCurrency(525600),
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Book Balance",
                value: formatCurrency(534050),
                icon: BookOpen,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Difference",
                value: "-" + formatCurrency(8450),
                subtext: "1.61% of statement",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Matched",
                value: "156",
                subtext: formatCurrency(517150) + " (98.4%)",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Unmatched",
                value: "8",
                subtext: formatCurrency(8450) + " (1.61%)",
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
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
                  {kpi.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtext}
                    </p>
                  )}
                </div>
              );
            })}
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
                {tab.label}{" "}
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Matched Transactions */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b bg-emerald-50/50">
              <h3 className="text-sm font-semibold text-emerald-700">
                Matched Transactions (156)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground"></th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Statement (GMD)
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Book (GMD)
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Match Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Confidence
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <Check className="h-4 w-4 text-emerald-500" />
                      </td>
                      <td className="py-3 px-4 text-sm">{tx.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono text-emerald-600">
                        {tx.statement > 0 ? "+" : ""}
                        {formatCurrency(tx.statement)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {tx.book !== null ? formatCurrency(tx.book) : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 text-[10px]"
                        >
                          ● Matched
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs font-mono">
                          {tx.confidence}%
                        </span>
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
          </div>

          {/* Unmatched Transactions */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b bg-amber-50/50">
              <h3 className="text-sm font-semibold text-amber-700">
                Unmatched Transactions (8)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground"></th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Statement (GMD)
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Book (GMD)
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Match Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Confidence
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unmatchedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors bg-amber-50/20"
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </td>
                      <td className="py-3 px-4 text-sm">{tx.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono text-amber-600">
                        {tx.statement > 0 ? "+" : ""}
                        {formatCurrency(tx.statement)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono text-muted-foreground">
                        —
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700 text-[10px]"
                        >
                          ● Unmatched
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" className="text-xs">
                          Match <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing 1 to 10 of 8 unmatched
              </p>
              <button className="text-sm text-primary hover:underline">
                Show more →
              </button>
            </div>
          </div>

          {/* AI Match Suggestions */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                AI Match Suggestions (3)
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-100 text-emerald-700"
                >
                  High Confidence
                </Badge>
              </h3>
              <Button variant="outline" size="sm">
                Accept All
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {aiSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <input type="checkbox" className="rounded" defaultChecked />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{suggestion.source}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.date} • {formatCurrency(suggestion.amount)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{suggestion.match}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.matchDate} •{" "}
                      {formatCurrency(suggestion.matchAmount)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-100 text-emerald-700"
                  >
                    {suggestion.confidence}%
                  </Badge>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <button className="text-sm text-primary hover:underline">
                View all suggestions →
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline">Finish Later</Button>
            <Button>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize Reconciliation
            </Button>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I found 3 potential matches and 2 issues that need your attention."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "Unmatched deposit detected",
                description:
                  "There is a deposit of GMD 3,200.00 on May 18, 2025 that doesn't exist in your books.",
                action: { label: "Review transaction", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Reconciliation Progress: 98.4%",
                description:
                  "Matched 156 (GMD 517,150.00) • Unmatched 8 (GMD 8,450.00)",
                action: { label: "View details", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Why is this amount unmatched?",
                description: "Get explanation",
              },
              {
                id: "2",
                icon: <Target className="h-4 w-4" />,
                label: "Show me possible matches for this",
                description: "AI suggestions",
              },
              {
                id: "3",
                icon: <DollarSign className="h-4 w-4" />,
                label: "What bank charges can I expect?",
                description: "View charges",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Explain this reconciliation",
                description: "Get summary",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
