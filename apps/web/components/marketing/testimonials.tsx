"use client";

import * as React from "react";
import { Quote } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
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
      "The compliance agent caught a NAPSA filing error that would have cost us GMD 200K in penalties. It flagged it before we even knew there was a problem.",
    name: "Lamin Sanyang",
    role: "Managing Partner, LS Consulting",
    location: "Serrekunda",
  },
];

const CARD_WIDTH = 320;
const GAP = 24;
const AUTO_INTERVAL = 3500;

export function Testimonials() {
  const [index, setIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(2);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const scrollStart = React.useRef(0);

  // Responsive: 2 cards on laptop (lg >=1024), 1 on smaller
  React.useEffect(() => {
    const update = () => {
      setVisibleCount(window.innerWidth >= 1024 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  // Clamp index when visibleCount changes
  React.useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  // Auto swipe
  React.useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [isPaused, maxIndex]);

  // Pointer drag to allow manual swipe
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
    // threshold to change slide
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
    // resume after short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

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
            eyebrow="Real teams, real results • entity-scoped by default"
            title="Teams that closed their books in days, not weeks."
          />
        </FadeInUp>

        {/* Carousel — one row, swipe left, 2 cards visible on laptop */}
        <div
          className="mx-auto mt-10 sm:mt-12"
          style={{
            maxWidth: visibleCount === 2 ? CARD_WIDTH * 2 + GAP : CARD_WIDTH,
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={viewportRef}
            className="overflow-hidden"
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
                  className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-[0_8px_30px_-12px_rgba(59,79,224,0.12)]"
                  style={{
                    width: CARD_WIDTH,
                    minWidth: CARD_WIDTH,
                    maxWidth: CARD_WIDTH,
                  }}
                >
                  <Quote
                    className="h-7 w-7 shrink-0 text-primary/30"
                    aria-hidden="true"
                  />
                  <blockquote className="mt-4 flex-1 text-[15px] font-medium leading-relaxed tracking-tight text-foreground text-pretty">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>

                  {/* Footer — always pinned to bottom, level across all cards */}
                  <figcaption className="mt-8 flex flex-col gap-0.5 border-t border-border/60 pt-5">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.role} · {item.location}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* Invisible progress/dots for accessibility — hidden visually but keeps structure */}
          <div
            className="mt-6 flex items-center justify-center gap-1.5"
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
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
