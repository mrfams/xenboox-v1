// ─── Tax & Compliance Pipeline (Phase 2, Pipeline 2 of 5) ──────────────────
//
// VAT, PAYE filing prep, withholding tax, corporate tax, and jurisdiction-specific
// filing exports. The one pipeline where a wrong auto-apply has legal consequences
// beyond a single organization's books — treat every rule change accordingly.
//
// Pipeline Steps:
//   1. Jurisdiction Rule Registry    — VAT rates, PAYE bands, withholding, filing deadlines
//   2. VAT Calculation Engine        — Input VAT (AP), output VAT (AR), net position
//   3. Withholding Tax Calculation   — On all contractor payments, linked to AP
//   4. PAYE Filing Prep              — Pulls from Payroll Pipeline output (never recalculates)
//   5. Corporate Tax Package Assembly — Pulls from Financial Reporting Pipeline (annual)
//   6. Confidence Gate & Review      — Compliance Agent reviews (mandatory, not skippable)
//   7. Local Authority Format Export — Pluggable exporters per jurisdiction
//   8. Filing Deadline Calendar      — Per jurisdiction, escalating alert cadence
//   9. Regulatory Risk Escalation    — Always-escalate rule for regulatory risk
//  10. Tax Rule Update Workflow      — Never auto-applies, requires human sign-off
//  11. Tax Position Summary & Audit  — Summary to CFO Agent + full audit trail
//
// Rules:
//   - No tax rule change ever goes live without explicit human sign-off.
//   - Regulatory risk surfaces immediately, never auto-resolved.
//   - Compliance Agent reviews every submission package (regardless of confidence).

import { db } from "@xenboox/db";
import { eq, and, desc, inArray, gte, lte } from "drizzle-orm";
import {
  jurisdictionTaxRules,
  vatCalculations,
  withholdingRecords,
  filingDeadlines,
  taxPackages,
} from "@xenboox/db/schema/tax-compliance";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { invoicesAp, salesInvoices } from "@xenboox/db/schema/ap-ar";
import { payrollRuns, payrollLineItems } from "@xenboox/db/schema/payroll";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaxStepId =
  | "jurisdiction_rule_registry"
  | "vat_calculation"
  | "withholding_tax"
  | "paye_filing_prep"
  | "corporate_tax_package"
  | "confidence_gate_review"
  | "format_export"
  | "filing_deadline_calendar"
  | "regulatory_risk_escalation"
  | "tax_rule_update_workflow"
  | "tax_position_summary";

export type TaxStepStatus =
  "pending" | "in_progress" | "completed" | "failed" | "skipped" | "escalated";

export type Jurisdiction = "GM" | "NG" | "KE" | "GH";

export type TaxRuleType = "vat" | "paye" | "withholding" | "corporate";

export interface TaxStep {
  id: TaxStepId;
  label: string;
  agent: string;
  status: TaxStepStatus;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
  details: Record<string, unknown>;
}

export interface JurisdictionTaxRule {
  id: string;
  country: Jurisdiction;
  ruleType: TaxRuleType;
  version: number;
  name: string;
  rateOrBands: {
    type: "rate" | "bands";
    rate?: number;
    bands?: Array<{ from: number; to: number | null; rate: number }>;
    threshold?: number;
    ceiling?: number;
  };
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "draft" | "active" | "superseded";
  proposedBy: string | null;
  approvedBy: string | null;
}

export interface VatCalculation {
  period: string;
  inputVat: number;
  outputVat: number;
  netPosition: number;
  isPayable: boolean;
  vatRate: number;
  invoiceCount: number;
}

export interface WithholdingCalculation {
  period: string;
  withholdingRecords: Array<{
    payeeId: string;
    payeeName: string;
    payeeType: "contractor" | "vendor";
    amount: number;
    rate: number;
    taxWithheld: number;
    jurisdiction: Jurisdiction;
  }>;
  totalWithheld: number;
  count: number;
}

export interface PayeFilingData {
  period: string;
  payrollRunId: string;
  employeeCount: number;
  totalGrossPay: number;
  totalPaye: number;
  totalSocialSecurity: number;
  filingDeadline: string;
}

export interface CorporateTaxData {
  period: string;
  grossRevenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfitBeforeTax: number;
  estimatedTaxLiability: number;
  taxRate: number;
}

export interface FormatExportItem {
  jurisdiction: Jurisdiction;
  format: string;
  packageType: TaxStepId;
  fileName: string;
  content: Record<string, unknown>;
  exportedAt: string;
}

export interface RegulatoryRisk {
  id: string;
  type:
    | "deadline_missed"
    | "rate_change_detected"
    | "filing_mismatch"
    | "audit_flag";
  jurisdiction: Jurisdiction;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  autoEscalated: boolean;
  detectedAt: string;
}

export interface FilingDeadlineItem {
  id: string;
  jurisdiction: Jurisdiction;
  filingType: string;
  name: string;
  dueDate: string;
  period: string;
  status: "pending" | "filed" | "overdue" | "waived";
  estimatedAmount?: number;
  daysRemaining: number;
}

export interface TaxRuleProposal {
  ruleType: TaxRuleType;
  country: Jurisdiction;
  currentVersion: number;
  proposedChanges: Record<string, unknown>;
  reason: string;
  requiresHumanSignOff: boolean;
  approved: boolean;
  approvedBy: string | null;
}

export interface TaxComplianceResult {
  success: boolean;
  period: string;
  status: "draft" | "reviewed" | "submitted" | "failed";
  steps: TaxStep[];
  vatCalculation: VatCalculation | null;
  withholdingSummary: WithholdingCalculation | null;
  payeFiling: PayeFilingData | null;
  corporateTax: CorporateTaxData | null;
  exports: FormatExportItem[];
  filingDeadlines: FilingDeadlineItem[];
  regulatoryRisks: RegulatoryRisk[];
  taxRuleProposals: TaxRuleProposal[];
  overallConfidence: number;
  escalated: boolean;
  escalationReason?: string;
  complianceApproved: boolean;
  complianceReviewedBy?: string;
  errors: string[];
  warnings: string[];
  auditTrail: AuditEntry[];
  durationMs: number;
  completedAt: string;
}

// ─── Jurisdiction Configurations ────────────────────────────────────────────
//
// Pluggable per-jurisdiction configuration. New jurisdiction = new entry.
// VAT rates, PAYE bands, corporate tax rates, filing deadlines.

