import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  Truck,
  CreditCard,
  Shield,
  Landmark,
  Wallet,
  Package,
  BarChart3,
  FileText,
  Bot,
  MessageSquare,
  Calendar,
  Settings,
  LayoutDashboard,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
} from "../../components/marketing-primitives";

const modules = [
  {
    title: "Accounts Payable",
    description:
      "Suppliers, Purchase Orders, Invoices, Payments, Approval workflows.",
    href: "/docs/modules/ap",
    icon: Truck,
  },
  {
    title: "Accounts Receivable",
    description: "Customers, Sales Invoices, Payments, Credit Notes.",
    href: "/docs/modules/ar",
    icon: CreditCard,
  },
  {
    title: "Payroll",
    description: "Employees, Contracts, Payroll Runs, Payslips, Staff Loans.",
    href: "/docs/modules/payroll",
    icon: Shield,
  },
  {
    title: "Treasury",
    description:
      "Bank Accounts, Transactions, Reconciliations, Cash Management.",
    href: "/docs/modules/treasury",
    icon: Landmark,
  },
  {
    title: "Cash",
    description: "Petty Cash, Imprest Floats, Cash Books, Float Management.",
    href: "/docs/modules/cash",
    icon: Wallet,
  },
  {
    title: "Mobile Money",
    description:
      "Mobile Money Accounts, Transactions, Reconciliation with bank statements.",
    href: "/docs/modules/mobile-money",
    icon: Wallet,
  },
  {
    title: "Inventory",
    description: "Warehouses, Items, Stock Transactions, Valuation Methods.",
    href: "/docs/modules/inventory",
    icon: Package,
  },
  {
    title: "Fixed Assets",
    description: "Asset Register, Depreciation, Disposals, Tax Reporting.",
    href: "/docs/modules/fixed-assets",
    icon: BarChart3,
  },
  {
    title: "Chart of Accounts",
    description: "Account Structure, Types, Subtypes, Hierarchy and Coding.",
    href: "/docs/modules/coa",
    icon: LayoutDashboard,
  },
  {
    title: "Journal",
    description: "Journal Entries, Entry Lines, Status Workflow, Reversals.",
    href: "/docs/modules/journal",
    icon: FileText,
  },
  {
    title: "Fiscal Periods",
    description: "Period Management, Closing Workflow, Lock Status.",
    href: "/docs/modules/fiscal",
    icon: Calendar,
  },
  {
    title: "Reports",
    description: "P&L, Balance Sheet, Trial Balance, Custom Reports.",
    href: "/docs/modules/reports",
    icon: BarChart3,
  },
  {
    title: "Documents",
    description: "Upload, OCR, Classification, Document Linking.",
    href: "/docs/modules/documents",
    icon: FileText,
  },
  {
    title: "Chat",
    description: "AI Assistant, Natural Language Commands, File Uploads.",
    href: "/docs/modules/chat",
    icon: MessageSquare,
  },
  {
    title: "Multi-Currency",
    description: "Currency Setup, Exchange Rates, Conversion Logic.",
    href: "/docs/modules/currency",
    icon: CreditCard,
  },
  {
    title: "Organizations",
    description: "Org Structure, Entities, Roles, Access Control.",
    href: "/docs/modules/organizations",
    icon: Users,
  },
  {
    title: "Settings",
    description: "Profile, Security, Notifications, API Keys.",
    href: "/docs/modules/settings",
    icon: Settings,
  },
  {
    title: "Analytics",
    description: "Usage Metrics, Spend Alerts, AI Cost Comparison.",
    href: "/docs/modules/analytics",
    icon: BarChart3,
  },
];

export default function ModulesDocsPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Documentation"
        title="Modules"
        highlight="Documentation"
        subtitle="Comprehensive guides for every accounting module in Xenboox."
      />

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link key={module.title} href={module.href}>
                <GlassCard className="h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-300">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/55">
                    {module.description}
                  </p>
                </GlassCard>
              </Link>
            ))}
          </Reveal>

          <Reveal className="mt-12">
            <Link href="/docs">
              <GlassCard className="p-6 text-center">
                <span className="text-sm text-white/60">
                  ← Back to Documentation Hub
                </span>
              </GlassCard>
            </Link>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
