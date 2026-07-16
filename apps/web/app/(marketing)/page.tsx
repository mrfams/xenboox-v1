import Link from "next/link"
import {
  Bot,
  BookOpen,
  Landmark,
  Receipt,
  Wallet,
  BarChart3,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Accounting Agents",
    description:
      "19 specialized AI agents handle journal entries, reconciliations, payroll, and more — automatically.",
  },
  {
    icon: BookOpen,
    title: "Double-Entry Ledger",
    description:
      "Full double-entry accounting with chart of accounts, journal entries, and trial balance. IFRS-ready.",
  },
  {
    icon: Receipt,
    title: "Accounts Payable & Receivable",
    description:
      "Manage suppliers, customers, invoices, purchase orders, and payments in one place.",
  },
  {
    icon: Landmark,
    title: "Treasury & Cash",
    description:
      "Track bank accounts, petty cash, imprest floats, mobile money, and reconciliations.",
  },
  {
    icon: Wallet,
    title: "Payroll",
    description:
      "Process payroll with PAYE tax bands, SSNIT contributions, deductions, and payslip generation.",
  },
  {
    icon: BarChart3,
    title: "Financial Reports",
    description:
      "Profit & Loss, Balance Sheet, Trial Balance, and cash flow reports generated in real-time.",
  },
]

const stats = [
  { value: "19", label: "AI Agents" },
  { value: "60+", label: "Database Tables" },
  { value: "3", label: "Platforms" },
  { value: "99.9%", label: "Uptime SLA" },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Now in public beta
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              AI-native accounting
              <br />
              <span className="text-primary">built for Africa</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              19 AI agents that handle your books — from journal entries to payroll to financial reports.
              Multi-currency, multi-entity, multi-platform. Web, mobile, and desktop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium transition-colors hover:bg-muted"
              >
                See Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to close your books
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete accounting platform powered by AI agents.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border p-6 transition-colors hover:bg-muted/50"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Available on every platform
            </h2>
            <p className="mt-3 text-muted-foreground">
              Web, mobile, and desktop — your data everywhere you work.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 text-center">
              <Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">Web App</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Next.js 15 with real-time dashboards, chat, and full reporting.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-center">
              <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">Mobile App</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                React Native with Expo. Invoices, journal entries, and approvals on the go.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-center">
              <Landmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">Desktop App</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tauri with Rust. Offline-first with local SQLite caching and sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to automate your accounting?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started for free. No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}