"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
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
  ArrowRight,
  Check,
} from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
  CtaBand,
} from "../components/marketing-primitives";

const features = [
  {
    icon: Bot,
    title: "AI Agent Workforce",
    description:
      "Intelligent agents handle the repetitive work — journal entry validation, reconciliation, and document classification — so your team focuses on strategy, not data entry.",
    items: [
      "Natural-language chat assistant for everyday tasks",
      "Confidence-based escalation to a human reviewer",
      "Every decision logged and fully traceable",
      "Learns your chart of accounts and posting rules",
    ],
    accent: "from-indigo-500 to-fuchsia-500",
  },
  {
    icon: BookOpen,
    title: "Complete General Ledger",
    description:
      "Full double-entry accounting with automated journal entries, trial balance, and period-end closing workflows.",
    items: [
      "Chart of Accounts with flexible category types",
      "Automated depreciation scheduling",
      "Multi-currency support with live exchange rates",
      "Fiscal period management with close workflows",
    ],
    accent: "from-sky-500 to-indigo-500",
  },
  {
    icon: Receipt,
    title: "Accounts Payable & Receivable",
    description:
      "Manage the full lifecycle of payables and receivables — from purchase orders to payments.",
    items: [
      "Supplier and customer management",
      "Purchase order workflow",
      "Invoice processing with line items",
      "Payment recording and aging reports",
    ],
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: Landmark,
    title: "Treasury Management",
    description:
      "Track bank accounts, reconcile transactions, and manage cash flow across multiple accounts.",
    items: [
      "Multi-bank account tracking",
      "Automated transaction matching",
      "Bank reconciliation workflow",
      "Cash position monitoring",
    ],
    accent: "from-amber-500 to-orange-500",
  },
  {
    icon: Wallet,
    title: "Payroll Processing",
    description:
      "A complete payroll engine with local tax bands, social-security contributions, and configurable deductions.",
    items: [
      "PAYE tax calculation by jurisdiction",
      "Employee and employer contributions",
      "Configurable deduction types",
      "Payslip generation and storage",
    ],
    accent: "from-rose-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    description:
      "Real-time financial reports generated from your ledger data. Trial balance, P&L, balance sheet, and more.",
    items: [
      "Profit & Loss statement",
      "Balance Sheet",
      "Trial Balance",
      "Cash flow analysis",
    ],
    accent: "from-violet-500 to-purple-500",
  },
  {
    icon: FileText,
    title: "Document Management",
    description:
      "Upload, store, and link documents to transactions with reliable cloud storage.",
    items: [
      "Secure presigned upload URLs",
      "Document-to-transaction linking",
      "OCR text extraction pipeline",
      "Automated document classification",
    ],
    accent: "from-cyan-500 to-blue-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Row-level security, encryption at rest, rate limiting, and comprehensive audit logging.",
    items: [
      "Database Row-Level Security",
      "AES-256 encryption for sensitive fields",
      "Rate limiting with Redis",
      "Full audit trail on every mutation",
    ],
    accent: "from-red-500 to-rose-500",
  },
  {
    icon: RefreshCw,
    title: "Offline-First Desktop",
    description:
      "Desktop app with local caching. Work offline and sync when reconnected.",
    items: [
      "Local database cache",
      "Automatic sync on reconnection",
      "Cross-platform (Windows, macOS)",
      "Lightweight native backend",
    ],
    accent: "from-slate-400 to-slate-600",
  },
  {
    icon: Users,
    title: "Multi-Entity Support",
    description:
      "Manage multiple businesses or entities from a single account with role-based access for teams.",
    items: [
      "Entity-level data isolation",
      "Role-based access control",
      "Entity switching from any screen",
      "Per-entity audit trails",
    ],
    accent: "from-teal-500 to-emerald-500",
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    description:
      "Handle transactions in multiple currencies with automatic exchange rate synchronization.",
    items: [
      "Exchange rate synchronization",
      "Currency conversion in reports",
      "GMD, USD, EUR, GBP support",
      "Per-account currency settings",
    ],
    accent: "from-blue-500 to-indigo-500",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description:
      "Streaming chat, background job processing, and live dashboard updates.",
    items: [
      "Token streaming for AI chat",
      "Background job processing",
      "Real-time dashboard metrics",
      "Live activity monitoring",
    ],
    accent: "from-yellow-500 to-amber-500",
  },
];

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const flipped = index % 2 === 1;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="grid items-center gap-8 md:grid-cols-2"
    >
      <div className={flipped ? "md:order-2" : ""}>
        <div
          className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} shadow-lg`}
        >
          <feature.icon className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">{feature.title}</h2>
        <p className="mt-3 text-white/55">{feature.description}</p>
      </div>
      <div className={flipped ? "md:order-1" : ""}>
        <GlassCard className="p-7">
          <ul className="space-y-3">
            {feature.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-white/70"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </motion.div>
  );
}

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Platform"
        title="Everything you need to"
        highlight="run modern finance"
        subtitle="From journal entries to consolidated reporting — a complete accounting platform with AI built in from the ground up."
      />

      <section className="py-16">
        <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
          {features.map((feature, i) => (
            <FeatureRow key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </section>

      <CtaBand
        title="Ready to see it in action?"
        subtitle="Create a free account and explore the full platform in minutes."
        primaryHref="/register"
        primaryLabel="Start Free"
        secondaryHref="/contact"
        secondaryLabel="Talk to Sales"
      />
    </MarketingShell>
  );
}
