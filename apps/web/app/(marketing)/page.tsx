"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
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
  Layers,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function SectionWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
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
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
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

const logos = [
  "Standard Bank",
  "MTN",
  "Flutterwave",
  "Yoco",
  "PiggyVest",
  "Chipper",
  "Standard Bank",
  "MTN",
  "Flutterwave",
  "Yoco",
  "PiggyVest",
  "Chipper",
];

export default function HomePage() {
  return (
    <>
      {/* ════════════════════════════════════════ */}
      {/* HERO                                      */}
      {/* ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
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

        <div className="relative mx-auto max-w-6xl px-4 py-32 sm:px-6 w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/70"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Trusted by finance teams across Africa
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]"
            >
              <span className="text-white">AI-native accounting</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                for African enterprises
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-6 max-w-xl text-lg text-white/60 leading-relaxed"
            >
              Close your books faster, reduce errors, and get real-time
              financial intelligence — powered by AI agents that handle the work
              so your team can focus on growth.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                Talk to Sales
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-4 text-sm text-white/40"
            >
              No credit card required · Free tier available · Enterprise plans
              include dedicated support
            </motion.p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ════════════════════════════════════════ */}
      {/* TRUST BAR                                 */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-white/5 bg-slate-900 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection>
            <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40">
              Trusted by finance teams at
            </p>
          </AnimatedSection>
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-marquee whitespace-nowrap">
              {logos.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="inline-flex items-center text-lg font-semibold text-white/30 transition-colors duration-300 hover:text-white/60"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STATS                                     */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionWrapper>
            <div className="grid gap-6 md:grid-cols-4">
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
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-8 text-center transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
                >
                  <div className="text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    <CountUp
                      end={stat.end}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  </div>
                  <div className="mt-2 text-sm text-white/40">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </SectionWrapper>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* THREE PILLARS                             */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/5 via-violet-600/5 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionWrapper>
            <AnimatedSection className="mb-16 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
                <Sparkles className="h-3 w-3 text-violet-400" />
                Purpose-built for modern finance teams
              </div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="text-white">Built for how</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Africa does business
                </span>
              </h2>
            </AnimatedSection>
            <div className="grid gap-6 md:grid-cols-3">
              {pillars.map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  variants={fadeInUp}
                  className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-sm p-8 transition-all duration-500 hover:-translate-y-1"
                >
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
                </motion.div>
              ))}
            </div>
          </SectionWrapper>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* CAPABILITIES                              */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/5 bg-slate-900 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionWrapper>
            <AnimatedSection className="mb-14 text-center">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="text-white">Everything you need to</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  run your finance function
                </span>
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-white/40">
                From journal entries to consolidated reporting — a complete
                accounting platform with no gaps.
              </p>
            </AnimatedSection>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  variants={fadeInUp}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 text-blue-400 group-hover:from-blue-600/30 group-hover:to-violet-600/30 transition-all duration-300">
                    <cap.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white/90">{cap.title}</h3>
                  <p className="mt-2 text-sm text-white/40 leading-relaxed">
                    {cap.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </SectionWrapper>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* SECURITY & COMPLIANCE                     */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-24">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-tr from-violet-600/5 to-transparent rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionWrapper>
            <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
              <motion.div variants={fadeInUp}>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
                  <Shield className="h-3 w-3" />
                  Enterprise Security
                </div>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  <span className="text-white">Built for the most</span>
                  <br />
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
              </motion.div>
              <motion.div
                variants={scaleIn}
                className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-8"
              >
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
              </motion.div>
            </div>
          </SectionWrapper>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* CTA                                       */}
      {/* ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 py-24">
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
          <AnimatedSection>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Zap className="h-3 w-3 text-blue-400" />
              Get started in minutes
            </div>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="text-white">Ready to transform</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                your accounting?
              </span>
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Join businesses across Africa that trust Xenboox to automate their
              financial operations.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                <span className="relative flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-8 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                Book a Demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/30">
              Free tier available. No credit card required. Enterprise plans
              include dedicated support.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
