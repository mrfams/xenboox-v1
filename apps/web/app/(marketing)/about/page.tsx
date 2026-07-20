import Link from "next/link";
import {
  Bot,
  Globe,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
  Target,
  Eye,
  Heart,
  Quote,
} from "lucide-react";

const values = [
  {
    icon: Bot,
    title: "AI-First, Not AI-Added",
    description:
      "We didn't bolt AI onto legacy accounting software. Xenboox was built from the ground up with 19 specialized AI agents at its core, purpose-built for African financial workflows.",
    gradient: "from-blue-500 to-indigo-500",
    stat: "19",
    statLabel: "AI Agents",
  },
  {
    icon: Globe,
    title: "Built for Africa",
    description:
      "African businesses face unique challenges — multi-currency, mobile money, varying tax regimes across jurisdictions. We solve for these from day one, not as an afterthought.",
    gradient: "from-emerald-500 to-teal-500",
    stat: "5+",
    statLabel: "Jurisdictions",
  },
  {
    icon: Shield,
    title: "Security Without Compromise",
    description:
      "Row-level security, AES-256 encryption, full audit trails. Enterprise-grade security available to every business — not just the big ones.",
    gradient: "from-amber-500 to-orange-500",
    stat: "99.9%",
    statLabel: "Uptime SLA",
  },
  {
    icon: Users,
    title: "Radical Transparency",
    description:
      "Every AI decision is logged with confidence scores. If an agent isn't sure, it asks — it never guesses. You always know what happened and why.",
    gradient: "from-violet-500 to-purple-500",
    stat: "100%",
    statLabel: "Audit Coverage",
  },
];

const team = [
  {
    name: "Team Xenboox",
    role: "Building the future of African accounting",
    image: null,
  },
];

const milestones = [
  {
    year: "2025 Q1",
    event: "Founded",
    detail:
      "Started with a vision to modernize accounting for African businesses.",
  },
  {
    year: "2025 Q3",
    event: "Alpha Launch",
    detail:
      "First 19 AI agents operational. Double-entry ledger, AP/AR, payroll.",
  },
  {
    year: "2026 Q1",
    event: "Public Beta",
    detail:
      "Web, mobile, and desktop apps available. 60+ database tables, 20 modules.",
  },
  {
    year: "2026 H2",
    event: "Production Launch",
    detail:
      "Full launch with enterprise features, multi-entity support, and SLA guarantees.",
  },
  {
    year: "2027",
    event: "Pan-African Expansion",
    detail:
      "Expanding to 10+ African markets with localized tax and compliance.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-blue-400" />
              About Xenboox
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">We&apos;re building the</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                future of accounting
              </span>
              <br />
              <span className="text-white/80">for African businesses</span>
            </h1>
            <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-2xl">
              AI-native, multi-currency, multi-platform, and accessible to
              everyone. We&apos;re a small team tackling a massive problem — and
              we&apos;re just getting started.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── Mission & Stats ── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700">
                <Target className="h-3 w-3" />
                Our Mission
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Accounting software hasn&apos;t kept pace with how Africa does
                business
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Multi-currency transactions, mobile money, varying tax
                  regimes, and unreliable connectivity are the norm — not the
                  exception. Yet most accounting software was built for a
                  different world.
                </p>
                <p>
                  Xenboox changes that. We&apos;ve built an AI-native platform
                  where 19 specialized agents handle the heavy lifting — from
                  journal entries to payroll to financial reports. Your books
                  stay accurate, compliant, and up-to-date without the manual
                  grind.
                </p>
                <p>
                  Available on web, mobile, and desktop. Works online and
                  offline. Priced so that small businesses can access the same
                  tools as enterprises.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "19", label: "AI Agents" },
                { value: "20+", label: "Modules" },
                { value: "3", label: "Platforms" },
                { value: "60+", label: "DB Tables" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group relative rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="border-y bg-gradient-to-b from-slate-50 to-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Heart className="h-3 w-3 text-red-400" />
              What We Believe
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Our core values
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              These principles guide every decision we make — from product
              design to customer support.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="group relative rounded-2xl border bg-white p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-2xl bg-gradient-to-bl from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${value.gradient} shadow-sm`}
                  >
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-lg">{value.title}</h3>
                      <span className="shrink-0 text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {value.stat}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      {value.statLabel}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700">
              <Eye className="h-3 w-3" />
              Our Journey
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              From idea to platform
            </h2>
            <p className="mt-3 text-muted-foreground">
              Building the accounting platform African businesses deserve.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-indigo-500/50 to-transparent" />
            <div className="space-y-12">
              {milestones.map((milestone, i) => (
                <div key={i} className="relative pl-20">
                  <div className="absolute left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500" />
                  </div>
                  <div className="group rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1">
                        {milestone.year}
                      </span>
                      <span className="text-sm font-semibold">
                        {milestone.event}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {milestone.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote ── */}
      <section className="border-y bg-gradient-to-b from-slate-50 to-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="h-10 w-10 mx-auto text-blue-500/30" />
          <blockquote className="mt-6 text-xl md:text-2xl font-medium leading-relaxed text-balance">
            &ldquo;We believe that every business — regardless of size or
            location — deserves access to world-class accounting tools. AI makes
            that possible.&rdquo;
          </blockquote>
          <div className="mt-8">
            <div className="text-sm font-semibold">The Xenboox Team</div>
            <div className="text-sm text-muted-foreground">
              Building the future, one journal entry at a time
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Join us on this journey
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;re building the future of accounting for Africa. Come along.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
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
              href="/careers"
              className="inline-flex h-12 items-center rounded-xl border px-8 text-sm font-medium transition-all duration-300 hover:bg-muted"
            >
              View Open Positions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
