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
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const features = [
  {
    icon: Bot,
    title: "AI Agent Workforce",
    subtitle: "19 specialized agents working for you",
    description:
      "From journal entry validation to payroll processing, each agent is trained on domain-specific rules and African tax regulations.",
    items: [
      "Hierarchical architecture (CFO → Department Heads → Workers)",
      "Confidence-based escalation to humans",
      "LangFuse observability for every decision",
      "Natural language chat interface",
    ],
    gradient: "from-blue-600 to-indigo-600",
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
  },
  {
    icon: Receipt,
    title: "Payables & Receivables",
    subtitle: "Full lifecycle management",
    description:
      "Manage the complete lifecycle of payables and receivables — from purchase orders to payments.",
    items: [
      "Supplier and customer management",
      "Purchase order workflow",
      "Invoice processing with line items",
      "Payment recording and aging reports",
    ],
    gradient: "from-amber-500 to-orange-600",
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
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    subtitle: "Real-time financial intelligence",
    description:
      "Trial balance, P&L, balance sheet, cash flow — generated automatically from your ledger data.",
    items: [
      "Profit & Loss statement",
      "Balance Sheet",
      "Trial Balance",
      "Cash flow analysis",
    ],
    gradient: "from-cyan-500 to-blue-600",
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
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Everything included
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Everything a finance team does.{" "}
                <span className="text-primary">Done by agents.</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                All 20 modules work together as one system — no spreadsheets, no
                plugins, no patchwork.
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Features Grid */}
      <Section id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FadeInUp key={feature.title} delay={(index % 3) * 0.1}>
                <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs text-primary font-medium">
                    {feature.subtitle}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="border-t bg-paper-2/60 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to automate your accounting?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Scale as you grow. No credit card required.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50"
              >
                View Pricing
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
