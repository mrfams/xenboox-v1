"use client";

import { useState } from "react";
import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  FileText,
  Users,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Banknote,
} from "lucide-react";

const moneySections = [
  {
    id: "transactions",
    label: "Transactions",
    description: "View and manage all financial transactions",
    href: "/dashboard/transactions",
    icon: FileText,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "banking",
    label: "Banking",
    description: "Bank accounts, reconciliation, and cash management",
    href: "/dashboard/banking",
    icon: Building2,
    color: "bg-emerald-100 text-emerald-600",
    children: [
      { label: "Bank Accounts", href: "/dashboard/banking" },
      { label: "Cash", href: "/dashboard/cash" },
      { label: "Reconciliation", href: "/dashboard/reconciliation/center" },
    ],
  },
  {
    id: "invoicing",
    label: "Invoicing",
    description: "Create and manage sales invoices",
    href: "/dashboard/invoicing",
    icon: Receipt,
    color: "bg-violet-100 text-violet-600",
  },
  {
    id: "bills",
    label: "Bills",
    description: "Track and pay vendor bills",
    href: "/dashboard/bills",
    icon: CreditCard,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Record and categorize business expenses",
    href: "/dashboard/expenses",
    icon: Wallet,
    color: "bg-rose-100 text-rose-600",
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Run payroll and manage employee payments",
    href: "/dashboard/payroll",
    icon: Banknote,
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Manage customer relationships and receivables",
    href: "/dashboard/customers",
    icon: Users,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Manage vendor relationships and payables",
    href: "/dashboard/vendors",
    icon: Users,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function MoneyPage() {
  const { entityId } = useEntity();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Fetch cash balance
  const { data: cashFlowData } = trpc.aiWorkspace.getCashFlowOverview.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const netCashFlow = cashFlowData?.summary?.netCashFlow ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Money
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything related to your finances — transactions, banking,
          invoicing, and more.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(netCashFlow)}
              </p>
              <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(cashFlowData?.summary?.totalCashIn ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Cash In (MTD)</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(cashFlowData?.summary?.totalCashOut ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Cash Out (MTD)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Money Sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {moneySections.map((section) => (
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
            {section.children && (
              <div className="mt-2 ml-5 space-y-1">
                {section.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/invoicing"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Create Invoice
          </Link>
          <Link
            href="/dashboard/bills"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Record Bill
          </Link>
          <Link
            href="/dashboard/expenses"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Wallet className="h-4 w-4" />
            Log Expense
          </Link>
          <Link
            href="/dashboard/reconciliation/center"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reconcile
          </Link>
        </div>
      </div>
    </div>
  );
}
