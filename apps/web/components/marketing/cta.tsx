import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui";
import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

export function Cta() {
  return (
    <Section id="cta" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          {/* Double-bezel — machined hardware, not flat card */}
          <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-1.5 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.45)]">
            <div className="relative overflow-hidden rounded-[1.7rem] bg-ledger-ink px-6 py-12 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
              {/* Ambient — restrained, not AI-purple */}
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 62% 82% at 78% 8%, rgba(59,79,224,0.28), transparent 62%), radial-gradient(ellipse 48% 72% at 12% 96%, rgba(15,113,89,0.20), transparent 62%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="relative mx-auto max-w-2xl text-center">
                {/* Eyebrow — editorial, not pill spam */}
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-paper/40">
                  Start in minutes
                </p>

                <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-paper sm:text-4xl lg:text-[2.75rem]">
                  Your accounting department,
                  <br />
                  <span className="text-paper/90">fully autonomous.</span>
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-pretty text-[17px] leading-[1.6] text-paper/65">
                  AI agents handle invoicing, payroll, compliance, and month-end
                  close. Set up in minutes — no data entry required.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="group h-11 gap-2 rounded-full bg-white px-7 text-sm font-medium text-ledger-ink shadow-lg shadow-black/20 transition-all duration-300 hover:bg-white/90 hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]"
                  >
                    <Link href="/onboarding">
                      Start free
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ledger-ink/10 transition-transform duration-300 group-hover:translate-x-0.5">
                        <ArrowRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-full border-white/15 bg-white/5 px-7 text-sm font-medium text-paper backdrop-blur transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-paper active:scale-[0.98]"
                  >
                    <Link href="/pricing">See pricing</Link>
                  </Button>
                </div>

                {/* Trust — mono, not marketing fluff */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs leading-none text-paper/35">
                  <span className="inline-flex items-center gap-1.5">
                    <Check
                      className="h-3 w-3 text-paper/40"
                      aria-hidden="true"
                    />
                    Free tier
                  </span>
                  <span
                    className="h-1 w-1 rounded-full bg-white/15"
                    aria-hidden="true"
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <Check
                      className="h-3 w-3 text-paper/40"
                      aria-hidden="true"
                    />
                    No credit card
                  </span>
                  <span
                    className="h-1 w-1 rounded-full bg-white/15"
                    aria-hidden="true"
                  />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>
    </Section>
  );
}
