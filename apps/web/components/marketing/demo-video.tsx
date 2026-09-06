import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

const POSTER_GRADIENT =
  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,79,224,0.18), transparent 60%), linear-gradient(180deg, rgba(20,33,61,0.08), rgba(20,33,61,0.02))";

// ─── Product Visual ─────────────────────────────────────────────────────────
//
// An honest still of the product states (not a fake video player): what the
// books look like while Xenboox works — done items, in-progress items, and
// the one thing waiting on you. No placeholder embeds, no fake durations.

export function DemoVideo() {
  return (
    <section
      id="demo"
      className="border-t border-border bg-paper-2/60 py-12 sm:py-16 lg:py-20"
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="demo-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              See Xenboox in action
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Watch how your books run themselves — from invoice to
              month-end — with human approval at every step.
            </p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="relative flex w-full items-center justify-center p-6 sm:p-10 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/5">
              <div
                className="absolute inset-0"
                aria-hidden="true"
                style={{ background: POSTER_GRADIENT }}
              />
              <div className="relative flex w-full max-w-xl flex-col gap-3 rounded-xl border border-border bg-background/80 p-4 shadow-lg backdrop-blur sm:p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  Your books — live
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green"
                      aria-hidden="true"
                    />
                    Working now
                  </span>
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">
                      Invoice #INV-1042 posted
                    </span>
                    <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-xs font-medium text-balanced-green">
                      Posted
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">
                      July payroll — 34 staff
                    </span>
                    <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-xs font-medium text-balanced-green">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-attention-amber/20 bg-attention-amber/5 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">
                      VAT return — needs review
                    </span>
                    <span className="rounded-full bg-attention-amber/15 px-2 py-0.5 text-xs font-medium text-attention-amber">
                      Needs approval
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-balanced-green"
                    aria-hidden="true"
                  />
                  Uncertain work escalates to you. You approve what
                  matters.
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Try it on your own books
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                Free tier · No credit card · Live in minutes
              </p>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
