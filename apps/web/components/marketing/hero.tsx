"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type MarketingHeroProps = {
  title: string | React.ReactNode;
  highlight?: string;
  description: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  footnote?: string;
  leftAlign?: boolean;
  children?: React.ReactNode;
};

export function MarketingHero({
  title,
  highlight,
  description,
  cta,
  secondaryCta,
  footnote,
  leftAlign,
  children,
}: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-slate-950" />

      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent blur-3xl" />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent blur-3xl" />
      <div className="absolute bottom-20 left-1/3 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-3xl" />

      <div
        className={cn(
          "relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 w-full",
          leftAlign ? "" : "text-center",
        )}
      >
        <div className={leftAlign ? "max-w-3xl" : "mx-auto max-w-3xl"}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            {typeof title === "string" && highlight ? (
              <>
                <span className="text-white">{title}</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  {highlight}
                </span>
              </>
            ) : typeof title === "string" ? (
              <span className="text-white">{title}</span>
            ) : (
              title
            )}
          </h1>

          <p
            className={cn(
              "mt-2 text-base sm:text-lg text-white/60 leading-relaxed",
              leftAlign ? "max-w-xl" : "mx-auto max-w-xl",
            )}
          >
            {description}
          </p>

          {(cta || secondaryCta) && (
            <div
              className={cn(
                "mt-4 flex flex-wrap gap-4",
                leftAlign ? "" : "justify-center",
              )}
            >
              {cta && (
                <Link
                  href={cta.href}
                  className="group relative inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
                  <span className="relative flex items-center gap-2">
                    {cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}

          {footnote && (
            <p
              className={cn(
                "mt-2 text-sm text-white/40",
                leftAlign ? "" : "text-center",
              )}
            >
              {footnote}
            </p>
          )}

          {children && (
            <div className={cn("mt-6", leftAlign ? "" : "flex justify-center")}>
              {children}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
