"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  RefreshCw,
  Calendar,
  Plus,
  Upload,
  Building2,
  FileText,
  CreditCard,
  Users,
  Wallet,
  BarChart3,
  BookOpen,
  Receipt,
  Briefcase,
  Calculator,
  TrendingUp,
  Bell,
  Settings,
  Bot,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
}

interface PageEmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  tips?: string[];
  className?: string;
  children?: ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PageEmptyState({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  title,
  description,
  actions = [],
  tips = [],
  className,
  children,
}: PageEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl",
          iconBg,
        )}
      >
        <Icon className={cn("h-8 w-8", iconColor)} />
      </div>

      {/* Title & Description */}
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          {actions.map((action, i) => {
            const ActionIcon = action.icon ?? ArrowRight;
            const content = (
              <span className="inline-flex items-center gap-2">
                <ActionIcon className="h-4 w-4" />
                {action.label}
              </span>
            );

            if (action.href) {
              return (
                <Link key={i} href={action.href}>
                  <Button
                    variant={
                      action.variant === "secondary" ? "outline" : "default"
                    }
                  >
                    {content}
                  </Button>
                </Link>
              );
            }

            return (
              <Button
                key={i}
                variant={action.variant === "secondary" ? "outline" : "default"}
                onClick={action.onClick}
              >
                {content}
              </Button>
            );
          })}
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className="mt-8 rounded-xl border border-border/50 bg-muted/30 p-4 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">
              Getting started
            </span>
          </div>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Custom content */}
      {children}
    </div>
  );
}

// ─── Page-Specific Empty State Configs ──────────────────────────────────────

