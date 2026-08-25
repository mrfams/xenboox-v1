"use client";

import { Globe, ChevronRight } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { useModuleAi } from "@/components/module/module-ai-context";

// ─── Live Exchange Rates ─────────────────────────────────────────────────
// Displays real-time exchange rates for the entity's base currency.
// Fetches entity-scoped rates first, falls back to ECB-synced global rates.

export function LiveExchangeRates() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: settings } = trpc.currency.getSettings.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: entityRates, isLoading: entityRatesLoading } =
    trpc.currency.listRates.useQuery(undefined, {
      enabled: !!entityId,
    });

  const baseCurrency = settings?.baseCurrency ?? "USD";

  const keyPairs = [
    { from: "USD", to: baseCurrency, label: "USD" },
    { from: "EUR", to: baseCurrency, label: "EUR" },
    { from: "GBP", to: baseCurrency, label: "GBP" },
  ];

  const missingPairs = keyPairs.filter(
    (pair) =>
      !entityRates?.some(
        (r) => r.fromCurrency === pair.from && r.toCurrency === pair.to,
      ),
  );

  const { data: globalRates, isLoading: globalRatesLoading } =
    trpc.currency.listGlobalRates.useQuery(
      {
        pairs: missingPairs.map((p) => ({ from: p.from, to: p.to })),
      },
      { enabled: missingPairs.length > 0 },
    );

  const isLoading = entityRatesLoading || globalRatesLoading;

  const displayRates = keyPairs.map((pair) => {
    const entityRate = entityRates?.find(
      (r) => r.fromCurrency === pair.from && r.toCurrency === pair.to,
    );
    if (entityRate)
      return {
        ...pair,
        rate: parseFloat(entityRate.rate),
        source: entityRate.source ?? "entity",
      };

    const globalRate = globalRates?.find(
      (r) => r.fromCurrency === pair.from && r.toCurrency === pair.to,
    );
    if (globalRate)
      return {
        ...pair,
        rate: parseFloat(globalRate.rate),
        source: globalRate.source ?? "ecb",
      };

    return { ...pair, rate: null, source: "ecb" };
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mb-2" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Globe className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Exchange Rates
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Base: {baseCurrency} · Updated daily from ECB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Exchange Rates",
                name: "Currency Rates",
                fields: displayRates.map((r) => ({
                  label: `${r.label}/${baseCurrency}`,
                  value: r.rate ? r.rate.toFixed(4) : "N/A",
                })),
              },
              "Show me current exchange rates. Any significant movements I should know about?",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displayRates.map((r) => (
          <div
            key={r.label}
            className="rounded-lg bg-background/50 p-3 text-center"
          >
            <p className="text-[10px] font-medium text-muted-foreground/70">
              {r.label}/{baseCurrency}
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">
              {r.rate ? r.rate.toFixed(4) : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground/50 uppercase">
              {r.source}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
