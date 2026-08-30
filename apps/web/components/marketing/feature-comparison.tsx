"use client";

import Link from "next/link";
import { ArrowRight, Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeInUp } from "@/components/marketing/reveal";

export type ComparisonValue = boolean | string;

export type ComparisonFeature = {
  name: string;
  values: ComparisonValue[];
};

export type ComparisonCategory = {
  name: string;
  features: ComparisonFeature[];
};

export function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-balanced-green/10">
        <Check className="h-3 w-3 text-balanced-green" aria-label="Included" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/50">
        <Minus
          className="h-3 w-3 text-muted-foreground/40"
          aria-label="Not included"
        />
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-foreground" aria-label={value}>
      {value}
    </span>
  );
}

export function FeatureComparison({
  title = "Compare plans in detail",
  subtitle,
  categories,
  columns,
  highlightColumn = 1,
  links,
  className,
}: {
  title?: string;
  subtitle?: string;
  categories: ComparisonCategory[];
  columns: string[];
  highlightColumn?: number;
  links?: { label: string; href: string }[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-border bg-background py-16 sm:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-3 text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-left font-semibold text-foreground min-w-[200px]"
                    >
                      Feature
                    </th>
                    {columns.map((col, i) => (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          "px-4 py-3.5 text-center font-semibold min-w-[100px]",
                          i === highlightColumn
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <CategoryGroup
                      key={category.name}
                      category={category}
                      columnCount={columns.length}
                      highlightColumn={highlightColumn}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {links && links.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-muted/30 px-4 py-3">
                {links.map((link, i) => (
                  <span key={link.href} className="flex items-center gap-2">
                    {i > 0 && (
                      <span className="text-muted-foreground/40">·</span>
                    )}
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {link.label}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}

function CategoryGroup({
  category,
  columnCount,
  highlightColumn,
}: {
  category: ComparisonCategory;
  columnCount: number;
  highlightColumn: number;
}) {
  return (
    <>
      <tr className="bg-muted/30">
        <th
          colSpan={columnCount + 1}
          scope="colgroup"
          className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {category.name}
        </th>
      </tr>
      {category.features.map((feature, i) => (
        <tr
          key={feature.name}
          className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}
        >
          <th
            scope="row"
            className="px-4 py-2.5 text-left font-medium text-foreground"
          >
            {feature.name}
          </th>
          {feature.values.map((value, j) => (
            <td
              key={j}
              className={cn(
                "px-4 py-2.5 text-center",
                j === highlightColumn && "bg-primary/[0.03]",
              )}
            >
              <ComparisonCell value={value} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
