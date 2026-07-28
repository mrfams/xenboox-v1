import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import {
  vatCalculations,
  jurisdictionTaxRules,
  taxPackages,
  filingDeadlines,
} from "@xenboox/db/schema";
import type { VatCalculation, FilingPackage, FormatExport } from "./state";

// ─── Calculate VAT ─────────────────────────────────────────────────────────

export async function calculateVat(
  entityId: string,
  period: string,
): Promise<VatCalculation> {
  const existing = await db.query.vatCalculations.findFirst({
    where: and(
      eq(vatCalculations.entityId, entityId),
      eq(vatCalculations.period, period),
    ),
  });

  if (existing) {
    return {
      period: existing.period,
      inputVat: Number(existing.inputVat),
      outputVat: Number(existing.outputVat),
      netPosition: Number(existing.netPosition),
      status: existing.status,
      confidence: existing.status === "filed" ? 0.95 : 0.85,
    };
  }

  return {
    period,
    inputVat: 0,
    outputVat: 0,
    netPosition: 0,
    status: "draft",
    confidence: 0.5,
  };
}

// ─── Prepare Filing Package ────────────────────────────────────────────────

export async function prepareFilingPackage(
  entityId: string,
  jurisdiction: string,
  period: string,
): Promise<FilingPackage> {
  const rules = await db.query.jurisdictionTaxRules.findMany({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      eq(jurisdictionTaxRules.country, jurisdiction),
      eq(jurisdictionTaxRules.status, "active"),
    ),
  });

  const filingType = rules.length > 0 ? rules[0].ruleType : "vat";
  const dueDateRecord = await db.query.filingDeadlines.findFirst({
    where: and(
      eq(filingDeadlines.entityId, entityId),
      eq(filingDeadlines.jurisdiction, jurisdiction),
      eq(filingDeadlines.period, period),
    ),
  });

  return {
    jurisdiction,
    period,
    filingType,
    amount: 0,
    dueDate:
      dueDateRecord?.dueDate ??
      `${period.slice(0, 4)}-${String(Number(period.slice(5, 7)) + 1).padStart(2, "0")}-15`,
    status: "assembling",
    formats: ["json", "csv"],
  };
}

// ─── Export Jurisdiction Format ────────────────────────────────────────────

export async function exportJurisdictionFormat(
  jurisdiction: string,
): Promise<FormatExport> {
  return {
    jurisdiction,
    format: "json",
    content: {
      jurisdiction,
      formatVersion: "1.0",
      fields: ["filingType", "period", "amount", "dueDate", "status"],
    },
    exportedAt: new Date().toISOString(),
  };
}

// ─── Check Jurisdiction Ruleset ────────────────────────────────────────────

export async function checkJurisdictionRuleset(
  entityId: string,
  jurisdiction: string,
): Promise<{
  hasRules: boolean;
  ruleCount: number;
  activeRules: number;
  confidence: number;
}> {
  const rules = await db.query.jurisdictionTaxRules.findMany({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      eq(jurisdictionTaxRules.country, jurisdiction),
    ),
  });

  return {
    hasRules: rules.length > 0,
    ruleCount: rules.length,
    activeRules: rules.filter((r) => r.status === "active").length,
    confidence: rules.length > 0 ? 0.9 : 0.3,
  };
}
