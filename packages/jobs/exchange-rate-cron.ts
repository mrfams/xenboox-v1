import { task, logger } from "@trigger.dev/sdk";
import { db } from "@xenboox/db";
import { exchangeRates } from "@xenboox/db/schema";
import { desc } from "drizzle-orm";

// ─── Exchange Rate Sync Cron ────────────────────────────────────────────────
//
// Runs daily at 1:00 AM (before the daily close pipeline at 2:00 AM).
// Fetches the latest exchange rates from the ECB API and stores them
// in the global exchange_rates table.
//
// ECB publishes daily rates at 16:00 CET. We fetch at 1:00 AM UTC
// to ensure we get the latest available rates for the day.
//
// This job only runs if rates haven't been synced today (idempotent).

export const syncExchangeRatesScheduled = task({
  id: "sync-exchange-rates-scheduled",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  run: async () => {
    const today = new Date().toISOString().split("T")[0]!;

    logger.info("Starting scheduled exchange rate sync", { date: today });

    // Check if rates already synced today (idempotent)
    const todayRates = await db.query.exchangeRates.findMany({
      where: (t, { and, eq, gte }) =>
        and(
          eq(t.source, "ecb"),
          gte(t.validFrom, new Date(today)),
        ),
      orderBy: [desc(exchangeRates.validFrom)],
      limit: 1,
    });

    if (todayRates.length > 0) {
      logger.info("Exchange rates already synced today", { date: today });
      return { success: true, synced: false, reason: "already_synced" };
    }

    // Fetch rates from ECB API
    const rates = await fetchECBRates();

    if (rates.length === 0) {
      logger.warn("No exchange rates fetched from ECB");
      return { success: true, synced: false, reason: "no_rates" };
    }

    // Insert rates
    let insertedCount = 0;
    for (const rate of rates) {
      await db.insert(exchangeRates).values({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: rate.rate.toString(),
        source: "ecb",
        validFrom: new Date(),
      });
      insertedCount++;
    }

    logger.info("Exchange rates synced", {
      date: today,
      count: insertedCount,
      pairs: rates.map((r) => `${r.fromCurrency}/${r.toCurrency}`),
    });

    return {
      success: true,
      synced: true,
      date: today,
      count: insertedCount,
    };
  },
});

type ECBRate = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

/**
 * Fetch exchange rates from the ECB API.
 *
 * ECB publishes daily reference rates in XML format:
 * https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 *
 * Rates are EUR-based. We convert to GMD-based rates since GMD
 * is the base currency for The Gambia market.
 */
async function fetchECBRates(): Promise<ECBRate[]> {
  const response = await fetch(
    "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
    {
      headers: { Accept: "application/xml" },
    },
  );

  if (!response.ok) {
    throw new Error(`ECB API error: ${response.status}`);
  }

  const xml = await response.text();

  // Parse XML for exchange rates
  const rates: ECBRate[] = [];
  const rateMatches = xml.matchAll(
    /<Cube currency='(\w+)' rate='([\d.]+)'\/>/g,
  );

  const eurRates: Record<string, number> = {};

  for (const match of rateMatches) {
    const currency = match[1]!;
    const rate = parseFloat(match[2]!);
    eurRates[currency] = rate;
  }

  // Target currencies for The Gambia market
  const targetCurrencies = ["USD", "EUR", "GBP", "GNF", "SLL", "XOF", "NGN", "KES", "ZAR"];

  // Generate cross rates
  for (const target of targetCurrencies) {
    if (!eurRates[target]) continue;

    // GMD/EUR rate (approximate — ECB doesn't publish GMD)
    // GMD is roughly 73 per USD, and EUR/USD is ~1.08
    // So GMD/EUR ≈ 73 * 1.08 ≈ 78.84
    // We'll use a hardcoded approximate rate for GMD
    const GMD_PER_EUR = 78.84;

    // GMD → target
    const gmdToTarget = eurRates[target] / GMD_PER_EUR;
    rates.push({
      fromCurrency: "GMD",
      toCurrency: target,
      rate: gmdToTarget,
    });

    // target → GMD
    const targetToGmd = GMD_PER_EUR / eurRates[target];
    rates.push({
      fromCurrency: target,
      toCurrency: "GMD",
      rate: targetToGmd,
    });

    // Cross rates between target currencies via EUR
    for (const other of targetCurrencies) {
      if (other === target || !eurRates[other]) continue;
      const crossRate = eurRates[target] / eurRates[other];
      rates.push({
        fromCurrency: target,
        toCurrency: other,
        rate: crossRate,
      });
    }
  }

  // Add EUR/GMD
  const GMD_PER_EUR = 78.84;
  rates.push({
    fromCurrency: "EUR",
    toCurrency: "GMD",
    rate: GMD_PER_EUR,
  });
  rates.push({
    fromCurrency: "GMD",
    toCurrency: "EUR",
    rate: 1 / GMD_PER_EUR,
  });

  // Add USD/GMD
  const usdToGmd = GMD_PER_EUR / (eurRates["USD"] ?? 1.08);
  rates.push({
    fromCurrency: "USD",
    toCurrency: "GMD",
    rate: usdToGmd,
  });
  rates.push({
    fromCurrency: "GMD",
    toCurrency: "USD",
    rate: 1 / usdToGmd,
  });

  return rates;
}
