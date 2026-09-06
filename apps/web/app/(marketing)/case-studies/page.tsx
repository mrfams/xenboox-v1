import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HandCoins,
  HeartHandshake,
  Rocket,
  MessagesSquare,
  LifeBuoy,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

export const metadata: Metadata = {
  title: "Customers — Early Access | Xenboox",
  description:
    "Xenboox is onboarding its first cohort of businesses. Join as an early team: white-glove migration, direct roadmap influence, and hands-on support.",
};

// ─── Customers (honest pre-launch) ──────────────────────────────────────────
//
// No invented customers, no invented metrics. Customer stories ship when
// customers do. Until then: who we're built for, what early teams get,
// and an invitation.

const fitProfiles = [
  {
    icon: Building2,
    title: "SMEs drowning in spreadsheets",
    description:
      "Invoices in one file, payroll in another, close in your head. Xenboox absorbs the busywork — you keep the decisions.",
  },
  {
    icon: HandCoins,
    title: "Firms managing client books",
    description:
      "Multi-entity by design. Run every client's close from one queue, with an audit trail your auditors will love.",
  },
  {
    icon: HeartHandshake,
    title: "NGOs and grant-funded teams",
    description:
      "Track spend against budgets with evidence attached to everything. Donor-ready reporting without the spreadsheet season.",
  },
];

const earlyBenefits = [
  {
    icon: Rocket,
    title: "White-glove migration",
    description:
      "We import your chart of accounts, customers, vendors, and history from QuickBooks or Xero — with you, not by ticket queue.",
  },
  {
    icon: MessagesSquare,
    title: "Direct roadmap influence",
    description:
      "Early teams shape what ships next. Your workflow gaps become our sprint priorities.",
  },
  {
    icon: LifeBuoy,
    title: "Hands-on support",
    description:
      "Real humans during onboarding and close. No chatbots standing between you and your books.",
  },
];

export default function CustomersPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Customers" }]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
          <FadeInUp>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Customers
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-5xl">
              Built with early teams,
              <br />
              <span className="text-muted-foreground">not focus groups.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              We&apos;re onboarding our first cohort now. No cherry-picked
              logos yet — customer stories ship when customers do. Here&apos;s
              who we&apos;re built for and what joining early gets you.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {fitProfiles.map((profile, i) => (
            <FadeInUp key={profile.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border/80 hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <profile.icon
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">
                  {profile.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {profile.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* What early teams get */}
      <section className="border-t border-border/50 bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <FadeInUp>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                What joining early gets you
              </h2>
            </div>
          </FadeInUp>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            {earlyBenefits.map((benefit, i) => (
              <FadeInUp key={benefit.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-border/50 bg-card p-6">
                  <benefit.icon
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-[15px] font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
          <FadeInUp delay={0.15}>
            <div className="mt-8 text-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Join the early cohort
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
