"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Inbox,
  MessageSquare,
  PieChart,
  Play,
  Send,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui";

// ─── Surface Definitions ─────────────────────────────────────────────────────

type Surface = "command" | "activity" | "pulse" | "ledger" | "operations";

const surfaces: {
  id: Surface;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "command",
    label: "Command Center",
    icon: MessageSquare,
    color: "signal-indigo",
  },
  {
    id: "activity",
    label: "Activity Hub",
    icon: Inbox,
    color: "attention-amber",
  },
  {
    id: "pulse",
    label: "Financial Pulse",
    icon: PieChart,
    color: "balanced-green",
  },
  { id: "ledger", label: "Ledger", icon: BookOpen, color: "signal-indigo" },
  {
    id: "operations",
    label: "Operations",
    icon: Wallet,
    color: "balanced-green",
  },
];

// ─── Numbers Field — dot perfection → numbers on hover (dynamic, demo-safe) ───
// Base: perfect mono dot grid at 0.06. On cursor, dots within 140px morph
// into *dynamic* financial numbers (any value, not a fixed list) at 10-11px,
// then spring-restore to dots. Numbers are generated live via
// randomFinancialNumber(). Demo card is punch-holed.
function HeroNumbersField({
  heroRef,
}: {
  heroRef: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    let w = 0;
    let h = 0;
    let raf = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let isVisible = true;

    // dynamic financial number — any value, not a list
    function randomFinancialNumber(): string {
      const r = Math.random();
      if (r < 0.22) {
        // large with commas: 12,000 — 980,000
        const n = Math.floor(Math.random() * 968000 + 12000);
        return n.toLocaleString("en-US");
      } else if (r < 0.45) {
        // K/M: 1.2K — 9.8M
        const v = (Math.random() * 9 + 0.8).toFixed(1);
        return Math.random() > 0.5 ? v + "K" : v + "M";
      } else if (r < 0.68) {
        // small: 800 — 9,500
        const n = Math.floor(Math.random() * 8700 + 800);
        return n.toLocaleString("en-US");
      } else if (r < 0.85) {
        // percent: -5% — +19%
        const n = Math.floor(Math.random() * 24 - 5);
        return (n >= 0 ? "+" : "") + n + "%";
      } else {
        // decimal ledger: 1,250.00 style
        const n = (Math.random() * 9000 + 200).toFixed(2);
        return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
      }
    }

    type Dot = { x: number; y: number; morph: number; txt: string };
    let dots: Dot[] = [];

    const SPACING = 38;
    const RADIUS = 320;

    const init = () => {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.floor(w / SPACING) + 2;
      const rows = Math.floor(h / SPACING) + 2;
      const ox = (w % SPACING) / 2;
      const oy = (h % SPACING) / 2;
      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            x: ox + c * SPACING,
            y: oy + r * SPACING,
            morph: 0,
            txt: randomFinancialNumber(),
          });
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    const ro = new ResizeObserver(() => init());
    ro.observe(hero);
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !raf) raf = requestAnimationFrame(frame);
      },
      { threshold: 0 },
    );
    io.observe(hero);
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);

    init();

    function getDemoRect() {
      const demo = hero.querySelector<HTMLElement>("[data-hero-demo]");
      if (!demo) return null;
      const hr = hero.getBoundingClientRect();
      const dr = demo.getBoundingClientRect();
      return {
        x: dr.left - hr.left - 24,
        y: dr.top - hr.top - 24,
        w: dr.width + 48,
        h: dr.height + 48,
      };
    }

    function frame() {
      raf = 0;
      if (!isVisible) return;
      ctx.clearRect(0, 0, w, h);
      const demoRect = getDemoRect();

      for (const d of dots) {
        // punch hole: skip if inside demo card
        if (
          demoRect &&
          d.x > demoRect.x &&
          d.x < demoRect.x + demoRect.w &&
          d.y > demoRect.y &&
          d.y < demoRect.y + demoRect.h
        ) {
          // still update morph to 0 so it restores, but don't draw
          d.morph += (0 - d.morph) * 0.07;
          continue;
        }

        const dx = d.x - mouseX;
        const dy = d.y - mouseY;
        const dist2 = dx * dx + dy * dy;
        const tgt =
          dist2 < RADIUS * RADIUS
            ? Math.pow(1 - Math.sqrt(dist2) / RADIUS, 1.1)
            : 0;
        // lerp morph with spring-like easing
        const speed = tgt > d.morph ? 0.14 : 0.07;
        d.morph += (tgt - d.morph) * speed;
        if (d.morph < 0.004) d.morph = 0;
        if (d.morph > 0.998) d.morph = 1;

        // assign new dynamic number when crossing into number state
        if (d.morph > 0.28 && tgt > 0.28 && Math.random() < 0.02) {
          d.txt = randomFinancialNumber();
        }

        if (d.morph < 0.28) {
          // dot perfection — larger, more breathing room
          const alpha = 0.08 + d.morph * 0.12;
          const sz = 1.6 + d.morph * 1.4;
          ctx.fillStyle =
            d.morph > 0.12
              ? "hsl(var(--primary) / " + (alpha + 0.07) + ")"
              : "hsl(var(--foreground) / " + alpha + ")";
          ctx.fillRect(d.x - sz / 2, d.y - sz / 2, sz, sz);
        } else {
          // number — readable, well-spaced, professional mono
          const alpha = 0.14 + d.morph * 0.16;
          ctx.font =
            "500 13px 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace";
          // letter-spacing via canvas: use 0.02em tracked
          (ctx as unknown as { letterSpacing: string }).letterSpacing =
            "0.02em";
          ctx.fillStyle =
            d.morph > 0.45
              ? "hsl(var(--primary) / " + (alpha + 0.04) + ")"
              : "hsl(var(--foreground) / " + alpha + ")";
          const m = ctx.measureText(d.txt);
          ctx.fillText(d.txt, d.x - m.width / 2, d.y + 4);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}

// ─── Main Hero Component ─────────────────────────────────────────────────────

export function Hero() {
  const heroRef = React.useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Production-grade spotlight: CSS vars + rAF, no React re-render per move
  // Visible by design: outer 800px at 0.09 + inner 420px at 0.15, grid masked
  React.useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let lastX = -9999;
    let lastY = -9999;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--x", `${lastX}px`);
        el.style.setProperty("--y", `${lastY}px`);
        raf = 0;
      });
    };
    const onEnter = () => el.style.setProperty("--spotlight", "1");
    const onLeave = () => {
      el.style.setProperty("--spotlight", "0");
      el.style.setProperty("--x", "-9999px");
      el.style.setProperty("--y", "-9999px");
    };

    el.style.setProperty("--x", "-9999px");
    el.style.setProperty("--y", "-9999px");
    el.style.setProperty("--spotlight", "0");
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Zamp footer magnetic — CTAs + badges subtly repel like antigravity footer
  React.useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const islands = Array.from(
      el.querySelectorAll<HTMLElement>("[data-magnetic]"),
    );
    if (!islands.length) return;
    let raf = 0;
    let mx = -9999;
    let my = -9999;
    const update = () => {
      raf = 0;
      for (const island of islands) {
        const r = island.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);
        const radius = 170;
        if (dist < radius) {
          const f = (radius - dist) / radius;
          const tx = -dx * f * 0.09;
          const ty = -dy * f * 0.09;
          island.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        } else {
          island.style.transform = "translate3d(0,0,0)";
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => {
      for (const island of islands)
        island.style.transform = "translate3d(0,0,0)";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      for (const island of islands) island.style.transform = "";
    };
  }, []);

  return (
    <section
      ref={heroRef as React.RefObject<HTMLDivElement>}
      className="relative overflow-hidden bg-background pb-10 sm:pb-14 lg:pb-20 [--x:-9999px] [--y:-9999px] [--spotlight:0]"
      style={{ willChange: "auto" } as React.CSSProperties}
    >
      {/* Ledger Field — antigravity canvas (accounting-native wow, behind spotlight) */}
      <HeroNumbersField heroRef={heroRef} />

      {/* Layer 1: outer wash — 800px, unmistakable but premium */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[var(--spotlight)] transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(760px circle at var(--x) var(--y), hsl(var(--primary) / 0.055), transparent 68%)",
          willChange: "opacity",
        }}
        aria-hidden="true"
      />
      {/* Layer 2: inner core — tighter, brighter, sells the flashlight */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[var(--spotlight)] transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(400px circle at var(--x) var(--y), hsl(var(--primary) / 0.08), transparent 62%)",
          willChange: "opacity",
        }}
        aria-hidden="true"
      />
      {/* Layer 3: grid reveal — grid brightens only under cursor (Stripe/Linear) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[var(--spotlight)] transition-opacity duration-300"
        style={{
          WebkitMaskImage:
            "radial-gradient(560px circle at var(--x) var(--y), black 18%, transparent 68%)",
          maskImage:
            "radial-gradient(560px circle at var(--x) var(--y), black 18%, transparent 68%)",
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>
      {/* Static grid for non-hover / reduced-motion fallback */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.06] [[style*='--spotlight:1']_&]:opacity-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 100% at 50% -20%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Text Zone — word-stagger, CTA under subline (Stripe/Linear) ── */}
        <div className="flex flex-col items-center gap-4 pt-10 text-center sm:pt-14 md:pt-16 lg:pt-20">
          {/* Headline — word stagger, blur+translate, gradient stays static (Anthropic restraint) */}
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
            {[
              "Your",
              "entire",
              "accounting",
              "department,",
              "running",
              "autonomously",
            ].map((word, i) => {
              const isGradient = word === "running" || word === "autonomously";
              return (
                <motion.span
                  key={word}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 16, filter: "blur(6px)" }
                  }
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.7,
                    delay: shouldReduceMotion ? 0 : i * 0.06,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className={
                    isGradient
                      ? "inline-block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                      : "inline-block"
                  }
                  style={{ willChange: "transform, opacity, filter" }}
                >
                  {word}
                  {i < 5 ? "\u00A0" : "."}
                </motion.span>
              );
            })}
          </h1>

          {/* Subline — line stagger */}
          <motion.p
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, y: 12, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.7,
              delay: shouldReduceMotion ? 0 : 0.42,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ willChange: "transform, opacity, filter" }}
          >
            AI agents handle invoicing, payroll, compliance, and month-end
            close. Every decision confidence-scored, every action audit-trailed.
            You approve what matters.
          </motion.p>

          {/* CTAs — directly under subline, magnetic */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: shouldReduceMotion ? 0 : 0.56,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="mt-2 flex flex-col items-center gap-3 sm:mt-3 sm:flex-row sm:justify-center"
            style={{ willChange: "transform, opacity" }}
          >
            <Button
              asChild
              size="lg"
              data-magnetic
              className="gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] will-change-transform"
              style={{ willChange: "transform" } as React.CSSProperties}
            >
              <Link href="/onboarding">
                Start free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              data-magnetic
              className="group gap-2 rounded-full border-border/80 bg-background/50 px-6 text-foreground/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-md hover:shadow-primary/10 hover:ring-1 hover:ring-primary/20 active:scale-[0.98] will-change-transform"
              style={{ willChange: "transform" } as React.CSSProperties}
            >
              <Link href="#demo">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
                  <Play
                    className="h-3 w-3 fill-primary text-primary"
                    aria-hidden="true"
                  />
                </span>
                See it in action
              </Link>
            </Button>
          </motion.div>

          {/* Trust badges — tight to CTA, magnetic */}
          <motion.ul
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: shouldReduceMotion ? 0 : 0.68,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
            style={{ willChange: "opacity" }}
          >
            {[
              "No credit card required",
              "Human approval on every decision",
            ].map((item) => (
              <li
                key={item}
                data-magnetic
                className="flex items-center gap-2 will-change-transform"
                style={{ willChange: "transform" } as React.CSSProperties}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ── Interactive Platform Demo — full bleed ── */}
        <motion.div
          data-hero-demo
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, y: 24, filter: "blur(8px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.8,
            delay: shouldReduceMotion ? 0 : 0.78,
            ease: [0.32, 0.72, 0, 1],
          }}
          className="mt-8 sm:mt-10 md:mt-12 lg:mt-14"
          style={{ willChange: "transform, opacity, filter" }}
        >
          <InteractiveDemo />
        </motion.div>
      </div>

      {/* Bottom fade — disabled since CTAs are now below visual */}
      {/* <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent sm:h-48 lg:h-64"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent lg:h-32"
        aria-hidden="true"
      /> */}
    </section>
  );
}

