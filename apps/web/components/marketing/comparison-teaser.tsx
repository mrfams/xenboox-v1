import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

const rows = [
  { feature: "19 AI agents", xenboox: true, qb: false, xero: false },
  {
    feature: "Multi-currency (50+)",
    xenboox: true,
    qb: "Add-on",
    xero: "Standard+",
  },
  {
    feature: "Unlimited users",
    xenboox: true,
    qb: "Per-seat",
    xero: "Per-seat",
  },
  {
    feature: "Month-end close automation",
    xenboox: true,
    qb: false,
    xero: false,
  },
  {
    feature: "Confidence-scored approvals",
    xenboox: true,
    qb: false,
    xero: false,
  },
  { feature: "Free tier", xenboox: true, qb: false, xero: false },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <Check className="h-4 w-4 text-emerald-500 mx-auto" aria-label="Yes" />
    );
  }
  if (value === false) {
    return <X className="h-4 w-4 text-red-400 mx-auto" aria-label="No" />;
  }
  return (
    <span className="text-xs text-muted-foreground" aria-label={value}>
      {value}
    </span>
  );
}

export function ComparisonTeaser() {
  return (
    <section
      id="compare"
      className="border-t border-border bg-slate-50/60 dark:bg-slate-900/20 py-12 sm:py-16"
      aria-labelledby="compare-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeInUp>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="compare-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              How we compare
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Traditional software gives you forms. Xenboox gives you an AI
              workforce. Here&apos;s the quick view.
            </p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-foreground"
                    >
                      Feature
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-semibold text-primary"
                    >
                      Xenboox
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-semibold text-muted-foreground"
                    >
                      QuickBooks
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-semibold text-muted-foreground"
                    >
                      Xero
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <th
                        scope="row"
                        className="px-4 py-2.5 text-left font-medium text-foreground"
                      >
                        {row.feature}
                      </th>
                      <td className="px-4 py-2.5 text-center">
                        <Cell value={row.xenboox} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Cell value={row.qb} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Cell value={row.xero} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Full breakdowns with pricing and migration guides.
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href="/compare/quickbooks"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  vs QuickBooks{" "}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href="/compare/xero"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  vs Xero <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
          </div>
        </FadeInUp>

        <div className="mt-4 text-center">
          <Link
            href="/one-pager"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Download one-pager (PDF)
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