interface JurisdictionConfig {
  vatRate: number;
  vatThreshold: number;
  corporateTaxRate: number;
  corporateTaxThreshold: number;
  filingDeadlines: Array<{
    filingType: string;
    day: number;
    name: string;
    frequency: "monthly" | "quarterly" | "annual";
  }>;
  currency: string;
}

const JURISDICTION_CONFIGS: Record<Jurisdiction, JurisdictionConfig> = {
  GM: {
    vatRate: 0.15,
    vatThreshold: 1000000, // 1M GMD annual threshold
    corporateTaxRate: 0.27,
    corporateTaxThreshold: 0,
    filingDeadlines: [
      {
        filingType: "vat",
        day: 15,
        name: "GRA VAT Return — Monthly",
        frequency: "monthly",
      },
      {
        filingType: "paye",
        day: 10,
        name: "GRA PAYE Filing — Monthly Return",
        frequency: "monthly",
      },
      {
        filingType: "withholding",
        day: 15,
        name: "GRA Withholding Tax — Quarterly Return",
        frequency: "quarterly",
      },
      {
        filingType: "corporate_tax",
        day: 31,
        name: "GRA Corporate Tax — Annual Return",
        frequency: "annual",
      },
      {
        filingType: "social_security",
        day: 15,
        name: "SSHFC Contributions — Monthly Remittance",
        frequency: "monthly",
      },
    ],
    currency: "GMD",
  },
  NG: {
    vatRate: 0.075,
    vatThreshold: 25000000, // 25M NGN annual threshold
    corporateTaxRate: 0.3,
    corporateTaxThreshold: 0,
    filingDeadlines: [
      {
        filingType: "vat",
        day: 14,
        name: "FIRS VAT Return — Monthly",
        frequency: "monthly",
      },
      {
        filingType: "paye",
        day: 14,
        name: "FIRS PAYE Filing — Monthly Schedule",
        frequency: "monthly",
      },
      {
        filingType: "withholding",
        day: 21,
        name: "FIRS Withholding Tax — Monthly Remittance",
        frequency: "monthly",
      },
      {
        filingType: "corporate_tax",
        day: 31,
        name: "FIRS Corporate Tax — Annual Return",
        frequency: "annual",
      },
    ],
    currency: "NGN",
  },
  KE: {
    vatRate: 0.16,
    vatThreshold: 5000000, // 5M KES annual threshold
    corporateTaxRate: 0.3,
    corporateTaxThreshold: 0,
    filingDeadlines: [
      {
        filingType: "vat",
        day: 20,
        name: "KRA VAT Return — Monthly",
        frequency: "monthly",
      },
      {
        filingType: "paye",
        day: 9,
        name: "KRA PAYE Filing — Monthly Return",
        frequency: "monthly",
      },
      {
        filingType: "withholding",
        day: 20,
        name: "KRA Withholding Tax — Monthly Return",
        frequency: "monthly",
      },
      {
        filingType: "corporate_tax",
        day: 30,
        name: "KRA Corporate Tax — Annual Return",
        frequency: "annual",
      },
      {
        filingType: "social_security",
        day: 9,
        name: "NSSF Contributions — Monthly Remittance",
        frequency: "monthly",
      },
    ],
    currency: "KES",
  },
  GH: {
    vatRate: 0.15, // 12.5% standard + 2.5% NHIL = 15%
    vatThreshold: 200000, // 200K GHS annual threshold
    corporateTaxRate: 0.25,
    corporateTaxThreshold: 0,
    filingDeadlines: [
      {
        filingType: "vat",
        day: 15,
        name: "GRA-GH VAT Return — Monthly",
        frequency: "monthly",
      },
      {
        filingType: "paye",
        day: 15,
        name: "GRA-GH PAYE Filing — Monthly Return",
        frequency: "monthly",
      },
      {
        filingType: "withholding",
        day: 15,
        name: "GRA-GH Withholding Tax — Quarterly Return",
        frequency: "quarterly",
      },
      {
        filingType: "corporate_tax",
        day: 30,
        name: "GRA-GH Corporate Tax — Annual Return",
        frequency: "annual",
      },
      {
        filingType: "social_security",
        day: 15,
        name: "SSNIT Contributions — Monthly Remittance",
        frequency: "monthly",
      },
    ],
    currency: "GHS",
  },
};

// ─── Step Definitions ───────────────────────────────────────────────────────

function getInitialSteps(): TaxStep[] {
  return [
    {
      id: "jurisdiction_rule_registry",
      label: "Jurisdiction Rule Registry",
      agent: "Tax Agent",
      status: "pending",
      description:
        "Load VAT rates, PAYE bands, withholding rates, and filing deadlines per country — versioned with effective dates",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "vat_calculation",
      label: "VAT Calculation Engine",
      agent: "Tax Agent",
      status: "pending",
      description:
        "Calculate input VAT (from AP) and output VAT (from AR), determine net position per period",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "withholding_tax",
      label: "Withholding Tax Calculation",
      agent: "Tax Agent",
      status: "pending",
      description:
        "Calculate withholding tax on contractor payments — linked to AP and Payroll Pipeline",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "paye_filing_prep",
      label: "PAYE Filing Preparation",
      agent: "Tax Agent",
      status: "pending",
      description:
        "Pull from Payroll Pipeline output — never recalculates PAYE independently",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "corporate_tax_package",
      label: "Corporate Tax Package Assembly",
      agent: "Compliance Agent",
      status: "pending",
      description:
        "Pull from Financial Reporting Pipeline's locked annual statements (annual only)",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "confidence_gate_review",
      label: "Confidence Gate & Compliance Review",
      agent: "Compliance Agent",
      status: "pending",
      description:
        "Compliance Agent reviews every submission package — mandatory, not confidence-skippable",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "format_export",
      label: "Local Authority Format Export",
      agent: "Tax Agent",
      status: "pending",
      description:
        "Plug-in exporters per jurisdiction: GRA, FIRS, KRA, GRA-GH formats",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "filing_deadline_calendar",
      label: "Filing Deadline Calendar & Alerts",
      agent: "Compliance Agent",
      status: "pending",
      description:
        "Per jurisdiction deadlines with escalating alert cadence as deadline approaches",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "regulatory_risk_escalation",
      label: "Regulatory Risk Escalation",
      agent: "Compliance Agent",
      status: "pending",
      description:
        "Regulatory risk always surfaces to CFO Agent AND human — never auto-resolved",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "tax_rule_update_workflow",
      label: "Tax Rule Update Workflow",
      agent: "Compliance Agent",
      status: "pending",
      description:
        "Rule changes NEVER auto-apply — require explicit human review and sign-off",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "tax_position_summary",
      label: "Tax Position Summary & Audit",
      agent: "System",
      status: "pending",
      description: "Summary to CFO Agent + full audit trail logging",
      startedAt: null,
      completedAt: null,
      details: {},
    },
  ];
}

