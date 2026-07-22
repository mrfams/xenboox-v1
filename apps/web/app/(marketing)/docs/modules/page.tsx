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
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

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
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Modules Documentation
        </h1>
        <p className="mt-4 text-muted-foreground">
          Comprehensive guides for all 19 accounting modules in Xenboox.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <module.icon className="h-5 w-5 text-muted-foreground" />
                  {module.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <Link href="/docs">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                ← Back to Documentation Hub
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
