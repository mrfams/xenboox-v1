"use client";

import {
  Bot,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  Send,
  ChevronRight,
  BarChart3,
  CreditCard,
  Users,
  Shield,
  Clock,
  DollarSign,
  PieChart,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

/* ═══════════════════════════════════════════════════════════════════════════
 * Xenboox Design System v2.0 — Mockup-Inspired Component Showcase
 *
 * This page demonstrates every component pattern from the UI mockups.
 * Use it as a reference for building new screens.
 * ═══════════════════════════════════════════════════════════════════════════ */

// ─── KPI Metric Card ────────────────────────────────────────────────────────
function KPICard({
  icon: Icon,
  label,
  value,
  change,
  trend,
  color,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  color: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            color,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        {change && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              trend === "up" && "bg-emerald-50 text-emerald-600",
              trend === "down" && "bg-red-50 text-red-600",
              !trend && "bg-gray-50 text-gray-600",
            )}
          >
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

// ─── AI Insight Card ─────────────────────────────────────────────────────────
function InsightCard({
  category,
  title,
  description,
  confidence,
  priority,
}: {
  category: string;
  title: string;
  description: string;
  confidence: number;
  priority: "high" | "medium" | "low";
}) {
  const categoryColors: Record<
    string,
    { icon: typeof TrendingUp; color: string; bg: string }
  > = {
    revenue: {
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    risk: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    optimization: {
      icon: Sparkles,
      color: "text-[#6366F1]",
      bg: "bg-[#6366F1]/5",
    },
  };
  const cat = categoryColors[category] ?? categoryColors.optimization;
  const CatIcon = cat.icon;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3.5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            cat.bg,
          )}
        >
          <CatIcon className={cn("h-4 w-4", cat.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">{title}</span>
            <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
              {priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  confidence >= 0.9
                    ? "bg-emerald-500"
                    : confidence >= 0.7
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Row ────────────────────────────────────────────────────────────
function WorkflowRow({
  label,
  detail,
  progress,
  status,
}: {
  label: string;
  detail: string;
  progress: number;
  status: "running" | "complete" | "pending";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5",
        status === "running" && "bg-muted/30",
      )}
    >
      {status === "running" && (
        <div className="h-4 w-4 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      )}
      {status === "complete" && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      )}
      {status === "pending" && (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{label}</span>
        <p className="text-[10px] text-muted-foreground/70 truncate">
          {detail}
        </p>
      </div>
      <div className="w-20 shrink-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              status === "running" &&
                "bg-gradient-to-r from-[#6366F1] to-blue-500 animate-pulse",
              status === "complete" && "bg-emerald-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-0.5 text-right text-[9px] tabular-nums text-muted-foreground/60">
          {status === "complete" ? "Done" : `${progress}%`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border/50 bg-gradient-to-br from-[#6366F1]/5 via-background to-purple-500/5 px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-lg shadow-[#6366F1]/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Design System v2.0
              </h1>
              <p className="text-sm text-muted-foreground">
                Mockup-inspired component showcase
              </p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            This page demonstrates every component pattern from the UI mockups.
            Every card, badge, table, chart, and interaction follows the same
            design language.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-12 px-8 py-8">
        {/* Section 1: KPI Cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#6366F1]" />
            KPI Metric Cards
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              icon={Wallet}
              label="Cash Available"
              value={formatCurrency(184300)}
              change="+8%"
              trend="up"
              color="bg-gradient-to-br from-emerald-500 to-teal-500"
            />
            <KPICard
              icon={DollarSign}
              label="Monthly Revenue"
              value={formatCurrency(142000)}
              change="+12%"
              trend="up"
              color="bg-gradient-to-br from-[#6366F1] to-blue-500"
            />
            <KPICard
              icon={PieChart}
              label="Net Profit Margin"
              value="18%"
              change="-3%"
              trend="down"
              color="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <KPICard
              icon={CreditCard}
              label="Outstanding AR"
              value={formatCurrency(78500)}
              change="+15%"
              trend="down"
              color="bg-gradient-to-br from-red-500 to-rose-500"
            />
          </div>
        </section>

        {/* Section 2: AI Insights */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#6366F1]" />
            AI Insights Feed
          </h2>
          <div className="space-y-3">
            <InsightCard
              category="revenue"
              title="Revenue increased 18%"
              description="Your revenue this month is 18% higher than the same period last month, driven primarily by increased sales from Brikama Market Traders."
              confidence={0.94}
              priority="high"
            />
            <InsightCard
              category="risk"
              title="4 invoices are overdue"
              description="Four customer invoices totaling GMD 78,500 are past due. Two are overdue by more than 30 days."
              confidence={0.98}
              priority="high"
            />
            <InsightCard
              category="optimization"
              title="Marketing spending increased 31%"
              description="Marketing expenses are up 31% this month. The additional GMD 45,000 in radio advertising has not yet shown measurable ROI."
              confidence={0.87}
              priority="medium"
            />
          </div>
        </section>

        {/* Section 3: Active Workflows */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#6366F1]" />
            Active Workflows
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              <WorkflowRow
                label="Reconciling Bank"
                detail="Matching 45 transactions for Main Operating Account"
                progress={82}
                status="running"
              />
              <WorkflowRow
                label="Generating July Financial Statements"
                detail="Compiling P&L, Balance Sheet, and Cash Flow"
                progress={55}
                status="running"
              />
              <WorkflowRow
                label="Analyzing Expenses"
                detail="Running anomaly detection on expense patterns"
                progress={90}
                status="running"
              />
              <WorkflowRow
                label="Processing Incoming Documents"
                detail="3 invoices classified and linked"
                progress={100}
                status="complete"
              />
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Status Badges */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#6366F1]" />
            Status Badges & Indicators
          </h2>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Paid
            </Badge>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200">
              Pending
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200">
              Overdue
            </Badge>
            <Badge className="bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20">
              AI Active
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              Processing
            </Badge>
            <Badge className="bg-gray-50 text-gray-700 border-gray-200">
              Draft
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Critical</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
              <span className="text-muted-foreground">AI Processing</span>
            </div>
          </div>
        </section>

        {/* Section 5: Buttons */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6366F1]" />
            Buttons & Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white">
              <Sparkles className="h-4 w-4 mr-2" /> Primary Action
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" /> Secondary
            </Button>
            <Button variant="ghost">
              <ChevronRight className="h-4 w-4 mr-2" /> Ghost
            </Button>
            <Button variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" /> Destructive
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        </section>

        {/* Section 6: Chat Input Pattern */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#6366F1]" />
            AI Chat Input Pattern
          </h2>
          <div className="rounded-2xl border-2 border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/10">
                <Sparkles className="h-5 w-5 text-[#6366F1]" />
              </div>
              <input
                type="text"
                placeholder="Ask your AI accountant anything..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                readOnly
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-3 overflow-x-auto">
              {[
                "Forecast cash",
                "Explain profit",
                "Prepare VAT",
                "Review expenses",
              ].map((s) => (
                <button
                  key={s}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:border-[#6366F1]/30 hover:text-[#6366F1] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border/50 pt-6 pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Xenboox Design System v2.0 — Mockup-Inspired Components
          </p>
        </div>
      </div>
    </div>
  );
}