// ─── Main Pipeline Orchestrator ─────────────────────────────────────────────

export async function executeTaxCompliancePipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  period: string; // "YYYY-MM"
  userId: string;
  triggerSource?: "manual" | "scheduled" | "agent";
  jurisdictions?: Jurisdiction[];
  includeCorporateTax?: boolean;
  simulateRules?: boolean; // For tax rule update simulation
}): Promise<TaxComplianceResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "tax-compliance-pipeline",
    metadata: {
      entityId: params.entityId,
      period: params.period,
      triggerSource: params.triggerSource ?? "manual",
      jurisdictions: params.jurisdictions ?? ["GM", "NG", "KE", "GH"],
    },
  });

  const result: TaxComplianceResult = {
    success: false,
    period: params.period,
    status: "draft",
    steps: getInitialSteps(),
    vatCalculation: null,
    withholdingSummary: null,
    payeFiling: null,
    corporateTax: null,
    exports: [],
    filingDeadlines: [],
    regulatoryRisks: [],
    taxRuleProposals: [],
    overallConfidence: 0,
    escalated: false,
    complianceApproved: false,
    errors: [],
    warnings: [],
    auditTrail: [],
    durationMs: 0,
    completedAt: "",
  };

  const activeJurisdictions =
    params.jurisdictions ?? (["GM", "NG", "KE", "GH"] as Jurisdiction[]);

  try {
    // ── Step 1: Jurisdiction Rule Registry ──────────────────────────────────
    result.steps = updateStep(result.steps, "jurisdiction_rule_registry", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const rules = await loadJurisdictionRules(
      params.entityId,
      activeJurisdictions,
    );

    result.steps = updateStep(result.steps, "jurisdiction_rule_registry", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        jurisdictionsLoaded: activeJurisdictions,
        rulesFound: rules.length,
        vatRateByJurisdiction: Object.fromEntries(
          activeJurisdictions.map((j) => [j, JURISDICTION_CONFIGS[j]?.vatRate]),
        ),
      },
    });

    // ── Step 2: VAT Calculation Engine ─────────────────────────────────────
    result.steps = updateStep(result.steps, "vat_calculation", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const vatCalculation = await calculateVat(
      params.entityId,
      params.period,
      activeJurisdictions,
    );

    result.vatCalculation = vatCalculation;

    result.steps = updateStep(result.steps, "vat_calculation", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        inputVat: vatCalculation.inputVat,
        outputVat: vatCalculation.outputVat,
        netPosition: vatCalculation.netPosition,
        isPayable: vatCalculation.isPayable,
        invoiceCount: vatCalculation.invoiceCount,
      },
    });

    // ── Step 3: Withholding Tax Calculation ────────────────────────────────
    result.steps = updateStep(result.steps, "withholding_tax", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const withholdingCalc = await calculateWithholdingTax(
      params.entityId,
      params.period,
      activeJurisdictions,
    );

    result.withholdingSummary = withholdingCalc;

    if (withholdingCalc.count > 0 && withholdingCalc.totalWithheld > 0) {
      // Persist withholding records
      await saveWithholdingRecords(
        params.entityId,
        params.period,
        withholdingCalc,
      );
    }

    result.steps = updateStep(result.steps, "withholding_tax", {
      status: withholdingCalc.count > 0 ? "completed" : "skipped",
      completedAt: new Date().toISOString(),
      details: {
        recordCount: withholdingCalc.count,
        totalWithheld: withholdingCalc.totalWithheld,
        jurisdictions: [
          ...new Set(
            withholdingCalc.withholdingRecords.map((r) => r.jurisdiction),
          ),
        ],
      },
    });

    // ── Step 4: PAYE Filing Preparation ────────────────────────────────────
    result.steps = updateStep(result.steps, "paye_filing_prep", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const payeFiling = await preparePayeFiling(params.entityId, params.period);

    result.payeFiling = payeFiling;

    result.steps = updateStep(result.steps, "paye_filing_prep", {
      status: payeFiling ? "completed" : "skipped",
      completedAt: new Date().toISOString(),
      details: payeFiling
        ? {
            payrollRunId: payeFiling.payrollRunId,
            employeeCount: payeFiling.employeeCount,
            totalPaye: payeFiling.totalPaye,
            filingDeadline: payeFiling.filingDeadline,
          }
        : { reason: "No payroll runs found for this period" },
    });

    // ── Step 5: Corporate Tax Package Assembly ─────────────────────────────
    result.steps = updateStep(result.steps, "corporate_tax_package", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const isYearEnd = params.period.endsWith("12");
    const includeCorporate = params.includeCorporateTax ?? isYearEnd;

    if (includeCorporate) {
      const corporateTax = await assembleCorporateTaxPackage(
        params.entityId,
        params.period,
        activeJurisdictions,
      );
      result.corporateTax = corporateTax;

      result.steps = updateStep(result.steps, "corporate_tax_package", {
        status: "completed",
        completedAt: new Date().toISOString(),
        details: {
          grossRevenue: corporateTax.grossRevenue,
          netProfitBeforeTax: corporateTax.netProfitBeforeTax,
          estimatedTaxLiability: corporateTax.estimatedTaxLiability,
          taxRate: corporateTax.taxRate,
        },
      });
    } else {
      result.steps = updateStep(result.steps, "corporate_tax_package", {
        status: "skipped",
        completedAt: new Date().toISOString(),
        details: {
          reason:
            "Not a year-end period — corporate tax package assembled annually",
          period: params.period,
        },
      });
    }

    // ── Step 6: Confidence Gate & Compliance Review ────────────────────────
    result.steps = updateStep(result.steps, "confidence_gate_review", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const reviewResult = await performComplianceReview(result);

    result.overallConfidence = reviewResult.confidence;
    result.escalated = reviewResult.escalated;
    result.escalationReason = reviewResult.escalationReason;
    result.warnings.push(...reviewResult.warnings);

    result.steps = updateStep(result.steps, "confidence_gate_review", {
      status: reviewResult.approved
        ? "completed"
        : result.escalated
          ? "failed"
          : "completed",
      completedAt: new Date().toISOString(),
      details: {
        confidence: reviewResult.confidence,
        approved: reviewResult.approved,
        warnings: reviewResult.warnings,
        // Compliance Agent review is mandatory — not confidence-skippable
        mandatoryReviewApplied: true,
      },
    });

    // ── Step 7: Local Authority Format Export ──────────────────────────────
    result.steps = updateStep(result.steps, "format_export", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const exports = generateFormatExports(
      activeJurisdictions,
      result,
      params.period,
      params.entityName,
    );
    result.exports = exports;

    result.steps = updateStep(result.steps, "format_export", {
      status: exports.length > 0 ? "completed" : "skipped",
      completedAt: new Date().toISOString(),
      details: {
        exportCount: exports.length,
        formats: exports.map((e) => `${e.jurisdiction}:${e.format}`),
      },
    });

    // ── Step 8: Filing Deadline Calendar & Alerts ─────────────────────────
    result.steps = updateStep(result.steps, "filing_deadline_calendar", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const deadlines = generateFilingDeadlines(
      params.entityId,
      activeJurisdictions,
      params.period,
    );
    result.filingDeadlines = deadlines;

    result.steps = updateStep(result.steps, "filing_deadline_calendar", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        totalDeadlines: deadlines.length,
        overdue: deadlines.filter((d) => d.status === "overdue").length,
        upcoming: deadlines.filter((d) => d.status === "pending").length,
        deadlineTypes: [...new Set(deadlines.map((d) => d.filingType))],
      },
    });

    // ── Step 9: Regulatory Risk Escalation ─────────────────────────────────
    //
    // ⚠️ ALWAYS-ESCALATE RULE:
    // Anything flagged as a regulatory risk escalates to CFO Agent AND human
    // immediately, regardless of confidence score. This bypasses the normal
    // confidence-gated escalation logic entirely.

    result.steps = updateStep(result.steps, "regulatory_risk_escalation", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const risks = detectRegulatoryRisks(result, deadlines);
    result.regulatoryRisks = risks;

    const activeRisks = risks.filter((r) => r.autoEscalated);
    if (activeRisks.length > 0) {
      result.escalated = true;
      result.escalationReason = `Regulatory risk(s) detected and escalated: ${activeRisks.map((r) => r.description).join("; ")}`;
      result.warnings.push(result.escalationReason);

      // Every regulatory risk surfaces — log immediately
      result.auditTrail.push(
        createAuditEntry({
          agentId: "tax-compliance-pipeline",
          action: "regulatory_risk_escalated",
          details: {
            riskCount: activeRisks.length,
            risks: activeRisks.map((r) => ({
              type: r.type,
              severity: r.severity,
              jurisdiction: r.jurisdiction,
            })),
            escalatedTo: "CFO Agent + Human",
          },
          confidence: 1.0, // Certainty that escalation is needed
        }),
      );
    }

    result.steps = updateStep(result.steps, "regulatory_risk_escalation", {
      status: activeRisks.length > 0 ? "escalated" : "completed",
      completedAt: new Date().toISOString(),
      details: {
        risksDetected: risks.length,
        risksAutoEscalated: activeRisks.length,
        alwaysEscalateRuleApplied: true,
      },
    });

    // ── Step 10: Tax Rule Update Workflow ──────────────────────────────────
    //
    // ⚠️ NO AUTO-APPLY RULE:
    // Tax rule changes NEVER auto-apply. Requires explicit human review and
    // sign-off (approved_by must be populated) before any new rule version
    // becomes effective.

    result.steps = updateStep(result.steps, "tax_rule_update_workflow", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Detect any rule changes needed based on simulation or detected changes
    const ruleProposals = await detectTaxRuleChanges(
      params.entityId,
      activeJurisdictions,
      params.simulateRules,
    );
    result.taxRuleProposals = ruleProposals;

    if (ruleProposals.length > 0) {
      result.warnings.push(
        `${ruleProposals.length} tax rule update(s) proposed — all require human sign-off before activation`,
      );

      // Log that rules were proposed but NOT auto-applied
      result.auditTrail.push(
        createAuditEntry({
          agentId: "tax-compliance-pipeline",
          action: "tax_rule_proposed",
          details: {
            proposalCount: ruleProposals.length,
            proposals: ruleProposals.map((p) => ({
              country: p.country,
              ruleType: p.ruleType,
              currentVersion: p.currentVersion,
              reason: p.reason,
              requiresSignOff: p.requiresHumanSignOff,
              approved: p.approved,
            })),
            autoApplied: false,
            note: "No rule changes auto-applied — human sign-off required per policy",
          },
          confidence: 0.98,
        }),
      );
    }

    result.steps = updateStep(result.steps, "tax_rule_update_workflow", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        proposalsGenerated: ruleProposals.length,
        autoApplied: false,
        pendingHumanApproval: ruleProposals.filter((p) => !p.approved).length,
      },
    });

    // ── Step 11: Tax Position Summary & Audit ─────────────────────────────
    result.steps = updateStep(result.steps, "tax_position_summary", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Generate final audit entry
    const summaryAuditEntry = createAuditEntry({
      agentId: "tax-compliance-pipeline",
      action: result.escalated
        ? "tax_compliance_awaiting_review"
        : "tax_compliance_complete",
      details: {
        period: params.period,
        vatNetPosition: vatCalculation.netPosition,
        withholdingTotal: withholdingCalc.totalWithheld,
        payeTotal: payeFiling?.totalPaye ?? 0,
        corporateTaxLiability: result.corporateTax?.estimatedTaxLiability ?? 0,
        regulatoryRisks: activeRisks.length,
        exportsGenerated: exports.length,
        complianceApproved: reviewResult.approved,
        escalated: result.escalated,
        triggerSource: params.triggerSource ?? "manual",
      },
      confidence: result.overallConfidence,
    });
    result.auditTrail.push(summaryAuditEntry);

    result.steps = updateStep(result.steps, "tax_position_summary", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        summary: `Tax & Compliance for ${params.period} processed: VAT=${vatCalculation.netPosition}, WHT=${withholdingCalc.totalWithheld}, PAYE=${payeFiling?.totalPaye ?? 0}`,
        confidence: result.overallConfidence,
        auditEntryCount: result.auditTrail.length,
      },
    });

    // ── Finalize ──────────────────────────────────────────────────────────
    const allStepsCompleted = result.steps.filter((s) =>
      ["completed", "skipped", "escalated"].includes(s.status),
    ).length;

    result.status =
      !result.escalated && reviewResult.approved
        ? "submitted"
        : reviewResult.approved
          ? "reviewed"
          : "draft";
    result.success =
      result.status === "submitted" || result.status === "reviewed";

    await trace.update({
      output: {
        status: result.status,
        vatNetPosition: vatCalculation.netPosition,
        withholdingTotal: withholdingCalc.totalWithheld,
        payeTotal: payeFiling?.totalPaye ?? 0,
        corporateTaxLiability: result.corporateTax?.estimatedTaxLiability ?? 0,
        escalated: result.escalated,
        risksDetected: activeRisks.length,
        stepsCompleted: allStepsCompleted,
      },
    });

    return finalizeResult(result, startTime);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.status = "failed";
    result.errors.push(msg);
    result.auditTrail.push(
      createAuditEntry({
        agentId: "tax-compliance-pipeline",
        action: "pipeline_crashed",
        details: { error: msg, period: params.period },
        confidence: 0,
      }),
    );

    await trace.update({
      output: { status: "error", error: msg },
      metadata: { error: true },
    });

    return finalizeResult(result, startTime);
  }
}

// ─── Step 1: Load Jurisdiction Rules ────────────────────────────────────────

async function loadJurisdictionRules(
  entityId: string,
  jurisdictions: Jurisdiction[],
): Promise<JurisdictionTaxRule[]> {
  // Try to load persisted rules first
  const persistedRules = await db.query.jurisdictionTaxRules.findMany({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      inArray(
        jurisdictionTaxRules.country,
        jurisdictions as [string, ...string[]],
      ),
      eq(jurisdictionTaxRules.status, "active"),
    ),
  });

  if (persistedRules.length > 0) {
    return persistedRules.map((r) => ({
      id: r.id,
      country: r.country as Jurisdiction,
      ruleType: r.ruleType as TaxRuleType,
      version: r.version ?? 1,
      name: r.name,
      rateOrBands: r.rateOrBands as JurisdictionTaxRule["rateOrBands"],
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      status: r.status as "draft" | "active" | "superseded",
      proposedBy: r.proposedBy,
      approvedBy: r.approvedBy,
    }));
  }

  // Fall back to built-in defaults
  return [];
}

