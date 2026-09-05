import {
  LayoutDashboard,
  MessageSquare,
  Receipt,
  BookOpen,
  Wallet,
  Users,
  FileText,
  CreditCard,
  Landmark,
  BarChart3,
  RefreshCw,
  Activity,
  ScrollText,
  Settings,
  Bot,
  Inbox,
  DollarSign,
  Handshake,
  Truck,
  FolderOpen,
  FileStack,
  PieChart,
  ScanSearch,
  BadgeCheck,
  Building2,
  NotebookPen,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type PageGroup =
  | "Overview & AI"
  | "Money"
  | "Sales"
  | "Purchasing & Expenses"
  | "Accounting & Payroll"
  | "Documents & Data"
  | "Administration";

export type PageEntry = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: PageGroup;
  /** Whether the page has the "Ask Xenboox" page-aware copilot. */
  copilot?: boolean;
};

export const PAGE_GROUPS: PageGroup[] = [
  "Overview & AI",
  "Money",
  "Sales",
  "Purchasing & Expenses",
  "Accounting & Payroll",
  "Documents & Data",
  "Administration",
];

// ─── Directory ─────────────────────────────────────────────────────────────

export const PAGES: PageEntry[] = [
  // ── Overview & AI ──────────────────────────────────────────────────────
  {
    href: "/dashboard",
    title: "Dashboard",
    description:
      "Executive briefing, cash runway, business health KPIs, approvals, and recent activity in one place.",
    icon: LayoutDashboard,
    group: "Overview & AI",
  },
  {
    href: "/dashboard",
    title: "AI Command Center",
    description:
      "Chat with the CFO agent — ask questions, delegate tasks, request changes, and approve agent work.",
    icon: MessageSquare,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/activity-hub",
    title: "Work",
    description:
      "Your task center — inbox items, approvals, and agent-generated work queued for you.",
    icon: Inbox,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/activity-hub",
    title: "Inbox",
    description:
      "Documents and transactions waiting for review, categorization, or approval.",
    icon: Inbox,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/activity-hub",
    title: "Review Queue",
    description:
      "Low-confidence or high-value agent output that needs your sign-off before posting.",
    icon: BadgeCheck,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/insights",
    title: "Insights",
    description:
      "AI-generated business insights, anomalies, and trends across your financial data.",
    icon: PieChart,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/activity-hub",
    title: "Agents",
    description:
      "Meet the Xenboox workforce — the CFO agent and the specialist agents beneath it.",
    icon: Bot,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/agent-monitor",
    title: "Agent Monitor",
    description:
      "Live visibility into every agent run — what ran, when, confidence, and cost.",
    icon: Activity,
    group: "Overview & AI",
  },
  {
    href: "/dashboard/activity",
    title: "Activity Log",
    description:
      "Every action by your team and by agents, in a tamper-evident, verifiable audit chain.",
    icon: ScrollText,
    group: "Overview & AI",
    copilot: true,
  },

  // ── Money ──────────────────────────────────────────────────────────────
  {
    href: "/dashboard/ledger",
    title: "Transactions",
    description:
      "All transactions, intelligently categorized. Review, recategorize, and post.",
    icon: BookOpen,
    group: "Money",
    copilot: true,
  },
  {
    href: "/dashboard/operations",
    title: "Banking",
    description:
      "Connected bank accounts, imported statements, and transactions to process.",
    icon: Wallet,
    group: "Money",
    copilot: true,
  },
  {
    href: "/dashboard/money",
    title: "Mobile Money",
    description:
      "Mobile-money accounts and transactions for markets where wallets lead.",
    icon: DollarSign,
    group: "Money",
  },
  {
    href: "/dashboard/operations",
    title: "Reconciliation",
    description: "Match bank lines to your books and keep accounts in balance.",
    icon: ScanSearch,
    group: "Money",
    copilot: true,
  },
  {
    href: "/dashboard/operations",
    title: "Reconciliation Center",
    description:
      "The command post for reconciliations — open items, matches, and suggestions.",
    icon: ScanSearch,
    group: "Money",
  },

  // ── Sales ──────────────────────────────────────────────────────────────
  {
    href: "/dashboard",
    title: "Customers",
    description:
      "Customer relationships, credit, and receivables — with AI support.",
    icon: Users,
    group: "Sales",
    copilot: true,
  },
  {
    href: "/dashboard",
    title: "Invoicing",
    description:
      "Create, send, and track customer invoices. Convert estimates in a click.",
    icon: Receipt,
    group: "Sales",
    copilot: true,
  },
  {
    href: "/dashboard",
    title: "Estimates & Quotes",
    description:
      "Draft quotes for customers and convert them to invoices when accepted.",
    icon: FileText,
    group: "Sales",
  },

  // ── Purchasing & Expenses ──────────────────────────────────────────────
  {
    href: "/dashboard",
    title: "Vendors",
    description: "Manage vendors, payments, and relationships with suppliers.",
    icon: Truck,
    group: "Purchasing & Expenses",
    copilot: true,
  },
  {
    href: "/dashboard",
    title: "Bills",
    description:
      "Vendor bills and payables — extract, review, and pay with confidence.",
    icon: CreditCard,
    group: "Purchasing & Expenses",
    copilot: true,
  },
  {
    href: "/dashboard",
    title: "Expenses",
    description: "Track, categorize, and manage business expenses with AI.",
    icon: Handshake,
    group: "Purchasing & Expenses",
    copilot: true,
  },

  // ── Accounting & Payroll ───────────────────────────────────────────────
  {
    href: "/dashboard/ledger",
    title: "General Ledger",
    description:
      "Journal entries, trial balance, and the ledger — reviewed with AI assistance.",
    icon: NotebookPen,
    group: "Accounting & Payroll",
    copilot: true,
  },
  {
    href: "/dashboard/ledger",
    title: "Chart of Accounts",
    description:
      "Design the account structure that maps to how your business works.",
    icon: BookOpen,
    group: "Accounting & Payroll",
  },
  {
    href: "/dashboard/ledger",
    title: "Fixed Assets",
    description:
      "Track assets, depreciation, and disposals over their useful life.",
    icon: Building2,
    group: "Accounting & Payroll",
  },
  {
    href: "/dashboard/operations",
    title: "Payroll",
    description:
      "Run payroll periods — gross pay, statutory deductions, and net pay per run.",
    icon: Users,
    group: "Accounting & Payroll",
    copilot: true,
  },
  {
    href: "/dashboard/operations",
    title: "Tax & Compliance",
    description:
      "Withholding records, VAT, and jurisdiction tax rules — configured your way.",
    icon: Landmark,
    group: "Accounting & Payroll",
  },
  {
    href: "/dashboard",
    title: "Close Center",
    description:
      "The autonomous month-end close — checklist, tasks, and sign-off.",
    icon: RefreshCw,
    group: "Accounting & Payroll",
  },
  {
    href: "/dashboard/financial-pulse",
    title: "Reports",
    description:
      "Profit & loss, balance sheet, cash flow, and more — with AI-written narratives.",
    icon: BarChart3,
    group: "Accounting & Payroll",
    copilot: true,
  },

  // ── Documents & Data ───────────────────────────────────────────────────
  {
    href: "/dashboard",
    title: "Documents",
    description:
      "Store, organize, and manage financial documents. AI extracts and categorizes.",
    icon: FolderOpen,
    group: "Documents & Data",
    copilot: true,
  },
  {
    href: "/dashboard",
    title: "Document Artifacts",
    description:
      "Chat artifacts and AI-generated outputs attached to your conversations.",
    icon: FileStack,
    group: "Documents & Data",
  },

  // ── Administration ─────────────────────────────────────────────────────
  {
    href: "/dashboard",
    title: "Automation",
    description:
      "Rules and triggers that let Xenboox run routine work for you.",
    icon: RefreshCw,
    group: "Administration",
  },
  {
    href: "/dashboard/settings",
    title: "Settings",
    description:
      "Entity settings, users & roles, taxes, branding, and integrations.",
    icon: Settings,
    group: "Administration",
  },
  {
    href: "/docs",
    title: "Help Center",
    description:
      "Guides, documentation, and support — search topics or ask the AI.",
    icon: HelpCircle,
    group: "Administration",
  },
];
