// ─── Configurable Tax Engine ────────────────────────────────────────────────
//
// The single computation path for every tax rule a user can configure:
//   rate        — flat percentage (VAT, sales tax)
//   fixed       — fixed amount per transaction (excise, stamp duty)
//   bands       — progressive/edge brackets (PAYE, corporate)
//   conditional — rate depends on context (product category, customer type,
//                 amount threshold, location)
//   split       — employer/employee contributions (social security, pension)
//
// Everything is pure and data-driven: a rule is data, so users can create
// taxes for jurisdictions we don't ship, edit built-in rates when laws
// change, and add conditional or per-person variants — all without code.
//
// This engine is deliberately free of DB/entity concerns so the payroll
// pipeline, the tax-compliance pipeline, and the Settings UI all compute
// through the same code path. Money is kept as plain numbers (cents-scale
// inputs) and results are rounded to 2 decimals like every other amount in
// the ledger.

import type { TaxRateConfig } from "@xenboox/db/schema/tax-compliance";

export type { TaxRateConfig };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RateOverrideInput {
  taxRuleId: string;
  appliesToType:
    | "customer"
    | "vendor"
    | "employee"
    | "product_category"
    | "other";
  appliesToId: string;
  rate?: number | null;
  fixedAmount?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export interface TaxContext {
  /** Optional per-person / per-item rate override lookup. */
  overrides?: RateOverrideInput[];
  taxRuleId?: string;
  appliesToType?:
    | "customer"
    | "vendor"
    | "employee"
    | "product_category"
    | "other";
  appliesToId?: string;
  /** Conditional-rule context values. */
  productCategory?: string;
  customerType?: string;
  location?: string;
  /** Transaction date (YYYY-MM-DD) for effective-dating overrides. */
  date?: string;
}

export interface TaxResult {
  amount: number;
  /** How the amount was derived (flat/fixed/bands/conditional/override). */
  method: "flat" | "fixed" | "bands" | "conditional" | "override";
  /** Effective rate used (when applicable). */
  effectiveRate?: number;
  /** Bands that contributed, for transparent breakdowns. */
  breakdown?: Array<{
    from: number;
    to: number | null;
    rate: number;
    amount: number;
  }>;
}

export interface SplitResult {
  employee: number;
  employer: number;
  total: number;
}

// Half-up money rounding with a scaled-delta guard so floating-point
// products like 250.5 * 0.15 = 37.574999… round to 37.58, not 37.57.
const round2 = (n: number): number => Math.round(n * 100 + 1e-9) / 100;

// ─── Band computation ───────────────────────────────────────────────────────

function computeBands(
  amount: number,
  bands: NonNullable<TaxRateConfig["bands"]>,
): TaxResult {
  let tax = 0;
  const breakdown: TaxResult["breakdown"] = [];

  for (const band of bands) {
    if (amount <= band.from) continue;
    const taxableInBand = Math.min(
      amount - band.from,
      band.to !== null ? band.to - band.from : Number.POSITIVE_INFINITY,
    );
    if (taxableInBand <= 0) continue;
    const bandTax = taxableInBand * band.rate;
    tax += bandTax;
    breakdown.push({
      from: band.from,
      to: band.to,
      rate: band.rate,
      amount: round2(bandTax),
    });
    if (band.to !== null && amount <= band.to) break;
  }

  return { amount: round2(tax), method: "bands", breakdown };
}

// ─── Conditional computation ────────────────────────────────────────────────

function conditionMatches(
  cond: NonNullable<TaxRateConfig["conditions"]>[number],
  ctx: TaxContext,
): boolean {
  let actual: string | number | undefined;
  switch (cond.field) {
    case "product_category":
      actual = ctx.productCategory;
      break;
    case "customer_type":
      actual = ctx.customerType;
      break;
    case "location":
      actual = ctx.location;
      break;
    case "amount":
      // amount conditions are handled by the caller with the numeric amount
      return false;
    default:
      actual = (ctx as Record<string, unknown>)[cond.field] as
        | string
        | number
        | undefined;
  }

  switch (cond.operator) {
    case "eq":
      return actual !== undefined && actual === cond.value;
    case "neq":
      return actual !== undefined && actual !== cond.value;
    case "in": {
      const list = Array.isArray(cond.value) ? cond.value : [cond.value];
      return actual !== undefined && list.includes(actual);
    }
    case "gte":
      return typeof actual === "number" && actual >= Number(cond.value);
    case "lte":
      return typeof actual === "number" && actual <= Number(cond.value);
    default:
      return false;
  }
}

function computeConditional(
  config: TaxRateConfig,
  amount: number,
  ctx: TaxContext,
): TaxResult {
  const conditions = config.conditions ?? [];

  // Amount-threshold conditions apply to the numeric amount directly.
  for (const cond of conditions) {
    if (cond.field === "amount") {
      let matched = false;
      if (cond.operator === "gte" && amount >= Number(cond.value))
        matched = true;
      if (cond.operator === "lte" && amount <= Number(cond.value))
        matched = true;
      if (cond.operator === "eq" && amount === Number(cond.value))
        matched = true;
      if (matched) {
        const tax =
          cond.fixedAmount !== undefined
            ? cond.fixedAmount
            : amount * cond.rate;
        return {
          amount: round2(tax),
          method: "conditional",
          effectiveRate: cond.rate,
        };
      }
    }
  }

  // Context conditions (category, customer type, location) pick a rate.
  for (const cond of conditions) {
    if (cond.field === "amount") continue;
    if (conditionMatches(cond, ctx)) {
      const tax =
        cond.fixedAmount !== undefined ? cond.fixedAmount : amount * cond.rate;
      return {
        amount: round2(tax),
        method: "conditional",
        effectiveRate: cond.rate,
      };
    }
  }

  // Default rate when nothing matches.
  const defaultRate = config.rate ?? 0;
  const tax = amount * defaultRate;
  return {
    amount: round2(tax),
    method: "conditional",
    effectiveRate: defaultRate,
  };
}

// ─── Override resolution ────────────────────────────────────────────────────

/**
 * Finds a per-person/per-item rate override for this rule and target.
 * Overrides are matched by (taxRuleId, appliesToType, appliesToId) and only
 * honoured when active and effective on the transaction date. A matched
 * override REPLACES the configured rate entirely (the user said "this
 * person pays this rate").
 */
export function resolveRateOverride(params: {
  overrides?: RateOverrideInput[];
  taxRuleId: string;
  appliesToType: TaxContext["appliesToType"];
  appliesToId: string;
  date?: string;
}): RateOverrideInput | null {
  if (!params.overrides || params.overrides.length === 0) return null;

  const date = params.date;
  const match = params.overrides.find((o) => {
    if (o.taxRuleId !== params.taxRuleId) return false;
    if (o.appliesToType !== params.appliesToType) return false;
    if (o.appliesToId !== params.appliesToId) return false;
    if (o.isActive === false) return false;
    if (date) {
      if (o.effectiveFrom && date < o.effectiveFrom) return false;
      if (o.effectiveTo && date > o.effectiveTo) return false;
    }
    return true;
  });

  return match ?? null;
}

// ─── Split contributions ────────────────────────────────────────────────────

/**
 * Employer/employee split contributions (social security, pension, NHIF…).
 * Both shares are computed on the same subject amount, capped by the
 * ceiling. Returns zeros when no split rates are configured (plain taxes
 * have no employer share).
 */
export function calculateSplitContribution(
  config: TaxRateConfig,
  amount: number,
): SplitResult {
  const employeeRate = config.employeeRate ?? 0;
  const employerRate = config.employerRate ?? 0;

  if (employeeRate === 0 && employerRate === 0) {
    return { employee: 0, employer: 0, total: 0 };
  }

  const subjectAmount = config.ceiling
    ? Math.min(amount, config.ceiling)
    : Math.max(0, amount);

  const employee = round2(subjectAmount * employeeRate);
  const employer = round2(subjectAmount * employerRate);
  return { employee, employer, total: round2(employee + employer) };
}

// ─── Main computation ───────────────────────────────────────────────────────

/**
 * Computes the tax amount for a configurable rule against an amount.
 *
 * Resolution order:
 *   1. Per-person/per-item override (if a matching one exists) — replaces
 *      the rule entirely for that target.
 *   2. The rule's own computation type (rate / fixed / bands / conditional).
 *   3. Threshold (exemptions) applies at the top for rate/fixed types.
 *
 * Split contributions are NOT returned here (see calculateSplitContribution).
 */
export function calculateTax(
  config: TaxRateConfig,
  amount: number,
  ctx: TaxContext = {},
): TaxResult {
  const positiveAmount = Math.max(0, amount);

  // 1. Per-person / per-item override wins.
  if (ctx.taxRuleId && ctx.appliesToType && ctx.appliesToId) {
    const override = resolveRateOverride({
      overrides: ctx.overrides,
      taxRuleId: ctx.taxRuleId,
      appliesToType: ctx.appliesToType,
      appliesToId: ctx.appliesToId,
      date: ctx.date,
    });
    if (override) {
      if (override.fixedAmount !== undefined && override.fixedAmount !== null) {
        return {
          amount: round2(Number(override.fixedAmount)),
          method: "override",
        };
      }
      const rate = override.rate ?? config.rate ?? 0;
      return {
        amount: round2(positiveAmount * rate),
        method: "override",
        effectiveRate: rate,
      };
    }
  }

  // 2. Exemption threshold — nothing taxable below it (rate/fixed only).
  // For fixed taxes the threshold is explicit: without one, the fixed
  // charge applies per transaction regardless of amount (e.g. stamp duty).
  if (config.threshold !== undefined && positiveAmount <= config.threshold) {
    return { amount: 0, method: methodFor(config.type) };
  }

  // Ceiling caps the taxable base for rate-type rules.
  const taxableBase = config.ceiling
    ? Math.min(positiveAmount, config.ceiling)
    : positiveAmount;

  switch (config.type) {
    case "rate": {
      const rate = Math.max(0, config.rate ?? 0);
      return {
        amount: round2(taxableBase * rate),
        method: "flat",
        effectiveRate: rate,
      };
    }
    case "fixed": {
      return {
        amount: round2(config.fixedAmount ?? 0),
        method: "fixed",
      };
    }
    case "bands": {
      const result = computeBands(taxableBase, config.bands ?? []);
      return { ...result, method: "bands" };
    }
    case "conditional": {
      return computeConditional(config, taxableBase, ctx);
    }
    default:
      return { amount: 0, method: "flat" };
  }
}

/** Maps a rule type to the TaxResult.method label (rate → flat, etc.). */
function methodFor(type: TaxRateConfig["type"]): TaxResult["method"] {
  switch (type) {
    case "rate":
      return "flat";
    case "fixed":
      return "fixed";
    case "bands":
      return "bands";
    case "conditional":
      return "conditional";
    default:
      return "flat";
  }
}