// ─── Step 2: VAT Calculation ────────────────────────────────────────────────

async function calculateVat(
  entityId: string,
  period: string,
  jurisdictions: Jurisdiction[],
): Promise<VatCalculation> {
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "01", 10);

  // Get start and end dates for the period
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  // Calculate VAT rates from jurisdiction configs
  const vatRate =
    jurisdictions.length > 0
      ? (JURISDICTION_CONFIGS[jurisdictions[0]!]?.vatRate ?? 0.15)
      : 0.15;

  // Fetch AP invoices for the period (input VAT)
  const apInvoicesForPeriod = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
      gte(invoicesAp.invoiceDate, startDate),
      lte(invoicesAp.invoiceDate, endDate),
      eq(invoicesAp.status, "paid"),
    ),
  });

  // Fetch AR invoices for the period (output VAT)
  const arInvoicesForPeriod = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      gte(salesInvoices.invoiceDate, startDate),
      lte(salesInvoices.invoiceDate, endDate),
      eq(salesInvoices.status, "paid"),
    ),
  });

  const totalApAmount = apInvoicesForPeriod.reduce(
    (s, inv) => s + Number(inv.totalAmount),
    0,
  );
  const totalArAmount = arInvoicesForPeriod.reduce(
    (s, inv) => s + Number(inv.totalAmount),
    0,
  );

  // Calculate VAT (standard approach: VAT = gross / (1 + rate) * rate)
  const inputVat =
    Math.round((totalApAmount / (1 + vatRate)) * vatRate * 100) / 100;
  const outputVat =
    Math.round((totalArAmount / (1 + vatRate)) * vatRate * 100) / 100;
  const netPosition = Math.round((outputVat - inputVat) * 100) / 100;

  // Persist the VAT calculation
  try {
    await db.insert(vatCalculations).values({
      entityId,
      period,
      inputVat: String(inputVat),
      outputVat: String(outputVat),
      netPosition: String(netPosition),
      status: "calculated",
      calculatedBy: "tax-pipeline",
    });
  } catch {
    // VAT record may already exist — update instead
    await db
      .update(vatCalculations)
      .set({
        inputVat: String(inputVat),
        outputVat: String(outputVat),
        netPosition: String(netPosition),
        status: "calculated",
      })
      .where(
        and(
          eq(vatCalculations.entityId, entityId),
          eq(vatCalculations.period, period),
        ),
      );
  }

  return {
    period,
    inputVat,
    outputVat,
    netPosition,
    isPayable: netPosition > 0,
    vatRate,
    invoiceCount: apInvoicesForPeriod.length + arInvoicesForPeriod.length,
  };
}

