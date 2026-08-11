// ─── Statutory Rule Resolver ────────────────────────────────────────────────
//
// Bridges the user-configured jurisdiction_tax_rules table (written by the
// Settings → Taxes UI) into the StatutoryRule shape the payroll pipeline
// computes with. This is what makes user edits real: when a company bumps
// the SSHFC employer rate or opts to pay the employee's share, payroll picks
// it up here — no code change, no redeploy.
//
// Resolution order per (jurisdiction, rule type):
//   1. The entity's own configured rule (active, effective today), if any.
//   2. The built-in STATUTORY_RULES set as a fallback so payroll keeps
//      working out of the box for every supported country.

import type { TaxRateConfig } from "@xenboox/db/schema/tax-compliance";
import {
  STATUTORY_RULES,
  type Jurisdiction,
  type StatutoryRule,
} from "./payroll-pipeline";

export type { Jurisdiction, StatutoryRule };

/** A jurisdiction_tax_rules row shaped as much as we need for mapping. */
export interface DbTaxRuleRow {
  id: string;
  country: string;
  ruleType:
    | "paye"
    | "social_security"
    | "withholding"
    | "vat"
    | "sales_tax"
    | "corporate"
    | "excise"
    | "property"
    | "capital_gains"
    | "customs"
    | "digital_services"
    | "payroll_tax"
    | "wealth"
    | "environmental"
    | "health"
    | "unemployment"
    | "tourist"
    | "stamp_duty"
    | "gift"
    | "inheritance"
    | "license_fee"
    | "other";
  version: number;
  name: string;
  rateOrBands: TaxRateConfig;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type ConfiguredStatutoryRules = Partial<
  Record<
    Jurisdiction,
    {
      paye?: StatutoryRule;
      socialSecurity?: StatutoryRule;
      withholdingTax?: StatutoryRule;
    }
  >
>;

/**
 * Maps a single DB tax rule row into the payroll StatutoryRule shape.
 * Banded rules map band-for-band; flat rules become a single catch-all band;
 * split contributions (social security) carry employee/employer rates and
 * ceiling. Effective dates are preserved so the pipeline can filter by month.
 */
/** Effective flat rate of a config: components sum, else the flat rate. */
export function effectiveFlatRate(config: TaxRateConfig): number {
  const rate = config.components?.length
    ? config.components.reduce((s, c) => s + c.rate, 0)
    : (config.rate ?? 0);
  return Math.max(0, rate); // mirror the engine's clamp
}

export function mapTaxRuleToStatutory(rule: DbTaxRuleRow): StatutoryRule {
  const config = rule.rateOrBands;
  // DB uses "withholding"; the payroll StatutoryRule uses "withholding_tax".
  const ruleType =
    rule.ruleType === "withholding"
      ? "withholding_tax"
      : (rule.ruleType as StatutoryRule["ruleType"]);

  const bands =
    config.type === "bands" && config.bands && config.bands.length > 0
      ? config.bands.map((b) => ({
          from: b.from,
          to: b.to,
          rate: b.rate,
          cumulative: b.cumulative ?? false,
        }))
      : [
          {
            from: 0,
            to: null,
            rate: effectiveFlatRate(config),
            cumulative: false,
          },
        ];

  return {
    id: rule.id,
    jurisdiction: rule.country as Jurisdiction,
    ruleType,
    name: rule.name,
    bands,
    employeeContributionRate: config.employeeRate,
    employerContributionRate: config.employerRate,
    ceiling: config.ceiling,
    personalRelief: config.threshold,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
  };
}

/**
 * Merges entity-configured rules over the built-in STATUTORY_RULES for a
 * jurisdiction. Configured types win; anything unconfigured (e.g. a country
 * where only PAYE was edited) falls back to the built-in rule so the
 * pipeline never loses a deduction it used to make.
 */
export function mergeConfiguredRules(
  configured: ConfiguredStatutoryRules,
  jurisdiction: Jurisdiction,
): {
  paye: StatutoryRule;
  socialSecurity: StatutoryRule;
  withholdingTax: StatutoryRule;
} {
  const builtin = STATUTORY_RULES[jurisdiction];
  const entityRules = configured[jurisdiction] ?? {};

  return {
    paye: { ...builtin.paye, ...entityRules.paye },
    socialSecurity: {
      ...builtin.socialSecurity,
      ...entityRules.socialSecurity,
    },
    withholdingTax: {
      ...builtin.withholdingTax,
      ...entityRules.withholdingTax,
    },
  };
}

/**
 * Groups DB rule rows into the per-jurisdiction shape the payroll pipeline
 * consumes. Only rules that can drive a payroll statutory deduction are
 * included (paye / social_security / withholding).
 */
export function groupConfiguredRules(
  rows: DbTaxRuleRow[],
): ConfiguredStatutoryRules {
  const result: ConfiguredStatutoryRules = {};

  for (const row of rows) {
    if (
      row.ruleType !== "paye" &&
      row.ruleType !== "social_security" &&
      row.ruleType !== "withholding"
    ) {
      continue;
    }
    const jurisdiction = row.country as Jurisdiction;
    if (!STATUTORY_RULES[jurisdiction]) continue; // unknown/unsupported → skip

    const mapped = mapTaxRuleToStatutory(row);
    const bucket = (result[jurisdiction] ??= {});

    if (mapped.ruleType === "paye") bucket.paye = mapped;
    else if (mapped.ruleType === "social_security")
      bucket.socialSecurity = mapped;
    else if (mapped.ruleType === "withholding_tax")
      bucket.withholdingTax = mapped;
  }

  return result;
}

/**
 * The raw rate configs per (jurisdiction, statutory role) — kept separate from
 * the mapped StatutoryRule shape so the payroll pipeline can evaluate
 * CONDITIONAL rules per employee (e.g. non-citizen social-security rate)
 * before applying them.
 */
export type ConfiguredRawRules = Partial<
  Record<
    Jurisdiction,
    Partial<{
      paye: TaxRateConfig;
      socialSecurity: TaxRateConfig;
      withholding: TaxRateConfig;
    }>
  >
>;

export function groupConfiguredRawConfigs(
  rows: DbTaxRuleRow[],
): ConfiguredRawRules {
  const result: ConfiguredRawRules = {};

  for (const row of rows) {
    if (
      row.ruleType !== "paye" &&
      row.ruleType !== "social_security" &&
      row.ruleType !== "withholding"
    ) {
      continue;
    }
    const jurisdiction = row.country as Jurisdiction;
    if (!STATUTORY_RULES[jurisdiction]) continue;

    const bucket = (result[jurisdiction] ??= {});
    if (row.ruleType === "paye") bucket.paye = row.rateOrBands;
    else if (row.ruleType === "social_security")
      bucket.socialSecurity = row.rateOrBands;
    else if (row.ruleType === "withholding")
      bucket.withholding = row.rateOrBands;
  }

  return result;
}
