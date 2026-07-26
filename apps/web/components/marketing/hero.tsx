"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketingHeroProps = {
  title: string;
  subtitle?: string;
  description: string;
  cta?: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  className?: string;
  compact?: boolean;
};

export function MarketingHero({
  title,
  subtitle,
  description,
  cta,
  secondaryCta,
  className,
  compact,
}: MarketingHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950",
        compact ? "py-16" : "py-20",
        className,
      )}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        {subtitle && (
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-400">
            {subtitle}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {description}
        </p>
        {(cta || secondaryCta) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {cta && (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
