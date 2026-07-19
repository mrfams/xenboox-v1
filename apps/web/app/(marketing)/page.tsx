import Link from "next/link";
import {
  Bot,
  Building2,
  BarChart3,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  HeadphonesIcon,
  CreditCard,
  FileCheck,
} from "lucide-react";

const pillars = [
  {
    icon: Bot,
    title: "AI-Powered Accounting",
    description:
      "Intelligent agents automate journal entries, reconciliations, payroll, and compliance checks — so your team focuses on strategy, not data entry.",
  },
  {
    icon: Building2,
    title: "Multi-Entity, Multi-Currency",
    description:
      "Manage subsidiaries, branches, and currencies from a single platform. Consolidate financials across entities in real time with full intercompany accounting.",
  },
  {
    icon: Shield,
    title: "Enterprise Security & Compliance",
    description:
      "AES-256 encryption, row-level data isolation, SOC 2-aligned controls, and comprehensive audit trails. Built for regulated industries and growing businesses.",
  },
];

const capabilities = [
  {
    icon: FileCheck,
    title: "Double-Entry Ledger",
    description:
      "Full IFRS-ready general ledger with chart of accounts, journals, and trial balance.",
  },
  {
    icon: CreditCard,
    title: "Payables & Receivables",
    description:
      "Invoice processing, payment scheduling, aging reports, and supplier management.",
  },
  {
    icon: TrendingUp,
    title: "Financial Reporting",
    description:
      "P&L, balance sheet, cash flow, and custom reports generated in real time.",
  },
  {
    icon: Globe,
    title: "Multi-Platform Access",
    description:
      "Web, mobile, and desktop — your financial data available wherever you work.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Granular permissions, approval workflows, and entity-level access control.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    description:
      "Onboarding specialists, account managers, and support engineers assigned to your team.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Trusted by businesses across Africa
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              AI-native accounting
              <br />
              <span className="text-primary">for African enterprises</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Close your books faster, reduce errors, and get real-time
              financial intelligence — powered by AI agents that handle the work
              so your team can focus on growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-md border px-6 text-sm font-medium transition-colors hover:bg-muted"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. Free tier available.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by finance teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
            <span className="text-lg font-semibold text-foreground/60">
              Standard Bank
            </span>
            <span className="text-lg font-semibold text-foreground/60">
              MTN
            </span>
            <span className="text-lg font-semibold text-foreground/60">
              Flutterwave
            </span>
            <span className="text-lg font-semibold text-foreground/60">
              Yoco
            </span>
            <span className="text-lg font-semibold text-foreground/60">
              PiggyVest
            </span>
            <span className="text-lg font-semibold text-foreground/60">
              Chipper
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold tracking-tight">99.9%</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Platform uptime SLA
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tracking-tight">99.97%</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Transaction accuracy rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tracking-tight">70%</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Faster month-end close
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tracking-tight">24/7</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Monitoring and support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Purpose-built for modern finance teams
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
              Xenboox combines AI automation with enterprise-grade
              infrastructure to transform how African businesses manage their
              finances.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative rounded-xl border bg-card p-8 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run your finance function
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
              From journal entries to consolidated reporting — a complete
              accounting platform with no gaps.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <cap.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{cap.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Shield className="h-3 w-3" />
                Enterprise Security
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for the most
                <br />
                <span className="text-primary">demanding requirements</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Your financial data is protected by industry-standard
                encryption, strict access controls, and comprehensive audit
                logging. Every action is recorded, every transaction is
                traceable, and every entity is isolated.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    AES-256 encryption for data at rest. TLS 1.3 for data in
                    transit.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    Row-level security ensures complete entity data isolation.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    SOC 2-aligned controls with continuous monitoring and
                    incident response.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    Comprehensive audit trail — every action logged with actor,
                    timestamp, and context.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-8">
              <h3 className="font-semibold text-lg">
                Compliance & Certifications
              </h3>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm font-semibold">GDPR</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Data protection compliant
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm font-semibold">IFRS</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reporting standards
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm font-semibold">SOC 2</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Control framework aligned
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-sm font-semibold">TLS 1.3</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Encryption in transit
                  </div>
                </div>
              </div>
              <p className="mt-6 text-xs text-muted-foreground text-center">
                Third-party security audits conducted quarterly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your accounting?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join businesses across Africa that trust Xenboox to automate their
            financial operations.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-md border px-8 text-sm font-medium transition-colors hover:bg-muted"
            >
              Book a Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free tier available. No credit card required. Enterprise plans
            include dedicated support.
          </p>
        </div>
      </section>
    </>
  );
}
