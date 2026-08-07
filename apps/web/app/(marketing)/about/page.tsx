"use client";

import Link from "next/link";
import {
  ArrowRight,
  Target,
  Eye,
  Heart,
  Users,
  Globe,
  Shield,
  Zap,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Star,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We exist to give every business access to world-class financial tools. Not just the enterprises that can afford consultants — everyone.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description:
      "Our AI explains its reasoning. Our pricing is simple. Our roadmap is public. We believe trust is earned through openness.",
  },
  {
    icon: Heart,
    title: "Obsessive Quality",
    description:
      "Accounting demands precision. We ship nothing that isn't thoroughly tested, reviewed, and validated. Accuracy isn't a feature — it's a requirement.",
  },
  {
    icon: Users,
    title: "Customer-Obsessed",
    description:
      "We talk to our users weekly. We ship what they need, not what we think they want. Their success is our success.",
  },
  {
    icon: Zap,
    title: "Move with Purpose",
    description:
      "We're fast but not reckless. Every decision is deliberate. We ship iteratively, learn constantly, and never stop improving.",
  },
  {
    icon: Globe,
    title: "Global by Design",
    description:
      "Built for businesses operating across borders from day one. Multi-currency, multi-jurisdiction, multi-language — not bolted on later.",
  },
];

const stats = [
  { value: "20+", label: "Accounting Modules", icon: Building2 },
  { value: "3", label: "Platforms", icon: Globe },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
  { value: "50+", label: "Currencies", icon: TrendingUp },
];

const principles = [
  {
    title: "Accuracy over speed",
    description:
      "We'd rather be right than fast. Every calculation is double-checked. Every report is auditable. Your books are too important for shortcuts.",
  },
  {
    title: "Simplicity over features",
    description:
      "Powerful doesn't mean complicated. We relentlessly simplify complex accounting workflows so you can focus on what matters.",
  },
  {
    title: "Security over convenience",
    description:
      "We never compromise on data protection. End-to-end encryption, role-based access, complete audit trails — non-negotiable.",
  },
  {
    title: "Transparency over marketing",
    description:
      "No buzzwords. No black boxes. We explain exactly how our AI works, what it costs, and how it helps your business.",
  },
];

const team = [
  {
    name: "Engineering",
    description: "Building the platform that powers modern accounting",
    icon: "⚡",
  },
  {
    name: "Product",
    description: "Designing experiences that make complex simple",
    icon: "🎯",
  },
  {
    name: "Customer Success",
    description: "Ensuring every business succeeds with Xenboox",
    icon: "🤝",
  },
  {
    name: "Operations",
    description: "Scaling our infrastructure and processes",
    icon: "📊",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-white/80">About Xenboox</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              The future of finance,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                built today
              </span>
            </h1>

            <p className="mt-8 text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              We&apos;re a team of engineers, accountants, and dreamers building
              the accounting platform that every business deserves — but no one
              has built until now.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <FadeInUp>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
                  <Target className="h-3.5 w-3.5" />
                  Our Mission
                </span>
                <h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                  Make world-class accounting accessible to every business
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                  Accounting software hasn&apos;t kept pace with how modern
                  businesses operate. Multi-currency transactions, mobile money,
                  varying tax regimes, and remote teams are the norm — not the
                  exception.
                </p>
                <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                  We&apos;re changing that. Xenboox is an AI-native platform
                  where intelligent automation handles the heavy lifting, so you
                  can focus on growing your business.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <stat.icon className="h-8 w-8 text-blue-600 mb-3" />
                    <div className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700">
                <Heart className="h-3.5 w-3.5" />
                Our Values
              </span>
              <h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                What we believe in
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                These principles guide every decision we make, from product
                design to customer support.
              </p>
            </FadeInUp>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <FadeInUp key={value.title} delay={index * 0.1}>
                <div className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <FadeInUp>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                  <Star className="h-3.5 w-3.5" />
                  Our Principles
                </span>
                <h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                  How we build
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                  These aren&apos;t just words on a wall. They&apos;re the
                  standards we hold ourselves to every day.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="space-y-6">
                {principles.map((principle, index) => (
                  <div
                    key={principle.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {principle.title}
                        </h3>
                        <p className="mt-2 text-slate-600 leading-relaxed">
                          {principle.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
                <Users className="h-3.5 w-3.5" />
                Our Team
              </span>
              <h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                The people behind Xenboox
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                A small, focused team with big ambitions. We&apos;re building
                something that matters.
              </p>
            </FadeInUp>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((department, index) => (
              <FadeInUp key={department.name} delay={index * 0.1}>
                <div className="group rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="text-4xl mb-4">{department.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {department.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {department.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Why Xenboox Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700">
                <Zap className="h-3.5 w-3.5" />
                Why Xenboox
              </span>
              <h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                Why we&apos;re different
              </h2>
            </FadeInUp>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <FadeInUp>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  The old way
                </h3>
                <ul className="space-y-4">
                  {[
                    "Manual data entry and reconciliation",
                    "Spreadsheet-based tracking",
                    "Month-end chaos and errors",
                    "Expensive consultants and software",
                    "One-size-fits-all Western solutions",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                      </span>
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  The Xenboox way
                </h3>
                <ul className="space-y-4">
                  {[
                    "AI-powered automation that learns your business",
                    "Real-time financial dashboards",
                    "Automated month-end close",
                    "Transparent, affordable pricing",
                    "Built for global businesses from day one",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
                      <span className="text-slate-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Investors/Backers */}
      <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <FadeInUp>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
              Backed by leading investors who believe in our mission
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
              {["Y Combinator", "Sequoia", "a16z", "Tiger Global"].map(
                (investor) => (
                  <div
                    key={investor}
                    className="text-2xl font-bold text-slate-400"
                  >
                    {investor}
                  </div>
                ),
              )}
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[128px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Join us on this journey
            </h2>
            <p className="mt-6 text-xl text-white/60 max-w-2xl mx-auto">
              We&apos;re building the future of accounting. Whether you&apos;re
              a customer, partner, or future team member — we&apos;d love to
              connect.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex h-14 items-center rounded-2xl bg-white px-8 text-base font-semibold text-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/careers"
                className="inline-flex h-14 items-center rounded-2xl border border-white/20 px-8 text-base font-medium text-white transition-all duration-300 hover:bg-white/10"
              >
                View Careers
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-14 items-center rounded-2xl border border-white/20 px-8 text-base font-medium text-white transition-all duration-300 hover:bg-white/10"
              >
                Contact Us
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/40">
              No credit card required · Free tier available · Setup in minutes
            </p>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