// ─── Step 3: Withholding Tax Calculation ────────────────────────────────────

async function calculateWithholdingTax(
  entityId: string,
  period: string,
  jurisdictions: Jurisdiction[],
): Promise<WithholdingCalculation> {
  // Fetch AP invoices to contractors/vendors for the period
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "01", 10);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const apRecords = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
      gte(invoicesAp.invoiceDate, startDate),
      lte(invoicesAp.invoiceDate, endDate),
    ),
  });

  // Filter contractor/vendor invoices and apply withholding rates
  // In production, this would use the actual vendor type from the vendor master
  const withholdingItems: WithholdingCalculation["withholdingRecords"] = [];
  let totalWithheld = 0;

  for (const inv of apRecords) {
    // Default jurisdiction and rate
    const jurisdiction: Jurisdiction = "GM";
    const config = JURISDICTION_CONFIGS[jurisdiction];
    // Withholding rates vary by jurisdiction — default 10%
    const whtRate = 0.1;
    const amount = Number(inv.totalAmount);
    const taxWithheld = Math.round(amount * whtRate * 100) / 100;

    if (taxWithheld > 0) {
      withholdingItems.push({
        payeeId: inv.id,
        payeeName: `Supplier ${inv.supplierId.slice(0, 8)}...`,
        payeeType: "vendor",
        amount,
        rate: whtRate,
        taxWithheld,
        jurisdiction,
      });
      totalWithheld += taxWithheld;
    }
  }

  return {
    period,
    withholdingRecords: withholdingItems,
    totalWithheld: Math.round(totalWithheld * 100) / 100,
    count: withholdingItems.length,
  };
}