// ─── Interactive Platform Demo ───────────────────────────────────────────────

function InteractiveDemo() {
  const [activeSurface, setActiveSurface] = React.useState<Surface>("command");
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true);
  const demoWrapRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Auto-cycle through surfaces
  React.useEffect(() => {
    if (!isAutoPlaying) return;
    const order: Surface[] = [
      "command",
      "activity",
      "pulse",
      "ledger",
      "operations",
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % order.length;
      setActiveSurface(order[index]);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleSurfaceClick = (surface: Surface) => {
    setActiveSurface(surface);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 20000);
  };

  // Production-grade demo spotlight + border glow: rAF + CSS vars, no React churn
  React.useEffect(() => {
    const wrap = demoWrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let lx = -9999;
    let ly = -9999;
    let wx = -9999;
    let wy = -9999;

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      lx = e.clientX - r.left;
      ly = e.clientY - r.top;
      const wr = wrap.getBoundingClientRect();
      wx = e.clientX - wr.left;
      wy = e.clientY - wr.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        card.style.setProperty("--dx", `${lx}px`);
        card.style.setProperty("--dy", `${ly}px`);
        wrap.style.setProperty("--wx", `${wx}px`);
        wrap.style.setProperty("--wy", `${wy}px`);
        raf = 0;
      });
    };
    const onEnter = () => {
      card.style.setProperty("--dspot", "1");
      wrap.style.setProperty("--dspot", "1");
    };
    const onLeave = () => {
      card.style.setProperty("--dspot", "0");
      wrap.style.setProperty("--dspot", "0");
    };

    card.style.setProperty("--dx", "-9999px");
    card.style.setProperty("--dy", "-9999px");
    wrap.style.setProperty("--wx", "-9999px");
    wrap.style.setProperty("--wy", "-9999px");
    card.style.setProperty("--dspot", "0");
    wrap.style.setProperty("--dspot", "0");

    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={demoWrapRef}
      className="relative mx-auto w-full max-w-5xl [--wx:-9999px] [--wy:-9999px] [--dspot:0]"
    >
      {/* Outer wash — 600px, visible but soft */}
      <div
        className="pointer-events-none absolute -inset-12 rounded-[2rem] opacity-[var(--dspot)] blur-3xl transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(600px circle at var(--wx) var(--wy), hsl(var(--primary) / 0.09), transparent 68%)",
          willChange: "opacity",
        }}
        aria-hidden="true"
      />
      {/* Inner core — tighter, brighter */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-[var(--dspot)] blur-2xl transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(340px circle at var(--wx) var(--wy), hsl(var(--primary) / 0.06), transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Platform window — with cursor-following border glow */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8 dark:shadow-primary/15 [--dx:-9999px] [--dy:-9999px] [--dspot:0]"
      >
        {/* Border glow — paints only the 1px border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-[var(--dspot)] transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(520px circle at var(--dx) var(--dy), hsl(var(--primary) / 0.14), transparent 58%)",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1px",
          }}
          aria-hidden="true"
        />
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full bg-error-clay/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-attention-amber/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-balanced-green/70"
            aria-hidden="true"
          />

          {/* Agent activity indicator */}
          <AgentActivityBar />
        </div>

        <div className="flex min-h-[320px] sm:min-h-[380px] md:min-h-[420px]">
          {/* ── Sidebar ── */}
          <div className="hidden w-14 flex-col items-center gap-2 border-r border-border bg-muted/20 py-3 sm:flex">
            {surfaces.map((s) => {
              const Icon = s.icon;
              const isActive = activeSurface === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSurfaceClick(s.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={s.label}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  {isActive && (
                    <span className="absolute -left-[7px] h-5 w-[2px] rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
            <div className="mt-auto">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Settings className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="relative flex-1 overflow-hidden">
            <SurfacePanel isActive={activeSurface === "command"}>
              <CommandCenter />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "activity"}>
              <ActivityHub />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "pulse"}>
              <FinancialPulse />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "ledger"}>
              <LedgerView />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "operations"}>
              <OperationsView />
            </SurfacePanel>
          </div>
        </div>

        {/* ── Surface Tabs ── */}
        <div className="flex items-center justify-center gap-1 border-t border-border bg-muted/30 px-4 py-2 sm:flex">
          {surfaces.map((s) => {
            const isActive = activeSurface === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSurfaceClick(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Activity Bar ──────────────────────────────────────────────────────

function AgentActivityBar() {
  const [activityIndex, setActivityIndex] = React.useState(0);

  const activities = [
    {
      agent: "CFO Agent",
      action: "Reviewing monthly close",
      color: "text-primary",
    },
    {
      agent: "Invoice Agent",
      action: "Processing INV-1043",
      color: "text-balanced-green",
    },
    {
      agent: "Payroll Agent",
      action: "Calculating deductions",
      color: "text-attention-amber",
    },
    {
      agent: "Compliance Agent",
      action: "Checking VAT filing",
      color: "text-primary",
    },
    {
      agent: "Treasury Agent",
      action: "Monitoring cash flow",
      color: "text-balanced-green",
    },
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const current = activities[activityIndex];

  return (
    <div className="ml-3 hidden items-center gap-1.5 md:flex">
      <Sparkles className={`h-3 w-3 ${current.color}`} aria-hidden="true" />
      <span className="text-[10px] text-muted-foreground">
        <span className={`font-semibold ${current.color}`}>
          {current.agent}
        </span>{" "}
        {current.action}
      </span>
      <span className="typing-dots ml-1 inline-flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      </span>
    </div>
  );
}

// ─── Surface Panel Wrapper ───────────────────────────────────────────────────

function SurfacePanel({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive
          ? "translateY(0) scale(1)"
          : "translateY(6px) scale(0.99)",
        transition:
          "opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1), transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

// ─── Surface: Command Center ─────────────────────────────────────────────────

function CommandCenter() {
  const [visibleMessages, setVisibleMessages] = React.useState(0);
  const [isTyping, setIsTyping] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setIsTyping(true), 400));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(1);
      }, 1800),
    );
    timers.push(setTimeout(() => setIsTyping(true), 2400));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(2);
      }, 3800),
    );
    timers.push(setTimeout(() => setIsTyping(true), 4200));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(3);
      }, 5400),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const messages = [
    {
      role: "user" as const,
      text: "Record invoice for Seafood Solutions — GMD 486,000",
    },
    {
      role: "agent" as const,
      text: "Done. Invoice #INV-1042 posted.\n• Revenue: GMD 413,100\n• VAT (15%): GMD 72,900\n• Accounts Receivable: GMD 486,000\nConfidence: 98%",
      agent: "Invoice Agent",
    },
    {
      role: "agent" as const,
      text: "Bank reconciliation ready — 12 transactions totaling GMD 2.1M flagged for your review.",
      agent: "CFO Agent",
    },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Command Center
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {messages.slice(0, visibleMessages).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-up`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.role === "agent" && (
                <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Bot className="h-3 w-3" aria-hidden="true" />
                  {msg.agent}
                </span>
              )}
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start slide-up">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
              <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="typing-dots inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-background/50 transition-colors">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setDraft("");
            }
          }}
          placeholder="Type a command..."
          aria-label="Type a command"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <Send
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ─── Surface: Activity Hub ───────────────────────────────────────────────────

function ActivityHub() {
  const [visibleCards, setVisibleCards] = React.useState(0);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setVisibleCards(1), 400));
    timers.push(setTimeout(() => setVisibleCards(2), 1200));
    timers.push(setTimeout(() => setVisibleCards(3), 2000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const cards = [
    {
      icon: CreditCard,
      title: "Approve VAT payment",
      detail: "GMD 84,500 · Due Monday",
      tone: "attention-amber",
    },
    {
      icon: FileText,
      title: "Payroll ready to run",
      detail: "34 staff · GMD 1.92M net",
      tone: "primary",
    },
    {
      icon: CheckCircle2,
      title: "Bank reconciliation",
      detail: "12 transactions · GMD 2.1M",
      tone: "balanced-green",
    },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activity Hub
          </span>
        </div>
        <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
          3 need decision
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {cards.slice(0, visibleCards).map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80 slide-up"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${card.tone}/10 text-${card.tone}`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {card.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.detail}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]">
                  Approve
                </button>
                <button className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]">
                  Review
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Surface: Financial Pulse ────────────────────────────────────────────────

function FinancialPulse() {
  const [showChart, setShowChart] = React.useState(false);
  const [animatingBars, setAnimatingBars] = React.useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setShowChart(true), 500);
    const t2 = setTimeout(() => setAnimatingBars(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const metrics = [
    { label: "Revenue", value: "GMD 4.2M", change: "+12%", up: true },
    { label: "Expenses", value: "GMD 2.8M", change: "-3%", up: false },
    { label: "Net Income", value: "GMD 1.4M", change: "+18%", up: true },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Financial Pulse
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          August 2026
        </span>
      </div>

      {/* Metric cards */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-card p-3 slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-foreground tabular-nums">
              {m.value}
            </p>
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                m.up ? "text-balanced-green" : "text-error-clay"
              }`}
            >
              {m.up ? (
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              )}
              {m.change}
            </span>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 slide-up">
        <div className="flex items-start gap-2">
          <Bot
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-primary">AI Insight</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Revenue is up 12% driven by Seafood Solutions and Atlantic Foods.
              Expenses decreased 3% — payroll optimization saved GMD 42,000 this
              month.
            </p>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      {showChart && (
        <div className="flex-1 rounded-xl border border-border bg-card p-4 slide-up">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue trend
          </p>
          <svg viewBox="0 0 400 100" className="h-24 w-full" aria-hidden="true">
            <defs>
              <linearGradient
                id="revenueGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M0 80 L40 72 L80 68 L120 55 L160 50 L200 42 L240 38 L280 30 L320 25 L360 18 L400 12"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-draw"
            />
            <path
              d="M0 80 L40 72 L80 68 L120 55 L160 50 L200 42 L240 38 L280 30 L320 25 L360 18 L400 12 L400 100 L0 100 Z"
              fill="url(#revenueGrad)"
              className="chart-fill"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Surface: Ledger ─────────────────────────────────────────────────────────

function LedgerView() {
  const [visibleRows, setVisibleRows] = React.useState(0);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setVisibleRows(1), 300));
    timers.push(setTimeout(() => setVisibleRows(2), 600));
    timers.push(setTimeout(() => setVisibleRows(3), 900));
    timers.push(setTimeout(() => setVisibleRows(4), 1200));
    timers.push(setTimeout(() => setVisibleRows(5), 1600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const rows = [
    {
      date: "01 Aug",
      account: "Cash at bank (GMD)",
      dr: "486,000",
      cr: "",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "Accounts receivable",
      dr: "486,000",
      cr: "",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "VAT output (15%)",
      dr: "",
      cr: "72,900",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "Revenue",
      dr: "",
      cr: "413,100",
      highlight: false,
    },
    {
      date: "02 Aug",
      account: "Bank charges",
      dr: "1,250",
      cr: "",
      highlight: true,
    },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          General Ledger
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          August 2026
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-3 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Account</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Dr</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Cr</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visibleRows).map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/60 last:border-0 slide-up ${
                  row.highlight ? "bg-balanced-green/5" : ""
                }`}
              >
                <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {row.date}
                </td>
                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                  {row.account}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground">
                  {row.dr || "\u00A0"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground">
                  {row.cr || "\u00A0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Balance check */}
      {visibleRows >= 5 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-balanced-green/20 bg-balanced-green/5 px-4 py-2.5 slide-up">
          <span className="text-xs font-medium text-muted-foreground">
            Balance check
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-balanced-green">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Balanced
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Surface: Operations ─────────────────────────────────────────────────────

function OperationsView() {
  const [showDetails, setShowDetails] = React.useState(false);
  const [cashInWidth, setCashInWidth] = React.useState(0);
  const [cashOutWidth, setCashOutWidth] = React.useState(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setCashInWidth(78), 300);
    const t2 = setTimeout(() => setCashOutWidth(44), 500);
    const t3 = setTimeout(() => setShowDetails(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          This month
        </span>
      </div>

      {/* Cash flow bars */}
      <div className="mb-4 space-y-3">
        <div className="slide-up">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Cash In</span>
            <span className="text-xs font-semibold text-balanced-green tabular-nums">
              GMD 3.2M
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-balanced-green transition-all duration-1000 ease-out"
              style={{ width: `${cashInWidth}%` }}
            />
          </div>
        </div>
        <div className="slide-up">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Cash Out
            </span>
            <span className="text-xs font-semibold text-error-clay tabular-nums">
              GMD 1.8M
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-error-clay transition-all duration-1000 ease-out"
              style={{ width: `${cashOutWidth}%`, transitionDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>

      {/* Cash position */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3 slide-up">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash Position
          </span>
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-balanced-green">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            +18%
          </span>
        </div>
        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums">
          GMD 4,210,000
        </p>
      </div>

      {/* Upcoming items */}
      {showDetails && (
        <div className="flex-1 space-y-2 slide-up">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Incoming invoices (4)
              </p>
              <p className="text-[10px] text-muted-foreground">
                GMD 1.2M expected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <CreditCard
              className="h-4 w-4 text-attention-amber"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Pending payments (2)
              </p>
              <p className="text-[10px] text-muted-foreground">
                GMD 340,000 due
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <BarChart3
              className="h-4 w-4 text-balanced-green"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Next payroll: Aug 31
              </p>
              <p className="text-[10px] text-muted-foreground">
                34 staff · GMD 1.92M
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
