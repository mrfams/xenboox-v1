"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Building2,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  HeadphonesIcon,
  CreditCard,
  FileCheck,
  Sparkles,
  Zap,
  Star,
  Quote,
  Layers,
  RefreshCw,
  BarChart3,
  Smartphone,
} from "lucide-react";

function useInViewOnce(ref: React.RefObject<Element | null>, margin = "-80px") {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);

  return isInView;
}

function FadeInUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInViewOnce(ref);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease-out, transform 0.6s ease-out`,
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function StaggerChildren({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInViewOnce(ref);
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isInView ? 1 : 0, transition: "opacity 0.3s ease-out" }}
    >
      {isInView ? children : null}
    </div>
  );
}

function FloatingShape({
  className = "",
  size = "h-64 w-64",
  delay = 0,
}: {
  className?: string;
  size?: string;
  delay?: number;
}) {
  return (
    <div
      className={`absolute rounded-full opacity-20 animate-float ${size} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function CountUp({
  end,
  suffix = "",
  decimals = 0,
}: {
  end: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInViewOnce(ref);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!isInView || hasAnimated) return;
    setHasAnimated(true);
    let start = 0;
    const duration = 2000;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, end, hasAnimated]);

  return (
    <span ref={ref}>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const pillars = [
  {
    icon: Bot,
    title: "AI-Powered Accounting",
    description:
      "Intelligent agents automate journal entries, reconciliations, and compliance checks — freeing your team to focus on strategy, not data entry.",
    gradient: "from-blue-600 to-violet-600",
    glow: "shadow-blue-500/25",
  },
  {
    icon: Building2,
    title: "Multi-Entity, Multi-Currency",
    description:
      "Manage subsidiaries, branches, and currencies from a single platform. Consolidate financials across entities in real time with full intercompany accounting.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/25",
  },
  {
    icon: Shield,
    title: "Enterprise Security & Compliance",
    description:
      "AES-256 encryption, row-level data isolation, SOC 2-aligned controls, and comprehensive audit trails protecting your financial data.",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/25",
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

const testimonials = [
  {
    quote:
      "Xenboox reduced our month-end close from 10 days to 3. The AI agents handle reconciliations overnight — we just review the exceptions in the morning.",
    author: "Finance Director",
    role: "Regional Retail Chain, West Africa",
    rating: 5,
  },
  {
    quote:
      "We run three entities across two currencies. Xenboox's consolidation view shows me the group position in real time. That used to take my team a full week.",
    author: "Group CFO",
    role: "Holding Company, Pan-Africa",
    rating: 5,
  },
  {
    quote:
      "The payroll agent calculates PAYE and SSNIT correctly for Gambia and Nigeria. No more spreadsheet errors, no more late filing penalties.",
    author: "Payroll Manager",
    role: "NGO, Multiple Jurisdictions",
    rating: 5,
  },
];

const logos = [
  { name: "Standard Bank" },
  { name: "MTN" },
  { name: "Flutterwave" },
  { name: "Yoco" },
  { name: "PiggyVest" },
  { name: "Chipper" },
  { name: "Standard Bank" },
  { name: "MTN" },
  { name: "Flutterwave" },
  { name: "Yoco" },
  { name: "PiggyVest" },
  { name: "Chipper" },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect your data",
    description:
      "Import your chart of accounts, connect bank feeds, and upload historical statements. Xenboox automatically maps your existing structure.",
    icon: Layers,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    step: "02",
    title: "AI takes over the routine",
    description:
      "19 specialized agents begin working: reconciling transactions, processing invoices, running payroll, and flagging exceptions for review.",
    icon: Bot,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    step: "03",
    title: "You supervise, not data-enter",
    description:
      "Review exceptions, approve critical transactions, and ask your CFO Agent anything. Your books stay current without the daily grind.",
    icon: RefreshCw,
    gradient: "from-violet-500 to-purple-500",
  },
];

function AnimatedText({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState(words[0]);
  const [phase, setPhase] = useState<"typing" | "pause" | "erasing">("pause");

  useEffect(() => {
    if (phase === "pause") {
      const t = setTimeout(() => setPhase("erasing"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "erasing") {
      if (display === "") {
        const t = setTimeout(() => {
          setIndex((i) => (i + 1) % words.length);
          setPhase("typing");
        }, 300);
        return () => clearTimeout(t);
      }
      const t = setTimeout(
        () => setDisplay(display.slice(0, -1)),
        40 + Math.random() * 30,
      );
      return () => clearTimeout(t);
    }
    if (phase === "typing") {
      const target = words[index];
      if (display === target) {
        const t = setTimeout(() => setPhase("pause"), 800);
        return () => clearTimeout(t);
      }
      const t = setTimeout(
        () => setDisplay(target.slice(0, display.length + 1)),
        50 + Math.random() * 40,
      );
      return () => clearTimeout(t);
    }
  }, [phase, display, index, words]);

  return (
    <span>
      for {display}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function HomePage() {
  return (
    <>
      {/* HERO — reduced vertical space from min-h-screen to py-24 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-slate-950" />

        <FloatingShape
          className="bg-gradient-to-br from-blue-500/20 to-transparent -top-32 -left-32"
          size="h-96 w-96"
          delay={0}
        />
        <FloatingShape
          className="bg-gradient-to-br from-violet-500/20 to-transparent top-1/3 -right-20"
          size="h-80 w-80"
          delay={2}
        />
        <FloatingShape
          className="bg-gradient-to-br from-emerald-500/10 to-transparent bottom-20 left-1/3"
          size="h-48 w-48"
          delay={4}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 w-full">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              style={{ animation: "fade-in-up 0.6s ease-out 0.4s both" }}
            >
              <span className="text-white">AI-native accounting</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                <AnimatedText
                  words={[
                    "SMEs",
                    "businesses",
                    "startups",
                    "enterprises",
                    "teams",
                  ]}
                />
              </span>
            </h1>

            <p
              className="mt-2 max-w-xl text-base sm:text-lg text-white/60 leading-relaxed"
              style={{ animation: "fade-in-up 0.6s ease-out 0.6s both" }}
            >
              Close your books faster, reduce errors, and get real-time
              financial intelligence — powered by AI agents that handle the work
              so your team can focus on growth.
            </p>

            <div
              className="mt-4 flex flex-wrap gap-4"
              style={{ animation: "fade-in-up 0.6s ease-out 0.8s both" }}
            >
              <Link
                href="/register"
                className="group relative inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                Talk to Sales
              </Link>
            </div>

            <p
              className="mt-2 text-sm text-white/40"
              style={{ animation: "fade-in 0.6s ease-out 1s both" }}
            >
              No credit card required · Free tier available · Enterprise plans
              include dedicated support
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* TRUST BAR */}
      <section className="relative overflow-hidden border-b border-white/5 bg-slate-900 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40">
              Trusted by finance teams at
            </p>
          </FadeInUp>
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-marquee whitespace-nowrap">
              {logos.map((logo, i) => (
                <span
                  key={`${logo.name}-${i}`}
                  className="inline-flex items-center text-lg font-semibold text-white/30 transition-colors duration-300 hover:text-white/60"
                >
                  {logo.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative overflow-hidden bg-slate-950 py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-gradient-to-br from-blue-600/5 via-violet-600/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
                <Zap className="h-3 w-3 text-blue-400" />
                How it works
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">Get started in</span>{" "}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  three simple steps
                </span>
              </h2>
              <p className="mt-3 text-white/40 max-w-lg mx-auto">
                From zero to automated accounting in under an hour. No training
                required.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Animated connector line */}
            <div className="hidden md:block absolute top-20 left-[16.66%] right-[16.66%]">
              <div className="h-px bg-gradient-to-r from-blue-500/10 via-violet-500/60 to-pink-500/10" />
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse" />
            </div>

            {howItWorks.map((item, i) => (
              <FadeInUp key={item.step} delay={i * 0.15}>
                <div className="group relative">
                  {/* Glow behind card on hover */}
                  <div
                    className={`absolute -inset-4 rounded-3xl bg-gradient-to-br ${item.gradient} opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-15`}
                  />

                  <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-sm p-8 text-center transition-all duration-500 hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/5">
                    {/* Step number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-white/10 text-[11px] font-bold text-white/60 backdrop-blur-sm shadow-lg">
                        {item.step}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="relative mx-auto mb-5 mt-2">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.06] to-transparent blur-sm" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-white/[0.06] backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-white/[0.15] group-hover:shadow-lg mx-auto">
                        <div
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                        />
                        <div
                          className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg transition-transform duration-500 group-hover:scale-110`}
                        >
                          <item.icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white/90 transition-colors duration-300 group-hover:text-white">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xs mx-auto transition-colors duration-300 group-hover:text-white/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>

          {/* Bottom CTA */}
          <FadeInUp delay={0.4}>
            <div className="mt-12 text-center">
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* STATS */}
      <section className="relative overflow-hidden bg-slate-950 py-12">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <StaggerChildren>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  end: 99.9,
                  suffix: "%",
                  label: "Platform uptime SLA",
                  decimals: 1,
                },
                {
                  end: 99.97,
                  suffix: "%",
                  label: "Transaction accuracy",
                  decimals: 2,
                },
                {
                  end: 70,
                  suffix: "%",
                  label: "Faster month-end close",
                  decimals: 0,
                },
                {
                  end: 24,
                  suffix: "/7",
                  label: "Monitoring and support",
                  decimals: 0,
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8 text-center transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
                  style={{
                    animation: `fade-in-up 0.5s ease-out ${i * 0.12}s both`,
                  }}
                >
                  <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    <CountUp
                      end={stat.end}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  </div>
                  <div className="mt-2 text-sm text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </StaggerChildren>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="relative overflow-hidden bg-slate-950 py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/5 via-violet-600/5 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">Built for how</span>{" "}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Africa does business
                </span>
              </h2>
            </div>
          </FadeInUp>
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar, i) => (
              <FadeInUp key={pillar.title} delay={i * 0.12}>
                <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-sm p-8 transition-all duration-500 hover:-translate-y-1">
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${pillar.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-5`}
                  />
                  <div
                    className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${pillar.gradient} shadow-lg ${pillar.glow}`}
                  >
                    <pillar.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="relative text-lg font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="relative mt-3 text-sm text-white/50 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="relative overflow-hidden border-t border-white/5 bg-slate-900 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">Everything you need to</span>{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  run your finance function
                </span>
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-white/40">
                From journal entries to consolidated reporting — a complete
                accounting platform with no gaps.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap, i) => (
              <FadeInUp key={cap.title} delay={i * 0.06}>
                <div className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 text-blue-400 group-hover:from-blue-600/30 group-hover:to-violet-600/30 transition-all duration-300">
                    <cap.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white/90">{cap.title}</h3>
                  <p className="mt-2 text-sm text-white/40 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — NEW */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 py-16">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">What our users</span>{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  are saying
                </span>
              </h2>
            </div>
          </FadeInUp>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <FadeInUp key={t.author} delay={i * 0.12}>
                <div className="group relative rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/10">
                  <Quote className="h-8 w-8 text-white/10 mb-4" />
                  <p className="text-sm text-white/70 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <p className="text-sm font-medium text-white/90">
                      {t.author}
                    </p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section className="relative overflow-hidden bg-slate-950 py-16">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-tr from-violet-600/5 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <FadeInUp>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">Built for the most</span>{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  demanding requirements
                </span>
              </h2>
              <p className="mt-4 text-white/50 leading-relaxed">
                Your financial data is protected by industry-standard
                encryption, strict access controls, and comprehensive audit
                logging. Every action is recorded, every transaction is
                traceable, and every entity is fully isolated.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "AES-256 encryption for data at rest. TLS 1.3 for data in transit.",
                  "Row-level security ensures complete entity data isolation.",
                  "SOC 2-aligned controls with continuous monitoring and incident response.",
                  "Comprehensive audit trail — every action logged with actor, timestamp, and context.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-white/50">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-8">
                <h3 className="font-semibold text-lg text-white/90">
                  Compliance & Certifications
                </h3>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "GDPR", desc: "Data protection compliant" },
                    { label: "IFRS", desc: "Reporting standards" },
                    { label: "SOC 2", desc: "Control framework aligned" },
                    { label: "TLS 1.3", desc: "Encryption in transit" },
                  ].map((cert) => (
                    <div
                      key={cert.label}
                      className="group rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
                    >
                      <div className="text-lg font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                        {cert.label}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        {cert.desc}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs text-white/30 text-center">
                  Third-party security audits conducted quarterly.
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ALL-IN-ONE — NEW */}
      <section className="relative overflow-hidden border-t border-white/5 bg-slate-900 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <FadeInUp>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="text-white">All your financial data,</span>{" "}
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  one platform
                </span>
              </h2>
              <p className="mt-4 text-white/50 leading-relaxed">
                No more switching between QuickBooks for accounting, Excel for
                reports, and email for approvals. Everything works together from
                day one.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  {
                    icon: Smartphone,
                    text: "Web, mobile, and desktop apps with seamless sync",
                  },
                  {
                    icon: Bot,
                    text: "19 AI agents working across all modules simultaneously",
                  },
                  {
                    icon: RefreshCw,
                    text: "Real-time updates — no more batch processing or overnight runs",
                  },
                  {
                    icon: BarChart3,
                    text: "Custom reports and dashboards built in seconds via chat",
                  },
                ].map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-white/60">{item.text}</span>
                  </li>
                ))}
              </ul>
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <div className="relative">
                {/* Platform cards visual */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "General Ledger", active: true },
                    { name: "AP & AR", active: true },
                    { name: "Payroll", active: true },
                    { name: "Treasury", active: true },
                    { name: "Reports", active: true },
                    { name: "Compliance", active: true },
                    { name: "Budgeting", active: true },
                    { name: "Inventory", active: false },
                  ].map((mod) => (
                    <div
                      key={mod.name}
                      className={`rounded-xl border p-3 sm:p-4 text-center transition-all ${
                        mod.active
                          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
                          : "border-white/5 bg-white/[0.02] opacity-40"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${mod.active ? "text-white/80" : "text-white/30"}`}
                      >
                        {mod.name}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {mod.active ? "Available now" : "Coming soon"}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-white/30">
                  All modules share data and work through the same AI agents
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        <FloatingShape
          className="bg-gradient-to-br from-blue-500/10 to-transparent top-10 left-10"
          size="h-64 w-64"
          delay={1}
        />
        <FloatingShape
          className="bg-gradient-to-br from-violet-500/10 to-transparent bottom-10 right-10"
          size="h-48 w-48"
          delay={3}
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="text-white">Ready to transform</span>{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                your accounting?
              </span>
            </h2>
            <p className="mt-4 text-white/50 max-w-lg mx-auto">
              Join businesses across Africa that trust Xenboox to automate their
              financial operations.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group relative inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-8 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                Book a Demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/30">
              Free tier available. No credit card required. Enterprise plans
              include dedicated support.
            </p>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
