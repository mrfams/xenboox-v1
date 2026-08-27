"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Clock, FileText } from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

type LegalHeroProps = {
  title: string;
  description: string;
  lastUpdated?: string;
  effectiveDate?: string;
  version?: string;
};

export function LegalHero({
  title,
  description,
  lastUpdated = "July 1, 2026",
  effectiveDate,
  version,
}: LegalHeroProps) {
  return (
    <section className="relative overflow-hidden bg-paper border-b border-border">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(20, 33, 61, 0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <FadeInUp>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>
        </FadeInUp>

        <FadeInUp delay={0.05}>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Legal
            </span>
            {version && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                v{version}
              </span>
            )}
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {description}
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2}>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Last updated: {lastUpdated}
            </span>
            {effectiveDate && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Effective: {effectiveDate}
              </span>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}

type LegalContentProps = {
  children: React.ReactNode;
  tableOfContents?: Array<{ id: string; label: string }>;
};

export function LegalContent({ children, tableOfContents }: LegalContentProps) {
  const [activeId, setActiveId] = useState<string>("");

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      }
    },
    [],
  );

  useEffect(() => {
    if (!tableOfContents || tableOfContents.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible section
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Pick the one closest to the top
          const closest = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top
              ? prev
              : curr,
          );
          setActiveId(closest.target.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    // Observe all sections
    tableOfContents.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [tableOfContents]);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
          {tableOfContents && tableOfContents.length > 0 && (
            <FadeInUp delay={0.1}>
              <nav className="lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                  On this page
                </p>
                <ul className="space-y-1">
                  {tableOfContents.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => handleClick(e, item.id)}
                          className={`
                            block text-sm py-1.5 pl-3 -ml-3 rounded-r-lg transition-all duration-200
                            ${
                              isActive
                                ? "text-primary font-medium bg-primary/5 border-l-2 border-primary"
                                : "text-muted-foreground hover:text-foreground border-l-2 border-transparent"
                            }
                          `}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </FadeInUp>
          )}

          <FadeInUp delay={0.15}>
            <div className="legal-content max-w-none">{children}</div>
          </FadeInUp>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-12">
        <div className="rounded-2xl bg-muted border border-border p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Questions about this policy?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our legal team is here to help. Reach out anytime.
              </p>
            </div>
            <a
              href="mailto:legal@xenboox.com"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover shrink-0"
            >
              Contact Legal Team
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
