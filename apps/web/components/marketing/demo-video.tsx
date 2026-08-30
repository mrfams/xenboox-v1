"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, X, Clock, ShieldCheck, Bot } from "lucide-react";

import { VideoObjectJsonLd } from "@/components/marketing/json-ld";
import { FadeInUp } from "@/components/marketing/reveal";

const YOUTUBE_EMBED =
  "https://www.youtube.com/embed/REPLACE_WITH_YOUR_VIDEO_ID";
const POSTER_GRADIENT =
  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,79,224,0.18), transparent 60%), linear-gradient(180deg, rgba(20,33,61,0.08), rgba(20,33,61,0.02))";

export function DemoVideo() {
  const [open, setOpen] = useState(false);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <VideoObjectJsonLd
        name="Xenboox — 2-Minute Product Walkthrough"
        description="See how specialized AI agents handle invoicing, payroll, compliance, and month-end close — agents do the work, you make the decisions."
        duration="PT2M"
        embedUrl={YOUTUBE_EMBED}
        thumbnailUrl="https://xenboox.com/opengraph-image"
      />

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
                Watch how the AI workforce closes your books — from invoice to
                month-end — with human approval at every step.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mx-auto mt-8 max-w-3xl">
              {/* Poster */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Play 2-minute demo video"
                className="group relative flex aspect-video w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {/* Background */}
                <div
                  className="absolute inset-0"
                  aria-hidden="true"
                  style={{ background: POSTER_GRADIENT }}
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  aria-hidden="true"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(20,33,61,0.06) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Mock UI inside poster */}
                <div className="relative flex w-full items-center justify-center p-6 sm:p-10">
                  <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-border bg-background/80 p-4 shadow-lg backdrop-blur sm:p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Bot
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      CFO Briefing — live
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green"
                          aria-hidden="true"
                        />
                        20+ agents
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
                      Every decision is confidence-scored. You approve what
                      matters.
                    </div>
                  </div>
                </div>

                {/* Play button */}
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-[1.02] active:scale-[0.98] sm:h-20 sm:w-20">
                  <Play
                    className="h-7 w-7 translate-x-0.5 sm:h-8 sm:w-8"
                    aria-hidden="true"
                    fill="currentColor"
                  />
                </span>

                {/* Duration badge */}
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-foreground/85 px-2.5 py-1 text-xs font-medium text-background sm:bottom-4 sm:right-4">
                  2:03
                </span>
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-balanced-green"
                    aria-hidden="true"
                  />
                  No signup to watch
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />2 minutes,
                  no fluff
                </span>
              </div>

              {/* Transcript */}
              <details className="group mx-auto mt-6 max-w-2xl rounded-xl border border-border bg-card px-4 py-3 text-left">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground flex items-center justify-between">
                  Video transcript
                  <svg
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;Xenboox is an AI-native accounting platform. Nineteen
                  specialized agents handle invoicing, payroll, compliance, and
                  month-end close. Every decision is confidence-scored — below
                  70% it asks you, below 40% it escalates. You see a CFO
                  briefing, approve what matters, and the ledger stays clean.
                  Start free, connect your bank, and get your first insight in
                  minutes.&rdquo;
                </p>
              </details>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Demo video"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close demo video"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Xenboox — 2-Minute Walkthrough
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close video"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title="Xenboox demo — 2 minute walkthrough"
                src={YOUTUBE_EMBED}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="h-full w-full"
              />
            </div>
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Placeholder video — replace{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                YOUTUBE_EMBED
              </code>{" "}
              with your recorded walkthrough URL.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
