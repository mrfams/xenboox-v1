import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"

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
      "All 3 platforms (web, mobile, desktop)",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations that need dedicated infrastructure and support.",
    features: [
      "Unlimited entities",
      "All 19 AI agents",
      "Unlimited everything",
      "SSO/SAML authentication",
      "Custom AI agent training",
      "On-premise deployment option",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom reporting",
    ],
    cta: "Contact Sales",
    ctaHref: "/register",
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-lg border p-6 ${
                  tier.highlighted
                    ? "border-primary shadow-lg ring-1 ring-primary"
                    : ""
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <div>
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
                <ul className="mt-6 flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaHref}
                  className={`mt-6 inline-flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground shadow hover:bg-primary/90"
                      : "border hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="Can I switch plans at any time?"
              answer="Yes. You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remaining days in your billing cycle."
            />
            <FaqItem
              question="Is my data secure?"
              answer="Absolutely. We use PostgreSQL Row-Level Security, AES-256 encryption for sensitive fields, and all data is encrypted in transit with TLS 1.3. We also maintain a complete audit trail for every action."
            />
            <FaqItem
              question="Do you support my country's tax regulations?"
              answer="Xenboox ships with Gambia's PAYE tax bands and SSNIT contributions built in. We're adding support for more African countries. Custom tax configurations are available on the Enterprise plan."
            />
            <FaqItem
              question="Can I use Xenboox on my phone?"
              answer="Yes. Xenboox is available on web, iOS, Android, Windows, and macOS. Your data syncs seamlessly across all platforms."
            />
            <FaqItem
              question="What happens to my data if I cancel?"
              answer="You can export all your data at any time. After cancellation, we retain your data for 30 days, then it's permanently deleted."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free account in 30 seconds. No credit card required.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function FaqItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </div>
  )
}