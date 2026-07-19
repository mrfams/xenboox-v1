"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────
   Reveal — scroll-triggered fade/slide wrapper
   ─────────────────────────────────────────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────
   GlowOrb — animated ambient background blob
   ─────────────────────────────────────────────────────────── */
export function GlowOrb({
  className = "",
  color = "from-indigo-500/30",
  size = "h-72 w-72",
  delay = 0,
}: {
  className?: string;
  color?: string;
  size?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full bg-gradient-to-br blur-3xl animate-blob",
        color,
        "to-transparent",
        size,
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/* ───────────────────────────────────────────────────────────
   MarketingShell — dark, breathing page wrapper
   ─────────────────────────────────────────────────────────── */
export function MarketingShell({
  children,
  className = "",
  orbs = true,
}: {
  children: ReactNode;
  className?: string;
  orbs?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden marketing-bg text-white",
        className,
      )}
    >
      {orbs && (
        <>
          <GlowOrb
            className="-top-24 -left-24"
            color="from-indigo-500/30"
            size="h-96 w-96"
            delay={0}
          />
          <GlowOrb
            className="top-1/4 -right-24"
            color="from-fuchsia-500/25"
            size="h-80 w-80"
            delay={3}
          />
          <GlowOrb
            className="bottom-10 left-1/3"
            color="from-emerald-500/20"
            size="h-64 w-64"
            delay={6}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   PageHero — gradient hero with eyebrow, title, subtitle, actions
   ─────────────────────────────────────────────────────────── */
export function PageHero({
  eyebrow,
  title,
  highlight,
  subtitle,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <Reveal className="max-w-3xl">
          {eyebrow && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {eyebrow}
            </span>
          )}
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-white">{title}</span>
            {highlight && (
              <>
                {" "}
                <span className="text-gradient animate-gradient">
                  {highlight}
                </span>
              </>
            )}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-9">{children}</div>}
        </Reveal>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </section>
  );
}

/* ───────────────────────────────────────────────────────────
   SectionHeading — centered eyebrow + heading
   ─────────────────────────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-white">{title}</span>
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-white/50">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ───────────────────────────────────────────────────────────
   GlassCard — glassmorphism surface with hover lift
   ─────────────────────────────────────────────────────────── */
export function GlassCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass card-hover group relative overflow-hidden rounded-2xl p-6",
        glow && "shadow-[0_0_60px_-20px_rgba(99,102,241,0.5)]",
        className,
      )}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   CtaBand — closing call to action with gradient
   ─────────────────────────────────────────────────────────── */
export function CtaBand({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  subtitle?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl px-8 py-14 text-center">
            <GlowOrb
              className="-top-10 left-1/4"
              color="from-indigo-500/30"
              size="h-56 w-56"
              delay={0}
            />
            <GlowOrb
              className="-bottom-10 right-1/4"
              color="from-fuchsia-500/25"
              size="h-56 w-56"
              delay={2}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="text-white">{title}</span>
              </h2>
              {subtitle && (
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
                  {subtitle}
                </p>
              )}
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <a
                  href={primaryHref}
                  className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-7 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.04] hover:shadow-indigo-600/50"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400 to-fuchsia-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                  <span className="relative">{primaryLabel}</span>
                </a>
                {secondaryHref && (
                  <a
                    href={secondaryHref}
                    className="inline-flex h-12 items-center rounded-xl border border-white/15 bg-white/5 px-7 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10"
                  >
                    {secondaryLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────
   LegalShell — polished shell for legal/policy documents
   (text content untouched; only presentation)
   ─────────────────────────────────────────────────────────── */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <Reveal>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
              Legal
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="text-white">{title}</span>
            </h1>
            {updated && (
              <p className="mt-4 text-sm text-white/40">
                Last updated: {updated}
              </p>
            )}
          </Reveal>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-10 text-sm leading-relaxed text-white/60 [&_h2]:mb-3 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white/90 [&_strong]:text-white/90 [&_a]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-white [&_td]:border-b [&_td]:py-2 [&_td]:pr-4 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-white/80">
            {children}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