export const PAGE_EMPTY_STATES = {
  dashboard: {
    icon: Sparkles,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Welcome to Xenboox!",
    description:
      "Your AI-powered accounting platform is ready. Set up your first entity to start managing your finances with AI agents.",
    actions: [
      { label: "Create Entity", href: "/register/onboarding", icon: Plus },
      { label: "Learn More", href: "/docs", variant: "secondary" as const },
    ],
    tips: [
      "Connect your bank accounts for automatic reconciliation",
      "Upload invoices and receipts for AI-powered data extraction",
      "Ask the AI agent anything about your financial data",
    ],
  },

  chat: {
    icon: Bot,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Start a conversation with your AI CFO",
    description:
      "Ask questions, upload documents, or give instructions. Your AI agent can help with anything from cash position to journal entries.",
    actions: [
      { label: "Ask about cash position", icon: Wallet },
      { label: "Upload a document", icon: Upload },
      { label: "Create an invoice", icon: FileText },
    ],
    tips: [
      "Upload receipts or invoices for automatic processing",
      "Ask 'What's my cash position?' for instant answers",
      "Request reports like 'Generate P&L for this month'",
      "The AI can create journal entries, invoices, and more",
    ],
  },

  banking: {
    icon: Building2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Connect your first bank account",
    description:
      "Link your bank accounts to automatically import transactions and reconcile your books. We support major banks in The Gambia.",
    actions: [
      { label: "Connect Bank Account", icon: Plus },
      {
        label: "Import Statement",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Bank feeds sync automatically every few hours",
      "AI categorizes transactions for you",
      "Reconciliation becomes effortless with auto-matching",
    ],
  },

  invoicing: {
    icon: CreditCard,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    title: "Create your first invoice",
    description:
      "Send professional invoices to your customers and track payments. AI helps you follow up on overdue invoices automatically.",
    actions: [
      { label: "Create Invoice", href: "/dashboard/invoicing/new", icon: Plus },
      { label: "Import Customers", variant: "secondary" as const },
    ],
    tips: [
      "Add your logo and payment terms for professional invoices",
      "Set up recurring invoices for regular clients",
      "AI tracks overdue invoices and sends reminders",
    ],
  },

  bills: {
    icon: Receipt,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Track your bills and payables",
    description:
      "Record bills from vendors, track due dates, and manage payments. Never miss a payment deadline again.",
    actions: [
      { label: "Add Bill", icon: Plus },
      {
        label: "Import from Email",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Upload bill photos for automatic data extraction",
      "Set up payment schedules and reminders",
      "AI categorizes expenses automatically",
    ],
  },

  expenses: {
    icon: Wallet,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Record your first expense",
    description:
      "Track business expenses, categorize them, and keep your books accurate. Upload receipts for automatic processing.",
    actions: [
      { label: "Add Expense", icon: Plus },
      { label: "Upload Receipt", icon: Upload, variant: "secondary" as const },
    ],
    tips: [
      "Take a photo of receipts for instant capture",
      "AI categorizes expenses by type automatically",
      "Track expenses against your budget in real-time",
    ],
  },

  journal: {
    icon: BookOpen,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    title: "Create your first journal entry",
    description:
      "Record double-entry transactions manually or let AI create them from uploaded documents and bank feeds.",
    actions: [
      { label: "New Journal Entry", icon: Plus },
      { label: "Let AI Create", variant: "secondary" as const },
    ],
    tips: [
      "AI ensures debits always equal credits",
      "Entries are automatically posted to the general ledger",
      "Review and approve before posting",
    ],
  },

  "chart-of-accounts": {
    icon: Calculator,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    title: "Set up your Chart of Accounts",
    description:
      "Define your account structure for recording transactions. We've prepared templates based on your country's standards.",
    actions: [
      { label: "Use Template", icon: Sparkles },
      { label: "Create Custom", icon: Plus, variant: "secondary" as const },
    ],
    tips: [
      "Templates follow Gambia's accounting standards",
      "AI can suggest accounts based on your business type",
      "You can always add or modify accounts later",
    ],
  },

  reports: {
    icon: BarChart3,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    title: "Generate your first report",
    description:
      "Create financial reports from your data. Start with a Profit & Loss statement or Balance Sheet to see your financial health.",
    actions: [
      { label: "Generate P&L Report", icon: BarChart3 },
      { label: "View Balance Sheet", variant: "secondary" as const },
    ],
    tips: [
      "Reports update automatically as new data comes in",
      "Compare periods to spot trends",
      "Export to PDF or Excel for sharing",
    ],
  },

  payroll: {
    icon: Users,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-50",
    title: "Set up payroll for your team",
    description:
      "Add employees, configure salaries, and run payroll. We handle NASSIT contributions, PAYE tax, and generate payslips.",
    actions: [
      { label: "Add Employee", icon: Users },
      {
        label: "Import from File",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "We calculate NASSIT and PAYE automatically",
      "Generate payslips in one click",
      "Track payroll expenses against your budget",
    ],
  },

  customers: {
    icon: Users,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Add your first customer",
    description:
      "Keep track of your customers, their contact details, and outstanding balances. AI helps you manage relationships.",
    actions: [
      { label: "Add Customer", icon: Plus },
      {
        label: "Import from Contacts",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Track customer payment history automatically",
      "AI identifies at-risk accounts before they become overdue",
      "Generate customer statements with one click",
    ],
  },

  vendors: {
    icon: Briefcase,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    title: "Add your first vendor",
    description:
      "Track suppliers, manage purchase orders, and keep your accounts payable organized. Never miss a payment.",
    actions: [
      { label: "Add Vendor", icon: Plus },
      { label: "Import from Bills", variant: "secondary" as const },
    ],
    tips: [
      "AI categorizes vendor expenses automatically",
      "Track payment schedules and due dates",
      "Compare vendor prices to find savings",
    ],
  },

  documents: {
    icon: FileText,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    title: "Upload your first document",
    description:
      "Upload invoices, receipts, bank statements, and contracts. AI extracts data and creates journal entries automatically.",
    actions: [
      { label: "Upload Document", icon: Upload },
      { label: "Connect Email", icon: Bell, variant: "secondary" as const },
    ],
    tips: [
      "Supports PDF, images, Excel, and Word documents",
      "AI extracts key fields like dates, amounts, and vendors",
      "Documents are linked to journal entries automatically",
    ],
  },

  "fixed-assets": {
    icon: Briefcase,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    title: "Register your first asset",
    description:
      "Track fixed assets, calculate depreciation, and manage asset lifecycles. AI handles depreciation schedules automatically.",
    actions: [
      { label: "Register Asset", icon: Plus },
      {
        label: "Import Asset List",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "We support multiple depreciation methods",
      "Asset values update automatically each month",
      "Track disposal and transfer history",
    ],
  },

  reconciliation: {
    icon: RefreshCw,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Start bank reconciliation",
    description:
      "Match your bank transactions with book records. AI auto-matches most transactions and flags discrepancies for review.",
    actions: [
      { label: "Connect Bank", icon: Building2 },
      {
        label: "Import Statement",
        icon: Upload,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "AI matches transactions with 95%+ accuracy",
      "Discrepancies are flagged for your review",
      "Reconciliation status updates in real-time",
    ],
  },

  inbox: {
    icon: Bell,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Your inbox is empty",
    description:
      "All caught up! When AI agents need your attention, items will appear here. Check back later or explore other sections.",
    actions: [
      {
        label: "Go to Dashboard",
        href: "/dashboard",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "AI agents notify you when approvals are needed",
      "Set up notification preferences in Settings",
      "Check the Work tab for pending tasks",
    ],
  },

  work: {
    icon: Briefcase,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "No pending work",
    description:
      "All tasks are complete! When AI agents create work items that need your review, they'll appear here.",
    actions: [
      {
        label: "View Dashboard",
        href: "/dashboard",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Approvals from AI agents appear in the Approvals tab",
      "Tasks like month-end close show in the Tasks tab",
      "Notifications keep you informed of important events",
    ],
  },

  insights: {
    icon: TrendingUp,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    title: "Insights require data",
    description:
      "Upload documents, connect bank accounts, or record transactions to unlock AI-powered financial insights and recommendations.",
    actions: [
      { label: "Upload Documents", icon: Upload },
      {
        label: "Connect Bank",
        href: "/dashboard/banking",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "AI analyzes your data to spot trends and anomalies",
      "Get personalized recommendations for cost savings",
      "Forecast cash flow and revenue projections",
    ],
  },

  money: {
    icon: Wallet,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Manage your money flow",
    description:
      "Connect bank accounts and mobile money to see your complete cash position. Track incoming and outgoing payments.",
    actions: [
      { label: "Connect Bank Account", icon: Building2 },
      {
        label: "Add Mobile Money",
        icon: Wallet,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Supports bank transfers and mobile money (QCell, Africell)",
      "Real-time balance updates",
      "AI forecasts your cash flow",
    ],
  },

  agents: {
    icon: Bot,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Your AI workforce is ready",
    description:
      "19 AI agents are standing by to handle your accounting tasks. They'll appear here once they start processing work.",
    actions: [
      { label: "Start with AI Chat", href: "/dashboard/chat", icon: Bot },
      {
        label: "Upload Documents",
        href: "/dashboard/documents",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Agents work autonomously once given tasks",
      "They escalate to you when confidence is low",
      "All actions are logged for audit purposes",
    ],
  },

  "agent-monitor": {
    icon: Bot,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Agent monitoring dashboard",
    description:
      "Monitor AI agent performance, success rates, and activity. Data appears here once agents start processing tasks.",
    actions: [
      {
        label: "View Agent Activity",
        href: "/dashboard/agents",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Track agent success rates and response times",
      "Review escalation patterns",
      "Monitor confidence scores across agents",
    ],
  },

  automation: {
    icon: Settings,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-50",
    title: "Set up automations",
    description:
      "Create workflows that run automatically on schedule or triggered by events. Let AI handle repetitive tasks.",
    actions: [
      { label: "Create Workflow", icon: Plus },
      { label: "Browse Templates", variant: "secondary" as const },
    ],
    tips: [
      "Schedule recurring tasks like bank imports",
      "Trigger workflows from document uploads",
      "AI suggests automations based on your patterns",
    ],
  },

  close: {
    icon: Calendar,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Period close management",
    description:
      "Close your books at the end of each period. AI agents handle most tasks and only escalate issues that need your attention.",
    actions: [
      { label: "Start Period Close", icon: Calendar },
      { label: "View History", variant: "secondary" as const },
    ],
    tips: [
      "AI runs close checklist items automatically",
      "Reconciliation is verified before closing",
      "Journal entries are validated for accuracy",
    ],
  },

  settings: {
    icon: Settings,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-50",
    title: "Configure your settings",
    description:
      "Set up your entity details, team members, API keys, and preferences. Customize Xenboox to fit your business.",
    actions: [
      { label: "Edit Entity Details", icon: Settings },
      {
        label: "Invite Team Members",
        icon: Users,
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Set your base currency and fiscal year",
      "Configure notification preferences",
      "Manage API keys for integrations",
    ],
  },

  transactions: {
    icon: FileText,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "No transactions yet",
    description:
      "Transactions appear here once you start recording financial activity. Upload documents or connect bank accounts to get started.",
    actions: [
      { label: "Upload Document", icon: Upload },
      {
        label: "Connect Bank",
        href: "/dashboard/banking",
        variant: "secondary" as const,
      },
    ],
    tips: [
      "Bank transactions sync automatically",
      "Document uploads create transactions via AI",
      "Filter and search across all transactions",
    ],
  },
};

// ─── Helper Hook ───────────────────────────────────────────────────────────

export function getPageEmptyState(page: keyof typeof PAGE_EMPTY_STATES) {
  return PAGE_EMPTY_STATES[page];
}
