"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe,
  BarChart3,
  Clock,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Bot,
  Star,
} from "lucide-react";
import { FadeInUp } from "@/components/marketing/reveal";

// Animated counter component
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Feature showcase sections
const featureSections = [
  {
    id: "automation",
    eyebrow: "AI Automation",
    title: "Your accounting runs itself",
    description:
      "Stop doing repetitive data entry. Our AI learns your business patterns and handles the routine work — while you focus on strategy.",
    features: [
      "Automated transaction categorization",
      "Smart bank reconciliation",
      "Invoice processing with OCR",
      "Anomaly detection and alerts",
    ],
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    visual: (
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Invoice INV-2847",
              status: "Processed",
              time: "2s",
              color: "text-emerald-400",
            },
            {
              label: "Bank reconciliation",
              status: "Running",
              time: "45s",
              color: "text-blue-400",
            },
            {
              label: "Payroll batch #142",
              status: "Queued",
              time: "—",
              color: "text-amber-400",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/5 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/50">{item.time}</p>
                </div>
              </div>
              <span className={`text-xs font-medium ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              AI suggests: Categorize as "Office Supplies"
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "reporting",
    eyebrow: "Financial Reporting",
    title: "Insights that drive decisions",
    description:
      "Real-time financial reports generated automatically. P&L, balance sheet, cash flow — always up to date, always accurate.",
    features: [
      "Real-time P&L and Balance Sheet",
      "Cash flow forecasting",
      "Custom report builder",
      "Export to PDF, Excel, CSV",
    ],
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    visual: (
      <div className="relative rounded-2xl bg-white shadow-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-900">Financial Overview</h4>
          <span className="text-xs text-slate-500">Last 30 days</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            {
              label: "Revenue",
              value: "$284,500",
              change: "+12%",
              positive: true,
            },
            {
              label: "Expenses",
              value: "$142,300",
              change: "-8%",
              positive: true,
            },
            {
              label: "Net Profit",
              value: "$142,200",
              change: "+24%",
              positive: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              <p
                className={`text-xs font-medium ${stat.positive ? "text-emerald-600" : "text-red-600"}`}
              >
                {stat.change}
              </p>
            </div>
          ))}
        </div>
        <div className="h-32 flex items-end gap-1">
          {[40, 55, 45, 60, 50, 65, 55, 70, 60, 75, 65, 80].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "multi-currency",
    eyebrow: "Multi-Currency",
    title: "Global business, local expertise",
    description:
      "Handle transactions in any currency with automatic exchange rates. Perfect for businesses operating across borders.",
    features: [
      "50+ currencies supported",
      "Real-time exchange rates",
      "Automatic conversion",
      "Multi-currency reporting",
    ],
    gradient: "from-amber-500 via-orange-500 to-red-500",
    visual: (
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl">
        <h4 className="text-white font-semibold mb-4">Currency Dashboard</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { currency: "USD", flag: "🇺🇸", rate: "1.00", change: "+0.2%" },
            { currency: "GBP", flag: "🇬🇧", rate: "0.79", change: "-0.1%" },
            { currency: "GMD", flag: "🇬🇲", rate: "53.20", change: "+0.8%" },
            { currency: "EUR", flag: "🇪🇺", rate: "0.92", change: "+0.3%" },
          ].map((item) => (
            <div key={item.currency} className="rounded-lg bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.flag}</span>
                <span className="text-white font-medium">{item.currency}</span>
              </div>
              <p className="text-white/60 text-sm mt-1">1 USD = {item.rate}</p>
              <p className="text-emerald-400 text-xs">{item.change}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "security",
    eyebrow: "Security",
    title: "Your data, protected",
    description:
      "Enterprise-grade security built in from day one. Your financial data is encrypted, isolated, and auditable.",
    features: [
      "End-to-end encryption",
      "Role-based access control",
      "Complete audit trail",
      "SOC 2 compliant",
    ],
    gradient: "from-rose-600 via-pink-600 to-purple-600",
    visual: (
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium">Security Score</p>
            <p className="text-emerald-400 text-sm">Excellent</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Encryption at rest", status: true },
            { label: "Encryption in transit", status: true },
            { label: "Audit logging", status: true },
            { label: "Access controls", status: true },
            { label: "Data isolation", status: true },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-white/5 p-2"
            >
              <span className="text-sm text-white/80">{item.label}</span>
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime SLA" },
  { value: 50, suffix: "+", label: "Currencies" },
  { value: 256, suffix: "-bit", label: "Encryption" },
  { value: 24, suffix: "/7", label: "Support" },
];

const testimonials = [
  {
    quote:
      "Xenboox transformed how we handle accounting. What used to take days now happens automatically.",
    author: "Sarah Chen",
    role: "CFO, TechStart Inc.",
  },
  {
    quote:
      "The AI automation is incredible. It's like having a full accounting team working around the clock.",
    author: "Michael Okafor",
    role: "Finance Director, Lagos Ventures",
  },
  {
    quote:
      "Finally, accounting software that understands multi-currency. Game changer for our global operations.",
    author: "Emma Johansson",
    role: "Controller, Nordic Trading Co.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Accounting that{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              thinks for itself
            </span>
          </h1>

          <p className="mt-6 text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            The first accounting platform where AI handles the work. Automated
            reconciliations, intelligent categorization, and real-time insights
            — so you can focus on growing your business.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="group relative inline-flex h-14 items-center rounded-2xl bg-white px-8 text-base font-semibold text-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
            >
              <span className="relative flex items-center gap-2">
                Start Building Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-14 items-center rounded-2xl border border-white/20 bg-white/5 px-8 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
            >
              Watch Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {featureSections.map((section, index) => (
        <section
          key={section.id}
          className={`py-24 sm:py-32 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-16 lg:grid-cols-2 items-center ${
                index % 2 === 1 ? "lg:grid-flow-dense" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-1.5 text-xs font-semibold text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  }}
                >
                  <span
                    className={`bg-gradient-to-r ${section.gradient} bg-clip-text text-transparent`}
                  >
                    {section.eyebrow}
                  </span>
                </span>
                <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                  {section.title}
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                  {section.description}
                </p>
                <ul className="mt-8 space-y-4">
                  {section.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-1 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className={index % 2 === 1 ? "lg:col-start-1" : ""}>
                <div className="relative">
                  <div
                    className={`absolute -inset-4 bg-gradient-to-r ${section.gradient} rounded-3xl opacity-20 blur-xl`}
                  />
                  <div className="relative">{section.visual}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Bento Grid */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                nothing you don&apos;t
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Built for modern finance teams who want powerful tools without the
              complexity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CreditCard,
                title: "Accounts Payable",
                description: "Automate bill processing and payments",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                icon: TrendingUp,
                title: "Accounts Receivable",
                description: "Track invoices and collect payments faster",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: FileText,
                title: "Document AI",
                description: "Extract data from receipts and invoices",
                gradient: "from-violet-500 to-violet-600",
              },
              {
                icon: Globe,
                title: "Multi-Entity",
                description: "Manage multiple businesses in one place",
                gradient: "from-amber-500 to-amber-600",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Role-based access and approval workflows",
                gradient: "from-pink-500 to-pink-600",
              },
              {
                icon: Clock,
                title: "Real-Time Sync",
                description: "Updates across all devices instantly",
                gradient: "from-cyan-500 to-cyan-600",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg`}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">
              Trusted by finance teams worldwide
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <blockquote className="text-slate-700 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[128px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Ready to transform your accounting?
          </h2>
          <p className="mt-6 text-xl text-white/60">
            Join thousands of businesses using Xenboox to automate their finance
            operations.
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
              href="/pricing"
              className="inline-flex h-14 items-center rounded-2xl border border-white/20 px-8 text-base font-medium text-white transition-all duration-300 hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/40">
            No credit card required · Free tier available · Setup in minutes
          </p>
        </div>
      </section>
    </>
  );
}