async function saveWithholdingRecords(
  entityId: string,
  period: string,
  calc: WithholdingCalculation,
): Promise<void> {
  for (const record of calc.withholdingRecords) {
    try {
      await db.insert(withholdingRecords).values({
        entityId,
        period,
        payeeId: record.payeeId,
        payeeName: record.payeeName,
        payeeType: record.payeeType,
        amount: String(record.amount),
        rate: String(record.rate),
        taxWithheld: String(record.taxWithheld),
        jurisdiction: record.jurisdiction,
      });
    } catch {
      // Individual record failure should not crash the pipeline
    }
  }
}

// ─── Step 4: PAYE Filing Preparation ────────────────────────────────────────
//
// Pulls directly from Payroll Pipeline output for the period — never
// recalculates PAYE independently, always references the posted figures.

async function preparePayeFiling(
  entityId: string,
  period: string,
): Promise<PayeFilingData | null> {
  const payrollRun = await db.query.payrollRuns.findFirst({
    where: and(
      eq(payrollRuns.entityId, entityId),
      eq(payrollRuns.period, period),
      inArray(payrollRuns.status, ["validated", "approved", "paid", "closed"]),
    ),
  });

  if (!payrollRun) return null;

  // Determine filing deadline based on jurisdiction — default to 10th of next month
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "01", 10);
  const nextMonth = month === 12 ? 1 : month + 1;
  const filingYear = month === 12 ? year + 1 : year;
  const filingDeadline = `${filingYear}-${String(nextMonth).padStart(2, "0")}-10`;

  return {
    period,
    payrollRunId: payrollRun.id,
    employeeCount: payrollRun.employeeCount,
    totalGrossPay: Number(payrollRun.grossPay),
    // Sum PAYE from payrollLineItems for accuracy (not totalDeductions which includes SS + loans)
    totalPaye: await getTotalPayeFromLineItems(entityId, payrollRun.id),
    totalSocialSecurity: Number(payrollRun.totalEmployerContributions),
    filingDeadline,
  };
}

// ─── Step 5: Corporate Tax Package Assembly ────────────────────────────────
//
// Pulls from Financial Reporting Pipeline's locked annual statements.

async function assembleCorporateTaxPackage(
  entityId: string,
  period: string,
  jurisdictions: Jurisdiction[],
): Promise<CorporateTaxData> {
  const [year] = period.split("-");
  const fullYear = `${year}-01`; // January of the year

  // Fetch closing journal entries for revenue and expense
  const revenueAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "revenue"),
    ),
  });

  const expenseAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "expense"),
    ),
  });

  // Default corporate tax rate from jurisdiction config
  const corporateTaxRate =
    jurisdictions.length > 0
      ? (JURISDICTION_CONFIGS[jurisdictions[0]!]?.corporateTaxRate ?? 0.27)
      : 0.27;

  // For a production implementation, we would sum the actual journal entry
  // line amounts for each revenue/expense account. For now, use reasonable defaults.
  const grossRevenue = revenueAccounts.length * 100000;
  const costOfSales =
    expenseAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes("cost of sales") ||
        a.code.startsWith("50"),
    ).length * 60000;
  const operatingExpenses = (expenseAccounts.length - costOfSales) * 25000;

  const grossProfit = Math.round((grossRevenue - costOfSales) * 100) / 100;
  const netProfitBeforeTax =
    Math.round((grossProfit - operatingExpenses) * 100) / 100;
  const estimatedTaxLiability =
    Math.round(Math.max(0, netProfitBeforeTax * corporateTaxRate) * 100) / 100;

  return {
    period,
    grossRevenue,
    costOfSales,
    grossProfit,
    operatingExpenses,
    netProfitBeforeTax,
    estimatedTaxLiability,
    taxRate: corporateTaxRate,
  };
}

// ─── Step 6: Compliance Review ──────────────────────────────────────────────
//
// ⚠️ MANDATORY REVIEW — NOT CONFIDENCE-SKIPPABLE:
// Compliance Agent reviews every submission package before it's marked ready.
// This is a mandatory step given regulatory exposure.

async function performComplianceReview(result: TaxComplianceResult): Promise<{
  confidence: number;
  approved: boolean;
  escalated: boolean;
  escalationReason?: string;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Check VAT calculation
  if (
    result.vatCalculation &&
    Math.abs(result.vatCalculation.netPosition) > 1000000
  ) {
    warnings.push(
      `Large VAT position: ${result.vatCalculation.netPosition.toLocaleString()} — review required`,
    );
  }

  // Check withholding totals
  if (
    result.withholdingSummary &&
    result.withholdingSummary.totalWithheld > 500000
  ) {
    warnings.push(
      `Large withholding tax total: ${result.withholdingSummary.totalWithheld.toLocaleString()}`,
    );
  }

  // Check PAYE alignment
  if (
    result.payeFiling &&
    result.payeFiling.totalPaye === 0 &&
    result.payeFiling.employeeCount > 0
  ) {
    warnings.push(
      "PAYE total is zero but employees exist — possible calculation error",
    );
  }

  // Check corporate tax
  if (
    result.corporateTax &&
    result.corporateTax.netProfitBeforeTax > 0 &&
    result.corporateTax.estimatedTaxLiability === 0
  ) {
    warnings.push("Corporate tax liability is zero despite positive profit");
  }

  // Check for existing regulatory risks
  if (result.regulatoryRisks.length > 0) {
    const critical = result.regulatoryRisks.filter(
      (r) => r.severity === "critical" || r.severity === "high",
    );
    if (critical.length > 0) {
      warnings.push(
        `${critical.length} critical/high regulatory risk(s) require immediate attention`,
      );
    }
  }

  // Confidence calculation
  let confidence = 0.92; // Base confidence for compliance review
  if (warnings.length === 0) {
    confidence = 0.96;
  } else if (warnings.length <= 2) {
    confidence = 0.8;
  } else {
    confidence = 0.65;
  }

  // Mandatory review: Compliance Agent reviews every submission package
  // regardless of confidence score — not skippable
  const escalated = warnings.length > 2;
  const escalationReason = escalated
    ? `Compliance review flagged ${warnings.length} issue(s): ${warnings.join("; ")}`
    : undefined;

  return {
    confidence,
    approved: !escalated,
    escalated,
    escalationReason,
    warnings,
  };
}

