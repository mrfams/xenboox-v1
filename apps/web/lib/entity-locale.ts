/**
 * Entity Locale Helper — single source of truth for entity-specific formatting.
 *
 * Every entity has a locale stored in `entity_settings.fiscal_locale_overrides.locale`.
 * This helper resolves the locale with a sensible fallback chain:
 *   1. Entity settings (fiscalLocaleOverrides.locale)
 *   2. Entity base currency heuristic (NGN → en-NG, GHS → en-GH, etc.)
 *   3. Default: "en-US"
 *
 * Usage:
 *   - Server-side: pass the entitySettings row or entityId
 *   - Client-side: pass the settings from the tRPC query
 */

/** BCP 47 locale codes supported by the platform. */
export const SUPPORTED_LOCALES = [
  "en-US",
  "en-GB",
  "en-GM",
  "en-NG",
  "en-GH",
  "en-KE",
  "fr-SN",
  "fr-CI",
  "fr-CM",
  "ar-DZ",
  "sw-KE",
  "pt-BR",
  "es-MX",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale when no entity setting is configured. */
const DEFAULT_LOCALE: SupportedLocale = "en-US";

/** Currency → locale heuristic for auto-detection. */
const CURRENCY_LOCALE_MAP: Record<string, SupportedLocale> = {
  USD: "en-US",
  EUR: "en-GB",
  GBP: "en-GB",
  NGN: "en-NG",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-US",
  GMD: "en-GM",
  XOF: "fr-SN",
  XAF: "fr-CM",
  UGX: "en-KE",
  TZS: "en-KE",
  RWF: "en-US",
  ETB: "en-US",
  CAD: "en-US",
  AUD: "en-US",
  JPY: "en-US",
  CNY: "en-US",
  INR: "en-US",
  BRL: "pt-BR",
};

/**
 * Resolve the BCP 47 locale for an entity.
 *
 * @param settings - The entity_settings row (or null/undefined)
 * @param baseCurrency - The entity's base currency code (optional, used for heuristic)
 * @returns A valid BCP 47 locale string
 */
export function getEntityLocale(
  settings: { fiscalLocaleOverrides?: Record<string, unknown> | null } | null | undefined,
  baseCurrency?: string | null,
): SupportedLocale {
  // 1. Explicit locale from entity settings
  const locale = settings?.fiscalLocaleOverrides?.locale;
  if (locale && typeof locale === "string" && isSupportedLocale(locale)) {
    return locale;
  }

  // 2. Currency-based heuristic
  if (baseCurrency && CURRENCY_LOCALE_MAP[baseCurrency]) {
    return CURRENCY_LOCALE_MAP[baseCurrency];
  }

  // 3. Default
  return DEFAULT_LOCALE;
}

/**
 * Create a NumberFormat instance for the entity's locale.
 * Use this instead of `new Intl.NumberFormat("en-GM")`.
 */
export function createEntityNumberFormat(
  settings: { fiscalLocaleOverrides?: Record<string, unknown> | null } | null | undefined,
  baseCurrency?: string | null,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return new Intl.NumberFormat(getEntityLocale(settings, baseCurrency), options);
}

/**
 * Create a currency formatter for the entity.
 */
export function createEntityCurrencyFormat(
  settings: { fiscalLocaleOverrides?: Record<string, unknown> | null } | null | undefined,
  baseCurrency?: string | null,
  currency?: string,
): Intl.NumberFormat {
  return new Intl.NumberFormat(getEntityLocale(settings, baseCurrency), {
    style: "currency",
    currency: currency ?? baseCurrency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number using the entity's locale.
 * Drop-in replacement for `new Intl.NumberFormat("en-GM").format(value)`.
 */
export function formatNumberForEntity(
  value: number,
  settings: { fiscalLocaleOverrides?: Record<string, unknown> | null } | null | undefined,
  baseCurrency?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  return createEntityNumberFormat(settings, baseCurrency, options).format(value);
}

/** Type guard: check if a string is a supported locale. */
function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
