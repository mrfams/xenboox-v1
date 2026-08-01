"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
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
  ArrowRight,
  FileText,
  BarChart3,
  Receipt,
  CreditCard,
  Users,
  DollarSign,
  Send,
  Mic,
  Paperclip,
  RefreshCw,
  Download,
  Settings,
  Link2,
  CheckCircle,
  ChevronRight,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function ChatPage() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content: "Hi Famara! 👋\n\nHow can I help you today?",
    },
  ]);

  const quickActions = [
    { icon: BarChart3, label: "Financial summary" },
    { icon: DollarSign, label: "Cash flow status" },
    { icon: Receipt, label: "Unpaid invoices" },
    { icon: TrendingUp, label: "Profitability analysis" },
  ];

  const contextActions = [
    { icon: FileText, label: "Create invoice" },
    { icon: Receipt, label: "Record expense" },
    { icon: Upload, label: "Upload document" },
    { icon: RefreshCw, label: "Reconcile account" },
    { icon: BarChart3, label: "Run report" },
    { icon: Plus, label: "Add journal entry" },
  ];

  const recentReports = [
    {
      name: "Profit & Loss Statement",
      time: "Generated 2h ago",
      icon: BarChart3,
      color: "text-emerald-500",
    },
    {
      name: "Cash Flow Statement",
      time: "Generated yesterday",
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      name: "Aged Receivables",
      time: "Generated 2 days ago",
      icon: Receipt,
      color: "text-amber-500",
    },
  ];

  const connectedAccounts = [
    {
      name: "GTBank – 1234",
      time: "Last sync: 5 min ago",
      icon: "bg-emerald-500",
      status: true,
    },
    {
      name: "Paystack",
      time: "Last sync: 15 min ago",
      icon: "bg-blue-500",
      status: true,
    },
    {
      name: "Stripe",
      time: "Last sync: 1 day ago",
      icon: "bg-indigo-500",
      status: true,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              AI Chat
            </h1>
            <p className="text-sm text-muted-foreground">
              Your AI accounting assistant. Ask anything about your business.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Welcome */}
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold mb-2">Hi Famara! 👋</h2>
            <p className="text-lg text-muted-foreground mb-6">
              How can I help you today?
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </button>
                );
              })}
              <button className="flex items-center gap-1 rounded-full border px-4 py-2 text-sm hover:bg-muted transition-colors">
                More <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl bg-primary text-primary-foreground px-4 py-3">
              <p className="text-sm">
                What's our cash position right now and how does it compare to
                last month? Also show me our top 5 expense categories.
              </p>
              <p className="text-xs opacity-70 mt-1">10:42 AM</p>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] space-y-4">
              <p className="text-sm">
                Here's your cash position summary and top expense breakdown.
              </p>

              {/* Cash Position Card */}
              <div className="rounded-xl border bg-card p-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Cash Position
                    </h4>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatCurrency(1234567)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      ↑ 24.9% vs last month (GMD 987,654)
                    </p>
                    <div className="h-24 flex items-end gap-1 mt-4">
                      {[30, 45, 35, 60, 50, 75, 55, 65, 80, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/20 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] text-muted-foreground">
                        Apr 27
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        May 25
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Top 5 Expense Categories (This Month)
                    </h4>
                    <div className="space-y-2">
                      {[
                        {
                          name: "Operations",
                          amount: 120450,
                          pct: 39,
                          color: "bg-primary",
                        },
                        {
                          name: "Salaries & Wages",
                          amount: 85300,
                          pct: 28,
                          color: "bg-blue-500",
                        },
                        {
                          name: "Marketing",
                          amount: 32150,
                          pct: 10,
                          color: "bg-emerald-500",
                        },
                        {
                          name: "Rent & Utilities",
                          amount: 28920,
                          pct: 9,
                          color: "bg-amber-500",
                        },
                        {
                          name: "Professional Fees",
                          amount: 18240,
                          pct: 6,
                          color: "bg-purple-500",
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className={cn("h-2 w-2 rounded-full", item.color)}
                          />
                          <span className="text-sm flex-1">{item.name}</span>
                          <span className="text-sm font-mono">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {item.pct}%
                          </span>
                          <div className="w-16">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  item.color,
                                )}
                                style={{ width: `${item.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Sources: Bank accounts, transactions, and bills
                </p>
                <p className="text-xs text-muted-foreground mt-1">10:43 AM</p>
              </div>

              {/* Suggested Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors">
                  <FileText className="h-3 w-3" />
                  Show cash flow statement
                </button>
                <button className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors">
                  <BarChart3 className="h-3 w-3" />
                  Breakdown by account
                </button>
                <button className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  Compare more periods
                </button>
                <button className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* User Message 2 */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl bg-primary text-primary-foreground px-4 py-3">
              <p className="text-sm">
                Show me all unpaid invoices over GMD 5,000 and the ones overdue
                more than 30 days. Also draft a polite reminder email for them.
              </p>
              <p className="text-xs opacity-70 mt-1">10:45 AM</p>
            </div>
          </div>

          {/* AI Processing */}
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              </div>
              Searching invoices and preparing reminder emails...
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Plus className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Ask anything about your accounting..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Mic className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {[
              "What did we spend on marketing?",
              "Reconcile GTBank – May transactions",
              "Show me our profit this year",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
            <button className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            AI responses can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden lg:block overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Current Context */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Current Context</h3>
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-100 text-emerald-700"
              >
                <span className="mr-1">●</span>Live
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <Select defaultValue="acme">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acme">Acme Solutions Ltd.</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Financial Year</span>
                  <p className="font-medium">Jan 1 – Dec 31, 2025</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Local Currency</span>
                  <p className="font-medium">GMD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-1">
              {contextActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Reports */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent Reports</h3>
            <div className="space-y-2">
              {recentReports.map((report, i) => {
                const Icon = report.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Icon className={cn("h-4 w-4", report.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {report.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="text-xs text-primary hover:underline mt-2">
              View all reports →
            </button>
          </div>

          {/* Connected Accounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Connected Accounts</h3>
              <button className="text-xs text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {connectedAccounts.map((account, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                      account.icon,
                    )}
                  >
                    {account.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.time}
                    </p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
