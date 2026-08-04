"use client";

import { useState } from "react";
import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Building2,
  BookOpen,
  Calculator,
  Calendar,
  Wallet,
  Package,
  ArrowRight,
  PieChart,
  Activity,
} from "lucide-react";

const insightSections = [
  {
    id: "reports",
    label: "Reports",
    description: "Financial statements, P&L, balance sheet, and custom reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "journal",
    label: "General Ledger",
    description: "Journal entries, chart of accounts, and accounting records",
    href: "/dashboard/journal",
    icon: BookOpen,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer analytics, aging reports, and receivables",
    href: "/dashboard/customers",
    icon: Users,
    color: "bg-violet-100 text-violet-600",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Vendor analytics, aging reports, and payables",
    href: "/dashboard/vendors",
    icon: Users,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Financial documents, invoices, and receipts",
    href: "/dashboard/documents",
    icon: FileText,
    color: "bg-rose-100 text-rose-600",
  },
  {
    id: "close",
    label: "Close Center",
    description: "Month-end close checklists and period management",
    href: "/dashboard/close",
    icon: Calendar,
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "fixed-assets",
    label: "Fixed Assets",
    description: "Asset register, depreciation, and disposal",
    href: "/dashboard/fixed-assets",
    icon: Building2,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock levels, valuation, and movements",
    href: "/dashboard/inventory",
    icon: Package,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function InsightsPage() {
  const { entityId } = useEntity();

  // Fetch financial insights
  const { data: insightsData } = trpc.aiWorkspace.getFinancialInsights.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const insights = insightsData?.insights ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Insights
        </h1>
        <p className="text-sm text-muted-foreground">
          Financial analytics, reports, and business intelligence.
        </p>
      </div>

      {/* AI-Generated Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              AI Insights
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-background p-4"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    insight.type === "positive"
                      ? "bg-emerald-100"
                      : insight.type === "negative"
                        ? "bg-rose-100"
                        : "bg-primary/10"
                  }`}
                >
                  {insight.type === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : insight.type === "negative" ? (
                    <TrendingUp className="h-4 w-4 text-rose-600 rotate-180" />
                  ) : (
                    <PieChart className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight Sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {insightSections.map((section) => (
          <div key={section.id}>
            <Link
              href={section.href}
              className="group rounded-xl border border-border/50 bg-card p-5 hover:shadow-md transition-all duration-200 block"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.color}`}
                >
                  <section.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {section.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {section.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Quick Access
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Link>
          <Link
            href="/dashboard/journal"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            General Ledger
          </Link>
          <Link
            href="/dashboard/close"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Close Books
          </Link>
          <Link
            href="/dashboard/documents"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <FileText className="h-4 w-4" />
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
