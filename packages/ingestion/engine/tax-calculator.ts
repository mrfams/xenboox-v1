/**
 * Tax Calculator Engine
 *
 * Computes taxes (VAT, withholding tax, sales tax, duties) for accounting entries
 * based on document data, entity jurisdiction, and configurable tax rules.
 *
 * This implements Stage 8 of the ingestion pipeline.
 */

import type {
  AccountingTreatment,
  TaxCalculation,
  TaxTreatment,
  IngestionState,
} from "../core/types";

// ─── Tax Rate Configurations ────────────────────────────────────────────────

interface TaxJurisdictionConfig {
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Standard VAT / sales tax rate */
  standardVatRate: number;
  /** Reduced VAT rate for certain goods/services */
  reducedVatRate: number;
  /** Zero-rated categories (e.g., exports) */
  zeroRatedCategories: string[];
  /** Exempt categories (e.g., education, healthcare) */
  exemptCategories: string[];
  /** Withholding tax rate (typically on invoices from non-residents) */
  withholdingTaxRate: number;
  /** Whether input VAT is recoverable */
  inputVatRecoverable: boolean;
}

/**
 * Tax rates by jurisdiction. Extend this as more countries are supported.
 *
 * Sources:
 * - The Gambia: VAT Act 2012, standard rate 15%
 * - Nigeria: VAT Act, standard rate 7.5%
 * - Ghana: VAT Act 2013 (Act 870), standard rate 15% (12.5% VAT + 2.5% NHIL/GETFL)
 * - Senegal: Code Général des Impôts, standard rate 18%
 * - Kenya: VAT Act 2013, standard rate 16%
 */
const JURISDICTION_CONFIGS: Record<string, TaxJurisdictionConfig> = {
  GM: {
    country: "GM",
    standardVatRate: 0.15,
    reducedVatRate: 0.1,
    zeroRatedCategories: ["export", "international_transport", "basic_food"],
    exemptCategories: ["education", "healthcare", "financial_services", "rent"],
    withholdingTaxRate: 0.1,
    inputVatRecoverable: true,
  },
  NG: {
    country: "NG",
    standardVatRate: 0.075,
    reducedVatRate: 0.05,
    zeroRatedCategories: ["export", "basic_food_imports"],
    exemptCategories: ["education", "healthcare", "rent", "transport"],
    withholdingTaxRate: 0.1,
    inputVatRecoverable: true,
  },
  GH: {
    country: "GH",
    standardVatRate: 0.15, // 12.5% VAT + 2.5% NHIL/GETFL
    reducedVatRate: 0.05,
    zeroRatedCategories: ["export", "international_travel"],
    exemptCategories: [
      "education",
      "healthcare",
      "basic_food",
      "water",
      "electricity",
    ],
    withholdingTaxRate: 0.075,
    inputVatRecoverable: true,
  },
  SN: {
    country: "SN",
    standardVatRate: 0.18,
    reducedVatRate: 0.1,
    zeroRatedCategories: ["export", "international_transport"],
    exemptCategories: ["education", "healthcare", "basic_food"],
    withholdingTaxRate: 0.05,
    inputVatRecoverable: true,
  },
  KE: {
    country: "KE",
    standardVatRate: 0.16,
    reducedVatRate: 0.08,
    zeroRatedCategories: ["export", "international_transport"],
    exemptCategories: ["education", "healthcare", "financial_services", "rent"],
    withholdingTaxRate: 0.05,
    inputVatRecoverable: true,
  },
};

// ─── Expense Category Tax Mapping ───────────────────────────────────────────

interface CategoryTaxRule {
  /** Normal VAT treatment for this category */
  vatTreatment: TaxTreatment;
  /** Whether standard or reduced rate applies */
  rateType: "standard" | "reduced" | "zero" | "exempt";
}

const CATEGORY_TAX_RULES: Record<string, CategoryTaxRule> = {
  // Standard-rated goods
  goods: { vatTreatment: "input_vat", rateType: "standard" },
  electronics: { vatTreatment: "input_vat", rateType: "standard" },
  raw_materials: { vatTreatment: "input_vat", rateType: "standard" },
  equipment: { vatTreatment: "input_vat", rateType: "standard" },

  // Reduced-rate items
  basic_food: { vatTreatment: "vat_exempt", rateType: "exempt" },
  medicine: { vatTreatment: "vat_exempt", rateType: "exempt" },

  // Services (output VAT)
  consulting: { vatTreatment: "output_vat", rateType: "standard" },
  professional_services: { vatTreatment: "output_vat", rateType: "standard" },
  software: { vatTreatment: "output_vat", rateType: "standard" },

  // Exports (zero-rated)
  export: { vatTreatment: "vat_zero_rated", rateType: "zero" },

  // Utilities
  rent: { vatTreatment: "vat_exempt", rateType: "exempt" },
  education: { vatTreatment: "vat_exempt", rateType: "exempt" },
  healthcare: { vatTreatment: "vat_exempt", rateType: "exempt" },
  insurance: { vatTreatment: "vat_exempt", rateType: "exempt" },
  financial: { vatTreatment: "vat_exempt", rateType: "exempt" },
  transport: { vatTreatment: "vat_exempt", rateType: "exempt" },
};

// ─── Main Tax Calculator ────────────────────────────────────────────────────

/**
 * Calculate taxes for an accounting entry based on:
 * 1. The document's extracted data (amounts, categories)
 * 2. The accounting treatment (tax treatment type)
 * 3. The entity's jurisdiction (country-based tax rates)
 */