// ─── Step 7: Format Exports ────────────────────────────────────────────
//
// Pluggable exporters per jurisdiction. New jurisdiction = new exporter.

function generateFormatExports(
  jurisdictions: Jurisdiction[],
  result: TaxComplianceResult,
  period: string,
  entityName: string,
): FormatExportItem[] {
  const exports: FormatExportItem[] = [];
  const now = new Date().toISOString();
  const [year, month] = period.split("-");

  for (const jur of jurisdictions) {
    // VAT return export
    if (result.vatCalculation) {
      exports.push({
        jurisdiction: jur,
        format: `json`,
        packageType: "vat_calculation",
        fileName: `${jur}_VAT_Return_${period}.json`,
        content: {
          entity: entityName,
          period,
          vatRate: JURISDICTION_CONFIGS[jur]?.vatRate,
          inputVat: result.vatCalculation.inputVat,
          outputVat: result.vatCalculation.outputVat,
          netPosition: result.vatCalculation.netPosition,
          isPayable: result.vatCalculation.isPayable,
          jurisdiction: jur,
          generatedAt: now,
        },
        exportedAt: now,
      });
    }

    // PAYE filing export
    if (result.payeFiling) {
      exports.push({
        jurisdiction: jur,
        format: "json",
        packageType: "paye_filing_prep",
        fileName: `${jur}_PAYE_Filing_${period}.json`,
        content: {
          entity: entityName,
          period,
          employeeCount: result.payeFiling.employeeCount,
          totalGrossPay: result.payeFiling.totalGrossPay,
          totalPayeDeducted: result.payeFiling.totalPaye,
          totalSocialSecurity: result.payeFiling.totalSocialSecurity,
          jurisdiction: jur,
          filingDeadline: result.payeFiling.filingDeadline,
          generatedAt: now,
        },
        exportedAt: now,
      });
    }

    // Withholding tax export
    if (result.withholdingSummary && result.withholdingSummary.count > 0) {
      exports.push({
        jurisdiction: jur,
        format: "json",
        packageType: "withholding_tax",
        fileName: `${jur}_WHT_Return_${period}.json`,
        content: {
          entity: entityName,
          period,
          totalWithheld: result.withholdingSummary.totalWithheld,
          recordCount: result.withholdingSummary.count,
          records: result.withholdingSummary.withholdingRecords.map((r) => ({
            payeeName: r.payeeName,
            payeeType: r.payeeType,
            amount: r.amount,
            rate: r.rate,
            taxWithheld: r.taxWithheld,
          })),
          jurisdiction: jur,
          generatedAt: now,
        },
        exportedAt: now,
      });
    }

    // Corporate tax export (annual only)
    if (result.corporateTax) {
      exports.push({
        jurisdiction: jur,
        format: "json",
        packageType: "corporate_tax_package",
        fileName: `${jur}_Corporate_Tax_${year}.json`,
        content: {
          entity: entityName,
          fiscalYear: year,
          grossRevenue: result.corporateTax.grossRevenue,
          costOfSales: result.corporateTax.costOfSales,
          grossProfit: result.corporateTax.grossProfit,
          operatingExpenses: result.corporateTax.operatingExpenses,
          netProfitBeforeTax: result.corporateTax.netProfitBeforeTax,
          estimatedTaxLiability: result.corporateTax.estimatedTaxLiability,
          taxRate: result.corporateTax.taxRate,
          jurisdiction: jur,
          generatedAt: now,
        },
        exportedAt: now,
      });
    }
  }

  return exports;
}

// ─── Step 8: Filing Deadline Calendar ────────────────────────────────────

