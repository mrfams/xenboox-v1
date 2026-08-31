/**
 * Centralized app configuration.
 * Single source of truth for version, name, and other constants.
 * Read from environment variables with sensible defaults.
 */

/**
 * Supported currencies for the platform.
 * Used in create dialogs, settings, and wherever currency selection is needed.
 */
export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR",
  "GMD", "XOF", "XAF", "UGX", "TZS", "RWF", "ETB",
  "CAD", "AUD", "JPY", "CNY", "INR", "BRL",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const APP_CONFIG = {
  /** App version — read from env, falls back to package.json version */
  version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",

  /** App name */
  name: process.env.NEXT_PUBLIC_APP_NAME || "Xenboox",

  /** Default currency — used only when entity currency is unknown */
  defaultCurrency: "USD" as SupportedCurrency,

  /** Max file upload size in bytes (50MB) */
  maxUploadSize: 50 * 1024 * 1024,

  /** Rate limit windows (ms) */
  rateLimits: {
    narrative: {
      perMinute: 3,
      perHour: 10,
      perDay: 50,
    },
  },

  /** Cache TTLs (seconds) */
  cacheTtl: {
    narrative: 600, // 10 minutes
    forecast: 1800, // 30 minutes
    dashboard: 300, // 5 minutes
  },

  /** Max items per page for paginated queries */
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;
