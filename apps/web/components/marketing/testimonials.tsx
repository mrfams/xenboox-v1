"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const testimonials = [
  {
    quote:
      "We closed our first month in four days. Previously it took three weeks and two accountants. The close checklist alone is worth the subscription.",
    name: "Fatoumata Ceesay",
    role: "CFO, Seagull Logistics",
    location: "Banjul",
  },
  {
    quote:
      "The agents chased down GMD 1.8M in overdue invoices while we slept. I just reviewed and approved the follow-ups over breakfast.",
    name: "Musa Jallow",
    role: "Founder, SunuFresh Foods",
    location: "Serekunda",
  },
  {
    quote:
      "Payroll used to be a spreadsheet nightmare. Now I click once, review the confidence scores, and every payslip is delivered. No more statutory surprises.",
    name: "Amina Draboe",
    role: "Ops Lead, Kaira Clinics",
    location: "Kanifing",
  },
  {
    quote:
      "Multi-currency used to eat hours every week. Now the AI reconciles USD, EUR, and GMD automatically. I just review the exchange rates each morning.",
    name: "Omar Darboe",
    role: "Finance Director, Atlantic Traders",
    location: "Banjul",
  },
  {
    quote:
      "We went from QuickBooks to Xenboox in a weekend. The migration agent imported our chart of accounts and the AI picked up where we left off.",
    name: "Isatou Touray",
    role: "Owner, Gampetroleum Services",
    location: "Brikama",
  },
  {
    quote:
      "The compliance agent caught a filing error that would have cost us GMD 200K in penalties. It flagged it before we even knew there was a problem.",
    name: "Lamin Sanyang",
    role: "Managing Partner, LS Consulting",
    location: "Serrekunda",
  },
];

// Production sizing — editorial width, generous line-length
const CARD_WIDTH = 480;
const GAP = 32;
const AUTO_INTERVAL = 4800;

export function Testimonials() {
  const [index, setIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(2);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const scrollStart = React.useRef(0);

  React.useEffect(() => {
    const update = () => {
      setVisibleCount(window.innerWidth >= 1024 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  React.useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  React.useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [isPaused, maxIndex]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    scrollStart.current = index;
    setIsPaused(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 60) {
      if (delta < 0 && index < maxIndex) {
        setIndex((p) => Math.min(p + 1, maxIndex));
      } else if (delta > 0 && index > 0) {
        setIndex((p) => Math.max(p - 1, 0));
      }
      isDragging.current = false;
    }
  };

  const onPointerUp = () => {
    isDragging.current = false;
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <Section
      id="testimonials"
      className="relative overflow-hidden bg-background py-20 sm:py-24 lg:py-28"
    >
      {/* Subtle editorial wash — not the old 0.06 indigo blob */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,hsl(var(--primary)/0.05),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
              Teams that closed their books
              <br />
              <span className="text-muted-foreground">in days, not weeks.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Finance leads and founders on what changed after Xenboox took the
              busywork.
            </p>
          </div>
        </FadeInUp>

        {/* Carousel — editorial, with arrow controls */}
        <div
          className="relative mx-auto mt-10 sm:mt-14"
          style={{
            maxWidth:
              visibleCount === 2 ? CARD_WIDTH * 2 + GAP + 32 : CARD_WIDTH + 32,
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Arrow — left */}
          <button
            type="button"
            aria-label="Previous testimonials"
            onClick={() => {
              setIndex((p) => (p <= 0 ? maxIndex : p - 1));
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 3000);
            }}
            className="absolute left-2 top-[42%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur transition-all hover:bg-accent hover:text-foreground hover:shadow-md disabled:opacity-30 disabled:pointer-events-none sm:left-0 sm:h-9 sm:w-9 sm:-translate-x-[60%]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {/* Arrow — right */}
          <button
            type="button"
            aria-label="Next testimonials"
            onClick={() => {
              setIndex((p) => (p >= maxIndex ? 0 : p + 1));
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 3000);
            }}
            className="absolute right-2 top-[42%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur transition-all hover:bg-accent hover:text-foreground hover:shadow-md disabled:opacity-30 disabled:pointer-events-none sm:right-0 sm:h-9 sm:w-9 sm:translate-x-[60%]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div
            ref={viewportRef}
            className="overflow-hidden rounded-[1.65rem]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div
              className="flex"
              style={{
                gap: GAP,
                transform: `translateX(-${index * (CARD_WIDTH + GAP)}px)`,
                transition: "transform 600ms cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            >
              {testimonials.map((item) => (
                <figure
                  key={item.name}
                  className="group flex shrink-0 flex-col rounded-[1.65rem] border border-border/40 bg-border/10 p-[5px] transition-all duration-300 hover:border-border/60"
                  style={{
                    width: CARD_WIDTH,
                    minWidth: CARD_WIDTH,
                    maxWidth: CARD_WIDTH,
                  }}
                >
                  <div className="flex flex-1 flex-col rounded-[1.35rem] bg-card p-8 sm:p-9">
                    {/* Opening mark — editorial, not lucide Quote */}
                    <span
                      aria-hidden="true"
                      className="font-serif text-[42px] font-light leading-none tracking-tight text-primary/12 select-none"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      “
                    </span>

                    <blockquote
                      className="mt-1 flex-1 text-pretty text-[17px] font-normal leading-[1.65] tracking-[-0.01em] text-foreground antialiased [text-wrap:balance] hyphens-auto"
                      style={{ hyphens: "auto" as const }}
                    >
                      {item.quote}
                    </blockquote>

                    <figcaption className="mt-8 flex flex-col gap-1 border-t border-border/40 pt-6">
                      <cite className="block truncate text-[13px] font-semibold not-italic leading-tight tracking-tight text-foreground">
                        {item.name}
                      </cite>
                      <span className="block truncate text-[12.5px] leading-tight text-muted-foreground">
                        {item.role}
                      </span>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>

          {/* Progress — editorial dots, 8px → 24px active */}
          <div
            className="mt-8 flex items-center justify-center gap-2"
            aria-hidden
          >
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIndex(i);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 3000);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-foreground"
                    : "w-1.5 bg-border hover:bg-border/80"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Slide {index + 1} of {maxIndex + 1}
          </p>
        </div>
      </div>
    </Section>
  );
}
