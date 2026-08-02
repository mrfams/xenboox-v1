"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { MarketingHero } from "@/components/marketing/hero";

const monthlyTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For solo founders and small businesses getting started.",
    features: [
      "1 entity",
      "1 AI agent (CFO)",
      "Up to 50 journal entries/month",
      "Chart of accounts",
      "Basic reports (P&L, Balance Sheet)",
      "Web app access",
      "Community support",
    ],
    cta: "Start Free",
    ctaHref: "/register",
    highlighted: false,
    gradient: "from-slate-100 to-slate-50",
    icon: "S",
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For growing businesses that need AI-powered automation.",
    features: [
      "Up to 3 entities",
      "All 19 AI agents",
      "Unlimited journal entries",
      "Full AP/AR module",
      "Payroll processing",
      "Treasury & bank reconciliation",
      "Web + mobile apps",
      "Email support",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: true,
    gradient: "from-blue-600 to-indigo-600",
    icon: "M",
  },
  {
    name: "Business",
    price: "$79",
    period: "/month",
    description: "For established businesses with complex accounting needs.",
    features: [
      "Up to 10 entities",
      "All 19 AI agents",
      "Unlimited everything",
      "Multi-currency support",
      "Fixed assets & depreciation",
      "Inventory management",
      "All 3 platforms",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
    gradient: "from-slate-100 to-slate-50",
    icon: "L",
  },
  // {
  //   name: "Enterprise",
  //   price: "Custom",
  //   period: "",
  //   description:
  //     "For organizations that need dedicated infrastructure and support.",
  //   features: [
  //     "Unlimited entities",
  //     "All 19 AI agents",
  //     "Unlimited everything",
  //     "SSO/SAML authentication",
  //     "Custom AI agent training",
  //     "On-premise option",
  //     "Dedicated account manager",
  //     "SLA guarantee",
  //     "Custom reporting",
  //   ],
  //   cta: "Contact Sales",
  //   ctaHref: "/contact",
  //   highlighted: false,
  //   gradient: "from-slate-100 to-slate-50",
  //   icon: "E",
  // },
];

const yearlyTiers = monthlyTiers.map((tier) => {
  if (tier.price === "$0" || tier.price === "Custom") return tier;
  const monthly = parseInt(tier.price.replace("$", ""));
  const yearly = Math.round(monthly * 10); // 2 months free
  return {
    ...tier,
    price: `$${yearly}`,
    period: "/year",
    description: `$${monthly}/mo billed annually — save $${monthly * 2}`,
  };
});

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const tiers = annual ? yearlyTiers : monthlyTiers;

  return (
    <>
      <MarketingHero
        title="Simple, transparent pricing"
        description="Start free. Scale as you grow. No hidden fees."
      >
        <div className="flex items-center justify-center gap-3">
          <div className="relative flex rounded-full border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`relative z-10 rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                !annual ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`relative z-10 rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                annual ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Annual
            </button>
            <div
              className={`absolute top-0.5 bottom-0.5 rounded-full bg-blue-600 transition-all duration-200 ${
                annual ? "left-1/2 right-0.5" : "left-0.5 right-1/2"
              }`}
            />
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Save 17%
          </span>
        </div>
      </MarketingHero>

      <section className="py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-5 md:p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? "border-blue-500 shadow-xl shadow-blue-500/10 lg:scale-105 bg-gradient-to-b from-white to-blue-50"
                    : "bg-white hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-0.5 text-[10px] font-medium text-white shadow-sm whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tier.gradient} ${tier.highlighted ? "shadow-md" : ""} mb-3`}
                  >
                    <span className="text-sm font-bold text-white">
                      {tier.icon}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{tier.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-xs text-muted-foreground">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tier.description}
                  </p>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-xs"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tier.highlighted ? "text-blue-600" : "text-green-500"}`}
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaHref}
                  className={`mt-4 inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
                      : "border hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-b from-slate-50 to-white py-8 md:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Can I switch plans at any time?",
                a: "Yes. You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remaining days in your billing cycle.",
              },
              {
                q: "Is my data secure?",
                a: "Absolutely. We use PostgreSQL Row-Level Security, AES-256 encryption, TLS 1.3, and a complete audit trail.",
              },
              {
                q: "Do you support my country's tax regulations?",
                a: "Xenboox ships with Gambia's PAYE and SSNIT built in. More countries coming. Enterprise plan supports custom tax configs.",
              },
              {
                q: "Can I use Xenboox on my phone?",
                a: "Yes. Available on web, iOS, Android, Windows, and macOS with seamless sync across platforms.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "Export at any time. Data retained for 30 days after cancellation, then permanently deleted.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border bg-white transition-all duration-200 hover:shadow-sm open:shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium text-foreground list-none">
                  {faq.q}
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-5 pb-3">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join thousands of businesses using Xenboox.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            Start Free Trial
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
