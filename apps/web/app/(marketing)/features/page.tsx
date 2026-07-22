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
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Bot,
    title: "AI Agent Workforce",
    subtitle: "19 specialized agents working for you",
    description:
      "From journal entry validation to payroll processing, each agent is trained on domain-specific rules and African tax regulations.",
    items: [
      "Hierarchical architecture (CFO -> Department Heads -> Workers)",
      "Confidence-based escalation to humans",
      "LangFuse observability for every decision",
      "Natural language chat interface",
    ],
    gradient: "from-blue-600 to-indigo-600",
    glow: "shadow-blue-500/20",
  },
  {
    icon: BookOpen,
    title: "Complete General Ledger",
    subtitle: "Full double-entry accounting",
    description:
      "Automated journal entries, trial balance, and period-end closing workflows with multi-currency support.",
    items: [
      "Chart of Accounts with 5 category types",
      "Automated depreciation scheduling",
      "Multi-currency with exchange rates",
      "Fiscal period management with close workflows",
    ],
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: Receipt,
    title: "Payables & Receivables",
    subtitle: "Full lifecycle management",
    description:
      "Manage the complete lifecycle of payables and receivables - from purchase orders to payments.",
    items: [
      "Supplier and customer management",
      "Purchase order workflow",
      "Invoice processing with line items",
      "Payment recording and aging reports",
    ],
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
  },
  {
    icon: Landmark,
    title: "Treasury Management",
    subtitle: "Multi-bank reconciliation",
    description:
      "Track accounts, reconcile transactions, and manage cash flow across multiple accounts in real time.",
    items: [
      "Multi-bank account tracking",
      "Automated transaction matching",
      "Bank reconciliation workflow",
      "Cash position monitoring",
    ],
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Wallet,
    title: "Payroll Processing",
    subtitle: "Multi-jurisdiction payroll engine",
    description:
      "Full payroll with Gambia PAYE tax bands, SSNIT contributions, and configurable deductions.",
    items: [
      "PAYE tax calculation (Gambia bands)",
      "SSNIT employee (5%) and employer (10%)",
      "Configurable deduction types",
      "Payslip generation and storage",
    ],
    gradient: "from-pink-500 to-rose-600",
    glow: "shadow-pink-500/20",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    subtitle: "Real-time financial intelligence",
    description:
      "Trial balance, P&L, balance sheet, cash flow - generated automatically from your ledger data.",
    items: [
      "Profit & Loss statement",
      "Balance Sheet",
      "Trial Balance",
      "Cash flow analysis",
    ],
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/20",
  },
  {
    icon: FileText,
    title: "Document Management",
    subtitle: "AI-powered document processing",
    description:
      "Upload, classify, and extract data from documents automatically. Powered by Cloudflare R2.",
    items: [
      "Presigned upload URLs (R2)",
      "Document-to-transaction linking",
      "OCR text extraction pipeline",
      "Agent-powered document classification",
    ],
    gradient: "from-teal-500 to-emerald-600",
    glow: "shadow-teal-500/20",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    subtitle: "Bank-grade data protection",
    description:
      "Row-level security, AES-256 encryption, rate limiting, and comprehensive audit logging.",
    items: [
      "PostgreSQL Row-Level Security",
      "AES-256 encryption for sensitive fields",
      "Rate limiting (Upstash Redis)",
      "Full audit trail on every mutation",
    ],
    gradient: "from-red-500 to-rose-600",
    glow: "shadow-red-500/20",
  },
  {
    icon: RefreshCw,
    title: "Offline-First Desktop",
    subtitle: "Works with or without internet",
    description:
      "Tauri desktop app with local SQLite caching. Work offline and sync when reconnected.",
    items: [
      "Local SQLite database cache",
      "Automatic sync on reconnection",
      "Cross-platform (Windows, macOS)",
      "Lightweight Rust backend",
    ],
    gradient: "from-indigo-500 to-blue-600",
    glow: "shadow-indigo-500/20",
  },
  {
    icon: Users,
    title: "Multi-Entity Support",
    subtitle: "Manage multiple businesses",
    description:
      "Manage multiple entities from a single account with role-based access control for teams.",
    items: [
      "Entity-level data isolation (RLS)",
      "Role-based access (Owner, Admin, Viewer)",
      "Entity switching from any screen",
      "Per-entity audit trails",
    ],
    gradient: "from-orange-500 to-amber-600",
    glow: "shadow-orange-500/20",
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    subtitle: "Handle any currency",
    description:
      "Handle transactions in multiple currencies with automatic exchange rate synchronization.",
    items: [
      "ECB exchange rate sync",
      "Currency conversion in reports",
      "GMD, USD, EUR, GBP support",
      "Per-account currency settings",
    ],
    gradient: "from-green-500 to-emerald-600",
    glow: "shadow-green-500/20",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    subtitle: "Instant AI-powered insights",
    description:
      "SSE token streaming, Trigger.dev background jobs, and live dashboard updates.",
    items: [
      "SSE token streaming for AI chat",
      "Trigger.dev background jobs",
      "Real-time dashboard metrics",
      "Live agent activity monitoring",
    ],
    gradient: "from-yellow-500 to-amber-600",
    glow: "shadow-yellow-500/20",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-blue-400" />
              Platform
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Everything you need to</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                run your finance function
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-2xl">
              Xenboox combines 19 specialized AI agents with a complete
              double-entry accounting platform. From journal entries to
              consolidated reporting - no gaps, no compromises.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-sm ${feature.glow} group-hover:shadow-lg transition-shadow duration-300`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
