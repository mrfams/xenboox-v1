import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";
import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

export function Cta() {
  return (
    <Section id="cta">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="relative overflow-hidden rounded-3xl bg-ledger-ink px-6 py-12 text-center sm:px-12 sm:py-16 lg:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 60% 90% at 80% 0%, rgba(59, 79, 224, 0.35), transparent 60%), radial-gradient(ellipse 50% 80% at 10% 100%, rgba(15, 113, 89, 0.25), transparent 60%)",
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl lg:text-5xl">
                Let the agents do the books.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-paper/70">
                19 AI agents handle invoicing, payroll, compliance, and
                month-end close. Set up in minutes — no data entry required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/onboarding">
                    Start free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-paper hover:bg-white/10 hover:text-paper"
                >
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-paper/50">
                Free tier available. No credit card required.
              </p>
            </div>
          </div>
        </FadeInUp>
      </div>
    </Section>
  );
}
