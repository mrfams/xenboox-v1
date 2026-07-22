import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const tiers = [
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
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations that need dedicated infrastructure and support.",
    features: [
      "Unlimited entities",
      "All 19 AI agents",
      "Unlimited everything",
      "SSO/SAML authentication",
      "Custom AI agent training",
      "On-premise option",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom reporting",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
    gradient: "from-slate-100 to-slate-50",
    icon: "E",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60 mx-auto">
            <Sparkles className="h-3 w-3 text-blue-400" />
            Pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] text-white">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-white/50 max-w-xl mx-auto">
            Start free. Scale as you grow. No hidden fees.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/40">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            Free tier available
            <span className="mx-2">·</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            No credit card required
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-300 ${tier.highlighted ? "border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02] lg:scale-105 bg-gradient-to-b from-white to-blue-50" : "bg-white hover:shadow-lg hover:-translate-y-0.5"}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs font-medium text-white shadow-sm whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tier.gradient} ${tier.highlighted ? "shadow-md" : ""} mb-4`}
                  >
                    <span className="text-sm font-bold text-white">
                      {tier.icon}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-sm text-muted-foreground">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlighted ? "text-blue-600" : "text-green-500"}`}
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaHref}
                  className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ${tier.highlighted ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]" : "border hover:bg-muted"}`}
                >
                  {tier.cta}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-b from-slate-50 to-white py-10 md:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
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
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-foreground list-none">
                  {faq.q}
                  <svg
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to get started?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join thousands of businesses using Xenboox.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              Start Free Trial
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
