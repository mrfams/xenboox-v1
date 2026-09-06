import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  HandCoins,
  Landmark,
  ShieldCheck,
} from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

// ─── Proof ──────────────────────────────────────────────────────────────────
//
// Honest pre-launch social proof: no invented customers, no invented
// metrics. Capability proof (what the platform guarantees by construction)
// plus an early-access invitation. Customer stories ship when customers do.

const proofPoints = [
  {
    icon: CalendarCheck,
    title: "Close in days, not weeks",
    description:
      "A guided month-end checklist that never drops a step — every entry balanced, every action audit-trailed.",
  },
  {
    icon: HandCoins,
    title: "Chase what's owed on autopilot",
    description:
      "Overdue invoices get listed, aged, and followed up. You review and approve every reminder before it sends.",
  },
  {
    icon: Landmark,
    title: "Built for how money actually moves",
    description:
      "Bank feeds, mobile money, and multi-currency reconciliation first — not bolted on after.",
  },
  {
    icon: ShieldCheck,
    title: "Every action audit-trailed",
    description:
      "Who did what, when, and why — on every posting. Nothing posts anonymously, ever.",
  },
];

export function Testimonials() {
  return (
    <Section
      id="testimonials"
      className="relative overflow-hidden bg-background py-20 sm:py-24 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,hsl(var(--primary)/0.05),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Why teams switch
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
              The books run themselves.
              <br />
              <span className="text-muted-foreground">You make the calls.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              What Xenboox guarantees by construction — not by testimonial.
            </p>
          </div>
        </FadeInUp>

        <div className="mx-auto mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map((point, i) => (
            <FadeInUp key={point.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border/80 hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <point.icon
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.2}>
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-6 text-center sm:mt-12">
            <p className="text-sm font-medium text-foreground">
              We&apos;re onboarding our first cohort of businesses now.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Join as an early team — shape the roadmap, get white-glove
              migration from QuickBooks or Xero.
            </p>
            <Link
              href="/register"
              className="group mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              Get early access
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </FadeInUp>
      </div>
    </Section>
  );
}
