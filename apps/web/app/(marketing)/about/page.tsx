import Link from "next/link";
import { Bot, Globe, Shield, Users, ArrowRight, Quote } from "lucide-react";
import { MarketingHero } from "@/components/marketing/hero";

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
      <MarketingHero
        title={
          <>
            <span className="text-white">We&apos;re building the</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              future of accounting
            </span>
            <br />
            <span className="text-white/80">for African businesses</span>
          </>
        }
        description="AI-native, multi-currency, multi-platform, and accessible to everyone. We're a small team tackling a massive problem — and we're just getting started."
        leftAlign
      />

      {/* ── Mission + Values combined ── */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Mission + Stats */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-center mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Accounting software hasn&apos;t kept pace with how Africa does
                business
              </h2>
              <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed text-sm">
                <p>
                  Multi-currency transactions, mobile money, varying tax
                  regimes, and unreliable connectivity are the norm — not the
                  exception. Yet most accounting software was built for a
                  different world.
                </p>
                <p>
                  Xenboox changes that. We&apos;ve built an AI-native platform
                  where 19 specialized agents handle the heavy lifting — from
                  journal entries to payroll to financial reports.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "19", label: "AI Agents" },
                { value: "20+", label: "Modules" },
                { value: "3", label: "Platforms" },
                { value: "60+", label: "DB Tables" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group relative rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Our core values
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="group relative rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${value.gradient} shadow-sm`}
                    >
                      <value.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base">
                          {value.title}
                        </h3>
                        <span className="shrink-0 text-xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {value.stat}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline + Quote combined ── */}
      <section className="border-y bg-gradient-to-b from-slate-50 to-white py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:gap-14 items-start">
            {/* Timeline */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                From idea to platform
              </h2>
              <div className="relative">
                <div className="absolute left-5 top-1 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-indigo-500/40 to-transparent" />
                <div className="space-y-6">
                  {milestones.map((milestone, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-3.5 top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                        <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                            {milestone.year}
                          </span>
                          <span className="text-sm font-semibold">
                            {milestone.event}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {milestone.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="text-center md:text-left md:pt-12">
              <Quote className="h-8 w-8 text-blue-500/20 mx-auto md:mx-0" />
              <blockquote className="mt-4 text-lg md:text-xl font-medium leading-relaxed text-balance">
                &ldquo;We believe that every business — regardless of size or
                location — deserves access to world-class accounting tools.
              </blockquote>
              <div className="mt-6">
                <div className="text-sm font-semibold">The Xenboox Team</div>
                <div className="text-xs text-muted-foreground">
                  Building the future, one journal entry at a time
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Join us on this journey
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re building the future of accounting for Africa. Come along.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="group relative inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
              <span className="relative flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/careers"
              className="inline-flex h-11 items-center rounded-xl border px-6 text-sm font-medium transition-all duration-300 hover:bg-muted"
            >
              View Open Positions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