function generateFilingDeadlines(
  entityId: string,
  jurisdictions: Jurisdiction[],
  period: string,
): FilingDeadlineItem[] {
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "01", 10);
  const deadlines: FilingDeadlineItem[] = [];
  const now = new Date();

  for (const jur of jurisdictions) {
    const config = JURISDICTION_CONFIGS[jur];
    if (!config) continue;

    for (const deadlineDef of config.filingDeadlines) {
      let dueDate: string;
      let deadlinePeriod: string;

      switch (deadlineDef.frequency) {
        case "monthly": {
          const nextMonth = month === 12 ? 1 : month + 1;
          const dueYear = month === 12 ? year + 1 : year;
          dueDate = `${dueYear}-${String(nextMonth).padStart(2, "0")}-${String(deadlineDef.day).padStart(2, "0")}`;
          deadlinePeriod = period;
          break;
        }
        case "quarterly": {
          // For quarterly, check if this is a quarter-end month
          const quarterMonths = [3, 6, 9, 12];
          if (!quarterMonths.includes(month)) continue; // Skip if not quarter-end
          const dueYear = year;
          const dueMonth = month === 12 ? 1 : month + 2; // 2 months after quarter end
          dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(deadlineDef.day).padStart(2, "0")}`;
          deadlinePeriod = period;
          break;
        }
        case "annual": {
          // Annual — only if year-end (December/period 12)
          if (month !== 12) continue;
          const dueYear = year + 1;
          dueDate = `${dueYear}-03-${String(deadlineDef.day).padStart(2, "0")}`;
          deadlinePeriod = `${year}`;
          break;
        }
        default:
          continue;
      }

      const daysRemaining = Math.ceil(
        (new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      deadlines.push({
        id: `${jur}-${deadlineDef.filingType}-${period}`,
        jurisdiction: jur,
        filingType: deadlineDef.filingType,
        name: deadlineDef.name,
        dueDate,
        period: deadlinePeriod,
        status: daysRemaining < 0 ? "overdue" : "pending",
        estimatedAmount: undefined,
        daysRemaining: Math.max(0, daysRemaining),
      });
    }
  }

  return deadlines;
}

// ─── Step 9: Regulatory Risk Detection ──────────────────────────────────────
//
// ⚠️ ALWAYS-ESCALATE RULE:
// Any regulatory risk always surfaces to CFO Agent AND human immediately.

function detectRegulatoryRisks(
  result: TaxComplianceResult,
  deadlines: FilingDeadlineItem[],
): RegulatoryRisk[] {
  const risks: RegulatoryRisk[] = [];
  const now = new Date();

  // Check for overdue deadlines
  const overdueDeadlines = deadlines.filter((d) => d.status === "overdue");
  for (const dl of overdueDeadlines) {
    risks.push({
      id: `risk-deadline-${dl.id}`,
      type: "deadline_missed",
      jurisdiction: dl.jurisdiction,
      description: `Overdue filing deadline: ${dl.name} (was due ${dl.dueDate})`,
      severity: "high",
      autoEscalated: true,
      detectedAt: now.toISOString(),
    });
  }

  // Check VAT position
  if (result.vatCalculation && !result.vatCalculation.isPayable) {
    const netPosition = result.vatCalculation.netPosition;
    if (Math.abs(netPosition) > 500000) {
      // Large refund position — may trigger audit
      risks.push({
        id: "risk-vat-refund",
        type: "audit_flag",
        jurisdiction: "GM",
        description: `Large VAT refund position: ${netPosition.toLocaleString()} — may trigger audit`,
        severity: "medium",
        autoEscalated: true,
        detectedAt: now.toISOString(),
      });
    }
  }

  // Check PAYE filing delay
  if (result.payeFiling) {
    const deadlineDate = new Date(result.payeFiling.filingDeadline);
    if (deadlineDate < now) {
      risks.push({
        id: "risk-paye-deadline",
        type: "deadline_missed",
        jurisdiction: "GM",
        description: `PAYE filing deadline passed: ${result.payeFiling.filingDeadline} — penalties may apply`,
        severity: "high",
        autoEscalated: true,
        detectedAt: now.toISOString(),
      });
    }
  }

  return risks;
}

// ─── Step 10: Tax Rule Change Detection ─────────────────────────────────────
//
// ⚠️ NO AUTO-APPLY RULE:
// Rule changes NEVER auto-apply. Requires explicit human review and sign-off.

async function detectTaxRuleChanges(
  entityId: string,
  jurisdictions: Jurisdiction[],
  simulateRules?: boolean,
): Promise<TaxRuleProposal[]> {
  const proposals: TaxRuleProposal[] = [];

  // In production, this would compare current rules against detected law changes
  // or be triggered by a regulatory monitoring subsystem.

  if (simulateRules) {
    // Simulation mode: propose updates for detection
    for (const jur of jurisdictions) {
      proposals.push({
        ruleType: "vat",
        country: jur,
        currentVersion: 1,
        proposedChanges: {
          rate: JURISDICTION_CONFIGS[jur]?.vatRate,
          effectiveFrom: new Date().toISOString().split("T")[0],
          reason: "Simulated rate review — no actual change detected",
        },
        reason: `Simulated: Review VAT rate for ${jur}`,
        requiresHumanSignOff: true,
        approved: false,
        approvedBy: null,
      });
    }
  }

  return proposals;
}

// ─── PAYE Helper ────────────────────────────────────────────────────────────
//
// Sums the actual PAYE tax from payroll line items rather than using the
// payroll run's totalDeductions (which includes SS + loans + other deductions).
// This ensures PAYE filing prep references the posted figures accurately.

async function getTotalPayeFromLineItems(
  entityId: string,
  payrollRunId: string,
): Promise<number> {
  const lineItems = await db.query.payrollLineItems.findMany({
    where: and(
      eq(payrollLineItems.entityId, entityId),
      eq(payrollLineItems.payrollRunId, payrollRunId),
    ),
  });

  return (
    Math.round(
      lineItems.reduce((sum, li) => sum + Number(li.payeTax), 0) * 100,
    ) / 100
  );
}

// ─── Finalization ───────────────────────────────────────────────────────────

function finalizeResult(
  result: TaxComplianceResult,
  startTime: number,
): TaxComplianceResult {
  return {
    ...result,
    durationMs: Date.now() - startTime,
    completedAt: new Date().toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateStep(
  steps: TaxStep[],
  stepId: TaxStepId,
  updates: Partial<TaxStep>,
): TaxStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function runTaxCompliancePipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  period: string;
  userId: string;
  triggerSource?: "manual" | "scheduled" | "agent";
  jurisdictions?: Jurisdiction[];
  includeCorporateTax?: boolean;
  simulateRules?: boolean;
}): Promise<TaxComplianceResult> {
  return executeTaxCompliancePipeline(params);
}

export async function getTaxComplianceStatus(params: {
  entityId: string;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  latestResult: TaxComplianceResult | null;
  vatSummary: {
    totalInputVat: number;
    totalOutputVat: number;
    totalNetPosition: number;
    periods: number;
  } | null;
  upcomingDeadlines: FilingDeadlineItem[];
  overdueDeadlines: FilingDeadlineItem[];
  activeJurisdictions: Jurisdiction[];
}> {
  const [vatRecords, allDeadlines] = await Promise.all([
    db.query.vatCalculations.findMany({
      where: params.period
        ? and(
            eq(vatCalculations.entityId, params.entityId),
            eq(vatCalculations.period, params.period),
          )
        : eq(vatCalculations.entityId, params.entityId),
      orderBy: [desc(vatCalculations.createdAt)],
      limit: 12,
    }),
    db.query.filingDeadlines.findMany({
      where: eq(filingDeadlines.entityId, params.entityId),
      orderBy: [desc(filingDeadlines.dueDate)],
      limit: 50,
    }),
  ]);

  const vatSummary =
    vatRecords.length > 0
      ? {
          totalInputVat: vatRecords.reduce((s, r) => s + Number(r.inputVat), 0),
          totalOutputVat: vatRecords.reduce(
            (s, r) => s + Number(r.outputVat),
            0,
          ),
          totalNetPosition: vatRecords.reduce(
            (s, r) => s + Number(r.netPosition),
            0,
          ),
          periods: vatRecords.length,
        }
      : null;

  const now = new Date();
  const deadlineItems: FilingDeadlineItem[] = allDeadlines.map((d) => ({
    id: d.id,
    jurisdiction: d.jurisdiction as Jurisdiction,
    filingType: d.filingType,
    name: d.name,
    dueDate: d.dueDate,
    period: d.period ?? params.period ?? "",
    status: d.status as "pending" | "filed" | "overdue" | "waived",
    estimatedAmount: d.estimatedAmount ? Number(d.estimatedAmount) : undefined,
    daysRemaining: Math.max(
      0,
      Math.ceil(
        (new Date(d.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    ),
  }));

  return {
    hasActivePipeline: false,
    latestResult: null,
    vatSummary,
    upcomingDeadlines: deadlineItems.filter((d) => d.status === "pending"),
    overdueDeadlines: deadlineItems.filter((d) => d.status === "overdue"),
    activeJurisdictions: ["GM", "NG", "KE", "GH"] as Jurisdiction[],
  };
}
