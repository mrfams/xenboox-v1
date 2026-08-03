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
import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Automation",
    subtitle: "Intelligent bookkeeping that runs itself",
    description:
      "Automate journal entries, reconciliations, and routine accounting tasks with AI that learns your business and gets smarter over time.",
    items: [
      "Automated transaction categorization",
      "Smart matching and reconciliation",
      "Human review for complex decisions",
      "Natural language chat interface",
    ],
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
  },
  {
    icon: Wallet,
    title: "Payroll Processing",
    subtitle: "Multi-jurisdiction payroll engine",
    description:
      "Full payroll with local tax bands, statutory contributions, and configurable deductions.",
    items: [
      "PAYE tax calculation",
      "Statutory contributions (SSNIT, NHIL)",
      "Configurable deduction types",
      "Payslip generation and storage",
    ],
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
  },
  {
    icon: FileText,
    title: "Document Management",
    subtitle: "AI-powered document processing",
    description:
      "Upload, classify, and extract data from documents automatically. Secure cloud storage included.",
    items: [
      "Secure cloud storage",
      "Document-to-transaction linking",
      "OCR text extraction",
      "Automatic document classification",
    ],
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    subtitle: "Bank-grade data protection",
    description:
      "Row-level security, encryption, rate limiting, and comprehensive audit logging.",
    items: [
      "Database-level security",
      "AES-256 encryption for sensitive fields",
      "Rate limiting and abuse prevention",
      "Full audit trail on every action",
    ],
  },
  {
    icon: RefreshCw,
    title: "Offline-First Desktop",
    subtitle: "Works with or without internet",
    description:
      "Desktop app with local caching. Work offline and sync when reconnected.",
    items: [
      "Local database cache",
      "Automatic sync on reconnection",
      "Cross-platform (Windows, macOS)",
      "Lightweight and fast",
    ],
  },
  {
    icon: Users,
    title: "Multi-Entity Support",
    subtitle: "Manage multiple businesses",
    description:
      "Manage multiple entities from a single account with role-based access control for teams.",
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
    subtitle: "Handle any currency",
    description:
      "Handle transactions in multiple currencies with automatic exchange rate synchronization.",
    items: [
      "Automatic exchange rate sync",
      "Currency conversion in reports",
      "GMD, USD, EUR, GBP support",
      "Per-account currency settings",
    ],
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    subtitle: "Instant insights and updates",
    description:
      "Live dashboard updates, background job processing, and real-time notifications.",
    items: [
      "Real-time chat interface",
      "Background job processing",
      "Live dashboard metrics",
      "Instant notifications",
    ],
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
                Everything your finance team{" "}
                <span className="text-primary">needs to run</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                All modules work together as one system — no spreadsheets, no
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
