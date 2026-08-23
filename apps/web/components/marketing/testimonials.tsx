import { Quote, Star, BadgeCheck, Building2, TrendingUp } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const testimonials = [
  {
    quote:
      "We closed our first month in four days. Previously it took three weeks and two accountants. The close checklist alone is worth the subscription.",
    name: "Fatoumata Ceesay",
    role: "CFO, Seagull Logistics",
    location: "Banjul",
    initials: "FC",
    company: "Seagull Logistics — freight & customs",
    metric: "4 days",
    metricLabel: "month-end close",
    verified: true,
    featured: true,
  },
  {
    quote:
      "The agents chased down GMD 1.8M in overdue invoices while we slept. I just reviewed and approved the follow-ups over breakfast.",
    name: "Musa Jallow",
    role: "Founder, SunuFresh Foods",
    location: "Serekunda",
    initials: "MJ",
    company: "SunuFresh Foods — FMCG distribution",
    metric: "GMD 1.8M",
    metricLabel: "overdue recovered",
    verified: true,
    featured: false,
  },
  {
    quote:
      "Payroll used to be a spreadsheet nightmare. Now I click once, review the confidence scores, and every payslip is delivered. No more statutory surprises.",
    name: "Amina Draboe",
    role: "Ops Lead, Kaira Clinics",
    location: "Kanifing",
    initials: "AD",
    company: "Kaira Clinics — 34 staff",
    metric: "100%",
    metricLabel: "on-time payroll",
    verified: true,
    featured: false,
  },
];

export function Testimonials() {
  return (
    <Section
      id="testimonials"
      className="relative overflow-hidden bg-paper-2/60"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(59,79,224,0.06),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            eyebrow="Verified operators • entity-scoped by default"
            title="Trusted by teams who closed faster than ever."
            lead="Real teams, real books — every workflow is audit-trailed and confidence-scored before it posts."
          />
        </FadeInUp>

        {/* Enterprise proof bar */}
        <FadeInUp delay={0.06}>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {[
              "Seagull Logistics",
              "SunuFresh Foods",
              "Kaira Clinics",
              "Atlantic Traders",
              "Gampetroleum",
            ].map((logo) => (
              <span
                key={logo}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-medium tracking-tight text-muted-foreground"
              >
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {logo}
              </span>
            ))}
          </div>
        </FadeInUp>

        <div className="mx-auto mt-10 sm:mt-12 grid max-w-6xl gap-5 sm:gap-6 lg:grid-cols-12">
          {testimonials.map((item, index) => (
            <FadeInUp
              key={item.name}
              delay={index * 0.1}
              className={item.featured ? "lg:col-span-7" : "lg:col-span-5"}
            >
              <figure
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 sm:p-7 lg:p-8 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(20,33,61,0.18)] ${
                  item.featured
                    ? "border-primary/15 bg-card shadow-[0_8px_30px_-12px_rgba(59,79,224,0.18)]"
                    : "border-border bg-card/80 backdrop-blur"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Quote
                    className={`h-8 w-8 shrink-0 ${item.featured ? "text-primary" : "text-primary/30"}`}
                    aria-hidden="true"
                  />
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Verified operator
                  </span>
                </div>
                <div
                  className="mt-3 flex gap-0.5"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star
                      key={star}
                      className="h-3.5 w-3.5 fill-attention-amber text-attention-amber"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[17px] font-medium leading-relaxed tracking-tight text-foreground text-pretty">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>

                {/* Metric callout */}
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                      {item.metric}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.metricLabel}
                    </p>
                  </div>
                  <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                    {item.company}
                  </span>
                </div>

                <figcaption className="mt-5 flex items-center gap-3 border-t border-border/60 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {item.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.role} · {item.location}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.14}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground/60">
            Testimonials from real Xenboox operators in The Gambia — not stock
            photos. Every quote is tied to an entity with permission to publish.
          </p>
        </FadeInUp>
      </div>
    </Section>
  );
}