export function calculateTax(
  state: IngestionState,
  treatment: AccountingTreatment,
  jurisdiction?: string,
): TaxCalculation {
  const extractedData = state.extraction.data;
  const totalAmount = (extractedData.totalAmount as number) ?? 0;
  const taxAmount = (extractedData.taxAmount as number) ?? 0;
  const subtotal =
    (extractedData.subtotal as number) ?? totalAmount - taxAmount;
  const lineItems =
    (extractedData.lineItems as Array<Record<string, unknown>>) ?? [];

  // Determine jurisdiction
  const country = jurisdiction ?? inferJurisdiction(extractedData);
  const config = JURISDICTION_CONFIGS[country] ?? JURISDICTION_CONFIGS.GM;

  // Determine the applicable tax treatment
  const taxTreatment = treatment.taxTreatment;

  // Determine the tax rate based on category
  const category = inferExpenseCategoryForTax(extractedData);
  const categoryRule = CATEGORY_TAX_RULES[category];

  let taxableAmount = 0;
  let effectiveRate = 0;
  let calculatedTax = 0;
  let confidence = 1.0;

  switch (taxTreatment) {
    case "input_vat":
      // Recoverable VAT on purchases
      taxableAmount = subtotal;
      effectiveRate =
        categoryRule?.rateType === "reduced"
          ? config.reducedVatRate
          : categoryRule?.rateType === "zero"
            ? 0
            : categoryRule?.rateType === "exempt"
              ? 0
              : config.standardVatRate;

      if (taxAmount > 0) {
        // Use the extracted tax amount if available (e.g., from an invoice)
        calculatedTax = taxAmount;
        effectiveRate = subtotal > 0 ? taxAmount / subtotal : 0;
        confidence = 0.95;
      } else {
        calculatedTax = roundCurrency(taxableAmount * effectiveRate);
        confidence = categoryRule ? 0.85 : 0.6;
      }
      break;

    case "output_vat":
      // Output VAT on sales
      taxableAmount = subtotal;
      effectiveRate = config.standardVatRate;

      if (taxAmount > 0) {
        calculatedTax = taxAmount;
        effectiveRate = subtotal > 0 ? taxAmount / subtotal : 0;
        confidence = 0.95;
      } else {
        calculatedTax = roundCurrency(taxableAmount * effectiveRate);
        confidence = 0.85;
      }
      break;

    case "vat_exempt":
      // No VAT — exempt category
      taxableAmount = 0;
      effectiveRate = 0;
      calculatedTax = 0;
      confidence = 0.9;
      break;

    case "vat_zero_rated":
      // Zero-rated (e.g., exports)
      taxableAmount = subtotal;
      effectiveRate = 0;
      calculatedTax = 0;
      confidence = 0.9;
      break;

    case "withholding_tax":
      taxableAmount = totalAmount;
      effectiveRate = config.withholdingTaxRate;
      calculatedTax = roundCurrency(totalAmount * effectiveRate);
      confidence = 0.85;
      break;

    case "no_tax":
    default:
      taxableAmount = 0;
      effectiveRate = 0;
      calculatedTax = 0;
      confidence = 1.0;
      break;
  }

  return {
    treatment: taxTreatment,
    taxableAmount,
    taxRate: effectiveRate,
    taxAmount: calculatedTax,
    confidence,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Infer the jurisdiction (country) from the extracted document data.
 * Checks currency, country fields, and other locale indicators.
 */
function inferJurisdiction(data: Record<string, unknown>): string {
  const currency = (data.currency as string) ?? "";
  const country = (data.country as string) ?? "";
  const taxId = (data.taxId as string) ?? "";
  const jurisdiction = (data.jurisdiction as string) ?? "";

  // Direct country/jurisdiction field
  if (jurisdiction) return jurisdiction.toUpperCase();
  if (country) return country.toUpperCase();

  // Currency-based inference
  const currencyToCountry: Record<string, string> = {
    GMD: "GM",
    NGN: "NG",
    GHS: "GH",
    XOF: "SN",
    KES: "KE",
    USD: "GM", // Default to Gambia for USD (launch market)
    EUR: "SN", // Default to Senegal for EUR (WAEMU zone)
  };
  if (currencyToCountry[currency.toUpperCase()]) {
    return currencyToCountry[currency.toUpperCase()];
  }

  // Tax ID pattern inference
  if (/^(NG|NG-)/i.test(taxId)) return "NG";
  if (/^(GH|GH-)/i.test(taxId)) return "GH";
  if (/^(KE|KE-)/i.test(taxId)) return "KE";

  // Default to Gambia (launch market)
  return "GM";
}

/**
 * Infer the expense category from extracted data for tax purposes.
 */
function inferExpenseCategoryForTax(data: Record<string, unknown>): string {
  const description = [
    data.description,
    data.merchantName,
    data.category,
    ...((data.lineItems as Array<{ description: string }>)?.map(
      (i) => i.description,
    ) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(export|shipped|overseas|international)/i.test(description))
    return "export";
  if (/(rent|lease|property)/i.test(description)) return "rent";
  if (/(doctor|hospital|clinic|medical|medicine|pharmacy)/i.test(description))
    return "healthcare";
  if (/(school|university|college|training|course)/i.test(description))
    return "education";
  if (/(food|grocery|supermarket)/i.test(description)) return "basic_food";
  if (/(software|subscription|saas|cloud|hosting)/i.test(description))
    return "software";
  if (/(consult|legal|accounting|audit|advisory)/i.test(description))
    return "professional_services";
  if (/(equipment|machine|hardware)/i.test(description)) return "equipment";
  if (/(raw material|component|part)/i.test(description))
    return "raw_materials";
  if (/(insurance|premium)/i.test(description)) return "insurance";
  if (/(transport|freight|logistics|shipping)/i.test(description))
    return "transport";
  if (/(bank|financial|interest|loan)/i.test(description)) return "financial";
  if (/(electronics|computer|phone|laptop)/i.test(description))
    return "electronics";

  return "goods";
}
