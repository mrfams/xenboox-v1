"use client";

import { useCallback } from "react";
import { useEntity } from "@/lib/entity-context";

// ─── Currency Symbol Map ────────────────────────────────────────────────────
// For display in contexts where Intl.NumberFormat doesn't show the symbol
// (e.g., compact formats, tables, badges).

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RUB: "₽",
  TRY: "₺",
  MXN: "Mex$",
  ZAR: "R",
  NGN: "₦",
  KES: "KSh",
  GHS: "GH₵",
  GMD: "D",
  XOF: "CFA",
  XAF: "FCFA",
  MAD: "MAD",
  EGP: "E£",
  AED: "د.إ",
  SAR: "﷼",
  QAR: "QR",
  BHD: "BD",
  KWD: "KD",
  OMR: "OMR",
  THB: "฿",
  VND: "₫",
  IDR: "Rp",
  MYR: "RM",
  PHP: "₱",
  SGD: "S$",
  HKD: "HK$",
  TWD: "NT$",
  NZD: "NZ$",
  PKR: "₨",
  BDT: "৳",
  LKR: "Rs",
  NPR: "Rs",
};

/**
 * Returns the display symbol for a currency code.
 * Falls back to the code itself if unknown.
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/**
 * Format a number as currency using the entity's active currency.
 *
 * Usage:
 *   const fmt = useFormatCurrency();
 *   fmt(1234.56)  // "$1,234.56" (or "D1,234.56" for GMD)
 *   fmt(1234.56, "EUR")  // "€1,234.56" — override for multi-currency
 */
export function useFormatCurrency() {
  const { entityCurrency } = useEntity();

  const format = useCallback(
    (amount: number, overrideCurrency?: string) => {
      const currency = overrideCurrency ?? entityCurrency ?? "USD";
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        // Fallback for invalid currency codes
        return `${getCurrencySymbol(currency)} ${amount.toFixed(2)}`;
      }
    },
    [entityCurrency],
  );

  /**
   * Format with explicit currency symbol (for multi-currency contexts).
   * Useful when showing a transaction in a different currency than the entity.
   */
  const formatWithSymbol = useCallback(
    (amount: number, fromCurrency: string, toCurrency?: string) => {
      const target = toCurrency ?? entityCurrency ?? "USD";
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: fromCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${getCurrencySymbol(fromCurrency)} ${amount.toFixed(2)}`;
      }
    },
    [entityCurrency],
  );

  /**
   * Get just the symbol for a currency code.
   */
  const getSymbol = useCallback(
    (currency?: string) => {
      return getCurrencySymbol(currency ?? entityCurrency ?? "USD");
    },
    [entityCurrency],
  );

  return { format, formatWithSymbol, getSymbol, entityCurrency };
}
