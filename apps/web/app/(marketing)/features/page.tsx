import {
  Bot,
  BookOpen,
  Receipt,
  Landmark,
  Wallet,
  BarChart3,
  FileText,
  Shield,
  RefreshCw,
  Users,
  Globe,
  Zap,
} from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Agent Workforce",
    description:
      "19 specialized AI agents handle accounting tasks autonomously. From journal entry validation to payroll processing, each agent is trained on domain-specific rules and African tax regulations.",
    items: [
      "Hierarchical agent architecture (CFO → Department Heads → Workers)",
      "Confidence-based escalation to humans",
      "LangFuse observability for every decision",
      "Natural language chat interface",
    ],
  },
  {
    icon: BookOpen,
    title: "Complete General Ledger",
    description:
      "Full double-entry accounting with automated journal entries, trial balance, and period-end closing workflows.",
    items: [
      "Chart of Accounts with 5 category types",
      "Automated depreciation scheduling",
      "Multi-currency support with exchange rates",
      "Fiscal period management with close workflows",
    ],
  },
  {
    icon: Receipt,
    title: "Accounts Payable & Receivable",
    description:
      "Manage the full lifecycle of payables and receivables — from purchase orders to payments.",
    items: [
      "Supplier and customer management",
      "Purchase order workflow",
      "Invoice processing with line items",
      "Payment recording and aging reports",
    ],
  },
  {
    icon: Landmark,
    title: "Treasury Management",
    description:
      "Track bank accounts, reconcile transactions, and manage cash flow across multiple accounts.",
    items: [
      "Multi-bank account tracking",
      "Automated transaction matching",
      "Bank reconciliation workflow",
      "Cash position monitoring",
    ],
  },
  {
    icon: Wallet,
    title: "Payroll Processing",
    description:
      "Full payroll engine with Gambia PAYE tax bands, SSNIT contributions, and configurable deductions.",
    items: [
      "PAYE tax calculation (Gambia bands)",
      "SSNIT employee (5%) and employer (10%)",
      "Configurable deduction types",
      "Payslip generation and storage",
    ],
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    description:
      "Real-time financial reports generated from your ledger data. Trial balance, P&L, balance sheet, and more.",
    items: [
      "Profit & Loss statement",
      "Balance Sheet",
      "Trial Balance",
      "Cash flow analysis",
    ],
  },
  {
    icon: FileText,
    title: "Document Management",
    description:
      "Upload, store, and link documents to transactions. Powered by Cloudflare R2 for reliable storage.",
    items: [
      "Presigned upload URLs (R2)",
      "Document-to-transaction linking",
      "OCR text extraction pipeline",
      "Agent-powered document classification",
    ],
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Row-level security, encryption at rest, rate limiting, and comprehensive audit logging.",
    items: [
      "PostgreSQL Row-Level Security",
      "AES-256 encryption for sensitive fields",
      "Rate limiting (Upstash Redis)",
      "Full audit trail on every mutation",
    ],
  },
  {
    icon: RefreshCw,
    title: "Offline-First Desktop",
    description:
      "Tauri desktop app with local SQLite caching. Work offline and sync when reconnected.",
    items: [
      "Local SQLite database cache",
      "Automatic sync on reconnection",
      "Cross-platform (Windows, macOS)",
      "Lightweight Rust backend",
    ],
  },
  {
    icon: Users,
    title: "Multi-Entity Support",
    description:
      "Manage multiple businesses or entities from a single account. Role-based access control for teams.",
    items: [
      "Entity-level data isolation",
      "Role-based access (Owner, Admin, Viewer)",
      "Entity switching from any screen",
      "Per-entity audit trails",
    ],
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    description:
      "Handle transactions in multiple currencies with automatic exchange rate synchronization.",
    items: [
      "ECB exchange rate sync",
      "Currency conversion in reports",
      "GMD, USD, EUR, GBP support",
      "Per-account currency settings",
    ],
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description:
      "Server-sent events for chat streaming, background job processing with Trigger.dev, and live dashboard updates.",
    items: [
      "SSE token streaming for AI chat",
      "Trigger.dev background jobs",
      "Real-time dashboard metrics",
      "Live agent activity monitoring",
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              Features
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need for AI-powered accounting — from journal entries to financial reports.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`grid gap-8 md:grid-cols-2 ${i % 2 === 1 ? "md:direction-rtl" : ""}`}
              >
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">{feature.title}</h2>
                  <p className="mt-3 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <div className={`${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <ul className="space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}