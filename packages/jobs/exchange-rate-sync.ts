import { task, logger } from "@trigger.dev/sdk"
import { dlqOnFailure } from "./lib/dlq"
import { db } from "@xenboox/db"
import { exchangeRates } from "@xenboox/db/schema"
import { desc } from "drizzle-orm"

export const syncExchangeRates = task({
  id: "sync-exchange-rates",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{ baseCurrency?: string }>({
    task: "sync-exchange-rates",
    type: "data_validation",
    severity: "medium",
    title: () => "Exchange rate sync failed",
  }),

  run: async (payload: { baseCurrency?: string }) => {
    const baseCurrency = payload.baseCurrency ?? "USD"

    logger.info("Syncing exchange rates", { baseCurrency })

    try {
      // 1. Fetch rates from ECB API
      const rates = await fetchECBRates(baseCurrency)

      // 2. Insert new rates
      let insertedCount = 0
      for (const rate of rates) {
        await db.insert(exchangeRates).values({
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
          rate: rate.rate.toString(),
          source: "ecb",
          validFrom: new Date(),
        })
        insertedCount++
      }

      logger.info("Exchange rates synced", { count: insertedCount })

      return {
        success: true,
        count: insertedCount,
        baseCurrency,
      }
    } catch (error) {
      logger.error("Failed to sync exchange rates", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  },
})

type ECBRate = {
  fromCurrency: string
  toCurrency: string
  rate: number
}

async function fetchECBRates(baseCurrency: string): Promise<ECBRate[]> {
  // ECB publishes daily rates at 16:00 CET
  const response = await fetch(
    "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
  )

  if (!response.ok) {
    throw new Error(`ECB API error: ${response.status}`)
  }

  const xml = await response.text()

  // Simple XML parsing for exchange rates
  const rates: ECBRate[] = []
  const rateMatches = xml.matchAll(
    /<Cube currency='(\w+)' rate='([\d.]+)'\/>/g
  )

  for (const match of rateMatches) {
    const currency = match[1]!
    const rate = parseFloat(match[2]!)

    if (currency === baseCurrency) continue

    // Convert from EUR-based to baseCurrency
    if (baseCurrency === "EUR") {
      rates.push({ fromCurrency: "EUR", toCurrency: currency, rate })
    } else {
      // Need EUR/BASE rate first
      const baseRate = rates.find((r) => r.toCurrency === baseCurrency)
      if (baseRate) {
        rates.push({
          fromCurrency: baseCurrency,
          toCurrency: currency,
          rate: rate / baseRate.rate,
        })
      }
    }
  }

  // Add EUR/BASE if not EUR
  if (baseCurrency !== "EUR") {
    const eurBaseRate = rates.find((r) => r.toCurrency === baseCurrency)
    if (eurBaseRate) {
      rates.push({
        fromCurrency: baseCurrency,
        toCurrency: "EUR",
        rate: 1 / eurBaseRate.rate,
      })
    }
  }

  return rates
}
