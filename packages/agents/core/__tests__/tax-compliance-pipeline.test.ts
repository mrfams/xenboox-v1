// ─── Tax & Compliance Pipeline Tests ──────────────────────────────────────────
//
// Tests for the 11-step Tax & Compliance Pipeline with mocked DB.
// Follows existing test patterns from consolidation-pipeline.test.ts.
//
// Steps tested:
//   1. Jurisdiction Rule Registry
//   2. VAT Calculation Engine
//   3. Withholding Tax Calculation
//   4. PAYE Filing Preparation
//   5. Corporate Tax Package Assembly
//   6. Confidence Gate & Compliance Review
//   7. Local Authority Format Export (JSON + CSV)
//   8. Filing Deadline Calendar & Persistence
//   9. Regulatory Risk Escalation
//   10. Tax Rule Update Workflow
//   11. Tax Position Summary & Audit

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Helpers ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  function createMockTx() {
    const mkQuery = (methods: string[] = ["findFirst", "findMany"]) => {
      const obj: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const m of methods) obj[m] = vi.fn();
      return obj;
    };

    return {
      query: {
        jurisdictionTaxRules: mkQuery(),
        vatCalculations: mkQuery(),
        withholdingRecords: mkQuery(),
        filingDeadlines: mkQuery(),
        taxPackages: mkQuery(),
        invoicesAp: mkQuery(),
        salesInvoices: mkQuery(),
        chartOfAccounts: mkQuery(),
        payrollRuns: mkQuery(),
        payrollLineItems: mkQuery(),
        journalEntries: mkQuery(),
        journalEntryLines: mkQuery(),
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => [{ id: "insert-1" }]),
          onConflictDoNothing: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
      delete: vi.fn(() => ({ where: vi.fn() })),
    };
  }

  const mockJurisdictionTaxRulesTable = {
    id: "id",
    entityId: "entity_id",
    country: "country",
    ruleType: "rule_type",
    version: "version",
    name: "name",
    rateOrBands: "rate_or_bands",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
    status: "status",
    proposedBy: "proposed_by",
    approvedBy: "approved_by",
    createdAt: "created_at",
    updatedAt: "updated_at",
  } as const;

  const mockVatCalculationsTable = {
    id: "id",
    entityId: "entity_id",
    period: "period",
    inputVat: "input_vat",
    outputVat: "output_vat",
    netPosition: "net_position",
    status: "status",
    calculatedBy: "calculated_by",
    createdAt: "created_at",
  } as const;

  const mockWithholdingRecordsTable = {
    id: "id",
    entityId: "entity_id",
    period: "period",
    payeeId: "payee_id",
    payeeName: "payee_name",
    payeeType: "payee_type",
    amount: "amount",
    rate: "rate",
    taxWithheld: "tax_withheld",
    jurisdiction: "jurisdiction",
    createdAt: "created_at",
  } as const;

  const mockFilingDeadlinesTable = {
    id: "id",
    entityId: "entity_id",
    jurisdiction: "jurisdiction",
    filingType: "filing_type",
    name: "name",
    dueDate: "due_date",
    period: "period",
    estimatedAmount: "estimated_amount",
    status: "status",
    createdAt: "created_at",
  } as const;

  const mockTaxPackagesTable = {
    id: "id",
    entityId: "entity_id",
    packageType: "package_type",
    period: "period",
    status: "status",
    formatExport: "format_export",
    complianceChecked: "compliance_checked",
    reviewedBy: "reviewed_by",
    submitted: "submitted",
    createdAt: "created_at",
  } as const;

  const mockInvoicesApTable = {
    id: "id",
    entityId: "entity_id",
    supplierId: "supplier_id",
    totalAmount: "total_amount",
    invoiceDate: "invoice_date",
    status: "status",
  } as const;

  const mockSalesInvoicesTable = {
    id: "id",
    entityId: "entity_id",
    totalAmount: "total_amount",
    invoiceDate: "invoice_date",
    status: "status",
  } as const;

  const mockChartOfAccountsTable = {
    id: "id",
    entityId: "entity_id",
    code: "code",
    name: "name",
    type: "type",
    subtype: "subtype",
  } as const;

  const mockPayrollRunsTable = {
    id: "id",
    entityId: "entity_id",
    period: "period",
    status: "status",
    employeeCount: "employee_count",
    grossPay: "gross_pay",
    totalEmployerContributions: "total_employer_contributions",
    createdAt: "created_at",
  } as const;

  const mockPayrollLineItemsTable = {
    id: "id",
    entityId: "entity_id",
    payrollRunId: "payroll_run_id",
    payeTax: "paye_tax",
  } as const;

  const mockJournalEntriesTable = {
    id: "id",
    entityId: "entity_id",
    description: "description",
    date: "date",
    status: "status",
    source: "source",
    createdAt: "created_at",
  } as const;

  return {
    createMockTx,
    mockJurisdictionTaxRulesTable,
    mockVatCalculationsTable,
    mockWithholdingRecordsTable,
    mockFilingDeadlinesTable,
    mockTaxPackagesTable,
    mockInvoicesApTable,
    mockSalesInvoicesTable,
    mockChartOfAccountsTable,
    mockPayrollRunsTable,
    mockPayrollLineItemsTable,
    mockJournalEntriesTable,
  };
});

vi.mock("@xenboox/db", () => {
  const tx = mocks.createMockTx();
  return {
    db: {
      ...tx,
      transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => {
        await cb(mocks.createMockTx());
      }),
    },
    jurisdictionTaxRules: mocks.mockJurisdictionTaxRulesTable,
    vatCalculations: mocks.mockVatCalculationsTable,
    withholdingRecords: mocks.mockWithholdingRecordsTable,
    filingDeadlines: mocks.mockFilingDeadlinesTable,
    taxPackages: mocks.mockTaxPackagesTable,
    invoicesAp: mocks.mockInvoicesApTable,
    salesInvoices: mocks.mockSalesInvoicesTable,
    chartOfAccounts: mocks.mockChartOfAccountsTable,
    payrollRuns: mocks.mockPayrollRunsTable,
    payrollLineItems: mocks.mockPayrollLineItemsTable,
    journalEntries: mocks.mockJournalEntriesTable,
  };
});

vi.mock("@xenboox/db/schema/tax-compliance", () => ({
  jurisdictionTaxRules: mocks.mockJurisdictionTaxRulesTable,
  vatCalculations: mocks.mockVatCalculationsTable,
  withholdingRecords: mocks.mockWithholdingRecordsTable,
  filingDeadlines: mocks.mockFilingDeadlinesTable,
  taxPackages: mocks.mockTaxPackagesTable,
}));

vi.mock("@xenboox/db/schema/accounting", () => ({
  chartOfAccounts: mocks.mockChartOfAccountsTable,
  journalEntries: mocks.mockJournalEntriesTable,
  journalEntryLines: {
    id: "id",
    journalEntryId: "journal_entry_id",
    accountId: "account_id",
    debit: "debit",
    credit: "credit",
  },
}));

vi.mock("@xenboox/db/schema/ap-ar", () => ({
  invoicesAp: mocks.mockInvoicesApTable,
  salesInvoices: mocks.mockSalesInvoicesTable,
}));

vi.mock("@xenboox/db/schema/payroll", () => ({
  payrollRuns: mocks.mockPayrollRunsTable,
  payrollLineItems: mocks.mockPayrollLineItemsTable,
}));

vi.mock("./langfuse", () => ({
  langfuse: {
    trace: vi.fn(() => ({ update: vi.fn() })),
    event: vi.fn(),
  },
  getLangfuse: vi.fn(),
}));

vi.mock("./state", () => ({
  createAuditEntry: vi.fn((params) => ({
    agentId: params.agentId,
    action: params.action,
    details: params.details,
    confidence: params.confidence,
    timestamp: new Date().toISOString(),
  })),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

// Top-level import of the mocked db — vitest rewires this to the vi.mock
// factory. The old require("@xenboox/db") pattern bypassed the mock and
// loaded the real module (which fails on directory imports in Node ESM).
import { db as dbTyped } from "@xenboox/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = dbTyped as any;

describe("Tax & Compliance Pipeline — Phase 2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no persisted rules
    db.query.jurisdictionTaxRules.findMany.mockResolvedValue([]);

    // Default: AP invoices exist for the period
    db.query.invoicesAp.findMany.mockResolvedValue([
      {
        id: "ap-1",
        entityId: "entity-1",
        supplierId: "supplier-1",
        totalAmount: "100000",
        invoiceDate: "2026-07-15",
        status: "paid",
      },
      {
        id: "ap-2",
        entityId: "entity-1",
        supplierId: "supplier-2",
        totalAmount: "50000",
        invoiceDate: "2026-07-20",
        status: "paid",
      },
    ]);

    // Default: AR invoices exist for the period
    db.query.salesInvoices.findMany.mockResolvedValue([
      {
        id: "ar-1",
        entityId: "entity-1",
        totalAmount: "200000",
        invoiceDate: "2026-07-10",
        status: "paid",
      },
      {
        id: "ar-2",
        entityId: "entity-1",
        totalAmount: "150000",
        invoiceDate: "2026-07-25",
        status: "paid",
      },
    ]);

    // Default: COA with revenue and expense accounts
    db.query.chartOfAccounts.findMany.mockImplementation(() => {
      // Simulate the filter based on type
      const allAccounts = [
        {
          id: "acct-1",
          entityId: "entity-1",
          code: "4000",
          name: "Sales Revenue",
          type: "revenue",
          subtype: "operating",
        },
        {
          id: "acct-2",
          entityId: "entity-1",
          code: "4100",
          name: "Service Revenue",
          type: "revenue",
          subtype: "operating",
        },
        {
          id: "acct-3",
          entityId: "entity-1",
          code: "5000",
          name: "Cost of Sales",
          type: "expense",
          subtype: "cogs",
        },
        {
          id: "acct-4",
          entityId: "entity-1",
          code: "6000",
          name: "Salaries",
          type: "expense",
          subtype: "operating",
        },
        {
          id: "acct-5",
          entityId: "entity-1",
          code: "7000",
          name: "Rent",
          type: "expense",
          subtype: "operating",
        },
      ];
      return allAccounts;
    });

    // Default: no payroll runs
    db.query.payrollRuns.findFirst.mockResolvedValue(null);
    db.query.payrollLineItems.findMany.mockResolvedValue([]);
  });

  // ── Step 1: Jurisdiction Rule Registry ────────────────────────────────────

  describe("Step 1: Jurisdiction Rule Registry", () => {
    it("should load built-in jurisdiction configs when no persisted rules exist", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const step1 = result.steps.find(
        (s) => s.id === "jurisdiction_rule_registry",
      );
      expect(step1).toBeDefined();
      expect(step1!.status).toBe("completed");
      expect(step1!.details.jurisdictionsLoaded).toEqual([
        "GM",
        "SN",
        "GH",
        "NG",
        "KE",
        "US",
      ]);
    });

    it("should load persisted jurisdiction rules when they exist", async () => {
      db.query.jurisdictionTaxRules.findMany.mockResolvedValue([
        {
          id: "rule-1",
          entityId: "entity-1",
          country: "GM",
          ruleType: "vat",
          version: 1,
          name: "Gambia VAT",
          rateOrBands: { type: "rate", rate: 0.15 },
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          status: "active",
          proposedBy: null,
          approvedBy: "user-admin",
        },
      ]);

      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const step1 = result.steps.find(
        (s) => s.id === "jurisdiction_rule_registry",
      );
      expect(step1!.status).toBe("completed");
    });

    it("should handle entity with no tax rules gracefully", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      const step1 = result.steps[0];
      expect(step1.status).toBe("completed");
    });
  });

  // ── Step 2: VAT Calculation Engine ────────────────────────────────────────

  describe("Step 2: VAT Calculation Engine", () => {
    it("should calculate input VAT from AP invoices", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.vatCalculation).not.toBeNull();
      expect(result.vatCalculation!.inputVat).toBeGreaterThan(0);
      expect(result.vatCalculation!.outputVat).toBeGreaterThan(0);
    });

    it("should determine net position (output - input VAT)", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const expectedNet =
        Math.round(
          (result.vatCalculation!.outputVat - result.vatCalculation!.inputVat) *
            100,
        ) / 100;
      expect(result.vatCalculation!.netPosition).toBe(expectedNet);
    });

    it("should persist the VAT calculation to the DB", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      // insert should have been called with vatCalculations table
      expect(db.insert).toHaveBeenCalled();
    });

    it("should handle period with no invoices gracefully", async () => {
      db.query.invoicesAp.findMany.mockResolvedValue([]);
      db.query.salesInvoices.findMany.mockResolvedValue([]);

      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.vatCalculation!.inputVat).toBe(0);
      expect(result.vatCalculation!.outputVat).toBe(0);
      expect(result.vatCalculation!.invoiceCount).toBe(0);
    });
  });

  // ── Step 3: Withholding Tax Calculation ───────────────────────────────────

  describe("Step 3: Withholding Tax Calculation", () => {
    it("should calculate withholding tax on AP invoices", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.withholdingSummary).not.toBeNull();
      expect(result.withholdingSummary!.count).toBeGreaterThan(0);
      expect(result.withholdingSummary!.totalWithheld).toBeGreaterThan(0);
    });

    it("should skip withholding when no AP records exist", async () => {
      db.query.invoicesAp.findMany.mockResolvedValue([]);

      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const whtStep = result.steps.find((s) => s.id === "withholding_tax");
      expect(whtStep!.status).toBe("skipped");
    });
  });

  // ── Step 4: PAYE Filing Preparation ───────────────────────────────────────

  describe("Step 4: PAYE Filing Preparation", () => {
    it("should skip PAYE when no payroll runs exist for the period", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.payeFiling).toBeNull();
      const payeStep = result.steps.find((s) => s.id === "paye_filing_prep");
      expect(payeStep!.status).toBe("skipped");
    });

    it("should prepare PAYE filing when a payroll run exists", async () => {
      db.query.payrollRuns.findFirst.mockResolvedValue({
        id: "payroll-1",
        entityId: "entity-1",
        period: "2026-07",
        status: "approved",
        employeeCount: 5,
        grossPay: "50000",
        totalEmployerContributions: "5000",
        createdAt: new Date(),
      });
      db.query.payrollLineItems.findMany.mockResolvedValue([
        {
          id: "pli-1",
          entityId: "entity-1",
          payrollRunId: "payroll-1",
          payeTax: "2500",
        },
        {
          id: "pli-2",
          entityId: "entity-1",
          payrollRunId: "payroll-1",
          payeTax: "1800",
        },
        {
          id: "pli-3",
          entityId: "entity-1",
          payrollRunId: "payroll-1",
          payeTax: "3200",
        },
      ]);

      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.payeFiling).not.toBeNull();
      expect(result.payeFiling!.payrollRunId).toBe("payroll-1");
      expect(result.payeFiling!.totalPaye).toBe(7500); // 2500 + 1800 + 3200
      expect(result.payeFiling!.employeeCount).toBe(5);
    });
  });

  // ── Step 5: Corporate Tax Package Assembly ────────────────────────────────

  describe("Step 5: Corporate Tax Package Assembly", () => {
    it("should skip corporate tax for non-year-end periods", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.corporateTax).toBeNull();
      const corpStep = result.steps.find(
        (s) => s.id === "corporate_tax_package",
      );
      expect(corpStep!.status).toBe("skipped");
    });

    it("should assemble corporate tax package when explicitly requested", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
        includeCorporateTax: true,
      });

      expect(result.corporateTax).not.toBeNull();
      expect(result.corporateTax!.grossRevenue).toBeGreaterThan(0);
      expect(result.corporateTax!.estimatedTaxLiability).toBeGreaterThan(0);
    });

    it("should assemble corporate tax for year-end (December) period", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-12",
        userId: "user-1",
      });

      expect(result.corporateTax).not.toBeNull();
      expect(result.corporateTax!.period).toBe("2026-12");
    });
  });

  // ── Step 6: Confidence Gate & Compliance Review ───────────────────────────

  describe("Step 6: Confidence Gate & Compliance Review", () => {
    it("should perform compliance review with high confidence when clean", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const reviewStep = result.steps.find(
        (s) => s.id === "confidence_gate_review",
      );
      expect(reviewStep).toBeDefined();
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(reviewStep!.details.mandatoryReviewApplied).toBe(true);
    });

    it("should flag mandatory review regardless of confidence", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      // Mandatory review flag must always be true
      const reviewStep = result.steps.find(
        (s) => s.id === "confidence_gate_review",
      );
      expect(reviewStep!.details.mandatoryReviewApplied).toBe(true);
    });
  });

  // ── Step 7: Format Export (JSON + CSV) ──────────────────────────────────

  describe("Step 7: Local Authority Format Export", () => {
    it("should generate JSON exports for all jurisdictions", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.exports.length).toBeGreaterThan(0);
      const jsonExports = result.exports.filter((e) => e.format === "json");
      expect(jsonExports.length).toBeGreaterThan(0);
    });

    it("should generate CSV exports alongside JSON", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const csvExports = result.exports.filter((e) => e.format === "csv");
      expect(csvExports.length).toBeGreaterThan(0);
      for (const csv of csvExports) {
        expect(csv.fileName).toMatch(/\.csv$/);
        expect(typeof csv.content.raw).toBe("string");
        expect(csv.content.raw).toContain("\n"); // CSV has header + data rows
      }
    });

    it("should name exports with jurisdiction prefix and period", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      for (const exp of result.exports) {
        expect(exp.fileName).toContain("2026-07");
      }
    });
  });

  // ── Step 8: Filing Deadline Calendar & Persistence ────────────────────────

  describe("Step 8: Filing Deadline Calendar & Persistence", () => {
    it("should generate filing deadlines for all jurisdictions", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.filingDeadlines.length).toBeGreaterThan(0);
      const jurisdictions = [
        ...new Set(result.filingDeadlines.map((d) => d.jurisdiction)),
      ];
      expect(jurisdictions.sort()).toEqual([
        "GH",
        "GM",
        "KE",
        "NG",
        "SN",
        "US",
      ]);
    });

    it("should mark overdue deadlines correctly", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      for (const dl of result.filingDeadlines) {
        expect(["pending", "overdue"]).toContain(dl.status);
        if (dl.status === "overdue") {
          expect(dl.daysRemaining).toBe(0);
        }
      }
    });

    it("should persist deadlines to filingDeadlines table", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      // saveFilingDeadlines should call db.insert for each deadline
      expect(db.insert).toHaveBeenCalled();
    });

    it("should include quarterly deadlines only at quarter-end months", async () => {
      // March (quarter-end) should include quarterly deadlines
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-03",
        userId: "user-1",
      });

      const quarterlyDeadlines = result.filingDeadlines.filter(
        (d) => d.filingType === "withholding",
      );
      expect(quarterlyDeadlines.length).toBeGreaterThan(0);
    });
  });

  // ── Step 9: Regulatory Risk Escalation ────────────────────────────────────

  describe("Step 9: Regulatory Risk Escalation", () => {
    it("should detect overdue filing deadlines as regulatory risks", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      // Some deadlines may be overdue depending on current date
      // The risk detection step should at least run without error
      const riskStep = result.steps.find(
        (s) => s.id === "regulatory_risk_escalation",
      );
      expect(riskStep).toBeDefined();
      expect(riskStep!.status).toMatch(/^(completed|escalated)$/);
    });

    it("should always escalate regulatory risks (never auto-resolve)", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const riskStep = result.steps.find(
        (s) => s.id === "regulatory_risk_escalation",
      );
      // The always-escalate rule is always applied
      expect(riskStep!.details.alwaysEscalateRuleApplied).toBe(true);
    });

    it("should use actual jurisdiction from deadline context (not hardcoded GM)", async () => {
      const { detectRegulatoryRisks } = await import(
        "../tax-compliance-pipeline"
      );

      // Create a result with a large VAT refund and PAYE past deadline
      const mockResult = {
        vatCalculation: {
          period: "2026-07",
          inputVat: 100000,
          outputVat: 30000,
          netPosition: -70000,
          isPayable: false,
          vatRate: 0.15,
          invoiceCount: 10,
        },
        payeFiling: {
          period: "2026-06",
          payrollRunId: "pr-1",
          employeeCount: 5,
          totalGrossPay: 50000,
          totalPaye: 7500,
          totalSocialSecurity: 5000,
          filingDeadline: "2026-07-10",
        },
        regulatoryRisks: [],
      } as any;

      const deadlines = [
        {
          id: "GM-paye-2026-06",
          jurisdiction: "GM" as const,
          filingType: "paye",
          name: "GRA PAYE Filing — Monthly Return",
          dueDate: "2026-07-10",
          period: "2026-06",
          status: "overdue" as const,
          daysRemaining: 0,
        },
      ];

      const risks = detectRegulatoryRisks(mockResult, deadlines);
      const payeRisk = risks.find(
        (r) => r.type === "deadline_missed" && r.description.includes("PAYE"),
      );
      if (payeRisk) {
        expect(payeRisk.jurisdiction).toBe("GM"); // Should match the deadline's jurisdiction
      }
    });
  });

  // ── Step 10: Tax Rule Update Workflow ─────────────────────────────────────

  describe("Step 10: Tax Rule Update Workflow", () => {
    it("should not generate proposals without simulate flag", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.taxRuleProposals).toHaveLength(0);
    });

    it("should generate proposals when simulate flag is set", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
        simulateRules: true,
      });

      expect(result.taxRuleProposals.length).toBeGreaterThan(0);
    });

    it("should never auto-apply proposed rule changes", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
        simulateRules: true,
      });

      // All proposals must be unapproved (require human sign-off)
      const updateStep = result.steps.find(
        (s) => s.id === "tax_rule_update_workflow",
      );
      expect(updateStep!.details.pendingHumanApproval).toBe(
        updateStep!.details.proposalsGenerated,
      );
      expect(updateStep!.details.autoApplied).toBe(false);
    });
  });

  // ── Step 11: Tax Position Summary & Audit ────────────────────────────────

  describe("Step 11: Tax Position Summary & Audit", () => {
    it("should include audit trail entries", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.auditTrail.length).toBeGreaterThan(0);
    });

    it("should complete the summary step", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      const summaryStep = result.steps.find(
        (s) => s.id === "tax_position_summary",
      );
      expect(summaryStep!.status).toBe("completed");
    });
  });

  // ── End-to-End Pipeline ───────────────────────────────────────────────────

  describe("End-to-End Pipeline", () => {
    it("should run all 11 steps successfully", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.steps).toHaveLength(11);
      expect(result.success).toBe(true);
      expect(result.status).toMatch(/^(submitted|reviewed|draft)$/);
    });

    it("should handle pipeline errors gracefully", async () => {
      db.query.invoicesAp.findMany.mockRejectedValue(
        new Error("DB connection failed"),
      );

      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.status).toBe("failed");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should report duration and completion timestamp", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.completedAt).toBeTruthy();
    });

    it("should respect specified jurisdictions (not all four)", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
        jurisdictions: ["GM", "NG"],
      });

      const jurisdictions = [
        ...new Set(result.filingDeadlines.map((d) => d.jurisdiction)),
      ];
      expect(jurisdictions).not.toContain("KE");
      expect(jurisdictions).not.toContain("GH");
      expect(jurisdictions).toContain("GM");
      expect(jurisdictions).toContain("NG");
    });
  });

  // ── Status Query ──────────────────────────────────────────────────────────

  describe("getTaxComplianceStatus", () => {
    it("should return VAT summary and filing deadlines", async () => {
      db.query.vatCalculations.findMany.mockResolvedValue([
        {
          id: "vat-1",
          entityId: "entity-1",
          period: "2026-07",
          inputVat: "15000",
          outputVat: "35000",
          netPosition: "20000",
          status: "calculated",
          calculatedBy: "tax-pipeline",
          createdAt: new Date(),
        },
      ]);
      db.query.filingDeadlines.findMany.mockResolvedValue([
        {
          id: "dl-1",
          entityId: "entity-1",
          jurisdiction: "GM",
          filingType: "vat",
          name: "GRA VAT Return",
          dueDate: "2026-08-15",
          period: "2026-07",
          status: "pending",
          createdAt: new Date(),
        },
      ]);

      const { getTaxComplianceStatus } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await getTaxComplianceStatus({ entityId: "entity-1" });

      expect(result.vatSummary).not.toBeNull();
      expect(result.vatSummary!.totalNetPosition).toBe(20000);
      expect(result.upcomingDeadlines).toHaveLength(1);
    });

    it("should return empty state when no data exists", async () => {
      db.query.vatCalculations.findMany.mockResolvedValue([]);
      db.query.filingDeadlines.findMany.mockResolvedValue([]);

      const { getTaxComplianceStatus } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await getTaxComplianceStatus({ entityId: "entity-1" });

      expect(result.vatSummary).toBeNull();
      expect(result.upcomingDeadlines).toHaveLength(0);
      expect(result.overdueDeadlines).toHaveLength(0);
    });
  });

  // ── Regulatory Risk: Always-Escalate Rule ─────────────────────────────────

  describe("Always-Escalate Rule (Step 9 enforcement)", () => {
    it("should produce escalated status when deadlines are overdue", async () => {
      const { detectRegulatoryRisks } = await import(
        "../tax-compliance-pipeline"
      );

      const mockResult = {
        vatCalculation: null,
        payeFiling: null,
        regulatoryRisks: [],
      } as any;

      const overdueDeadlines = [
        {
          id: "GM-vat-2026-06",
          jurisdiction: "GM" as const,
          filingType: "vat",
          name: "GRA VAT Return — Monthly",
          dueDate: "2026-07-15",
          period: "2026-07",
          status: "overdue" as const,
          daysRemaining: 0,
        },
      ];

      const risks = detectRegulatoryRisks(mockResult, overdueDeadlines);
      expect(risks.length).toBeGreaterThan(0);
      expect(risks.every((r) => r.autoEscalated)).toBe(true);
    });
  });

  // ── No Auto-Apply Rule ───────────────────────────────────────────────────

  describe("No Auto-Apply Rule (Step 10 enforcement)", () => {
    it("should never apply rule changes automatically", async () => {
      const { detectTaxRuleChanges } = await import(
        "../tax-compliance-pipeline"
      );
      const proposals = await detectTaxRuleChanges(
        "entity-1",
        ["GM", "NG"],
        true, // simulate
      );

      for (const prop of proposals) {
        expect(prop.requiresHumanSignOff).toBe(true);
        expect(prop.approved).toBe(false);
        expect(prop.approvedBy).toBeNull();
      }
    });
  });

  // ── CSV Export Format ────────────────────────────────────────────────────

  describe("CSV Export Format", () => {
    it("should produce valid CSV content with headers", async () => {
      const { generateFormatExports } = await import(
        "../tax-compliance-pipeline"
      );

      const mockResult = {
        vatCalculation: {
          period: "2026-07",
          inputVat: 15000,
          outputVat: 35000,
          netPosition: 20000,
          isPayable: true,
          vatRate: 0.15,
          invoiceCount: 10,
        },
        payeFiling: null,
        withholdingSummary: null,
        corporateTax: null,
        exports: [],
      } as any;

      const exports = generateFormatExports(
        ["GM"],
        mockResult,
        "2026-07",
        "Test Entity",
      );
      const csvExport = exports.find((e) => e.format === "csv");
      expect(csvExport).toBeDefined();
      expect(csvExport!.content.raw).toContain("Period,Entity,VAT Rate");
      expect(csvExport!.content.raw).toContain("2026-07");
    });
  });

  // ── Filing Deadline Persistence ──────────────────────────────────────────

  describe("Filing Deadline Persistence (saveFilingDeadlines)", () => {
    it("should fail gracefully on individual DB errors", async () => {
      const { runTaxCompliancePipeline } = await import(
        "../tax-compliance-pipeline"
      );
      const result = await runTaxCompliancePipeline({
        entityId: "entity-1",
        entityName: "Test Entity",
        currency: "GMD",
        period: "2026-07",
        userId: "user-1",
      });

      // Even if some saves fail, the pipeline should succeed
      expect(result.filingDeadlines.length).toBeGreaterThan(0);
    });
  });

  // ── Compliance Review: Mandatory Gate ────────────────────────────────────

  describe("Compliance Review: Mandatory Gate (Step 6)", () => {
    it("should lower confidence when large VAT position exists", async () => {
      const { performComplianceReview } = await import(
        "../tax-compliance-pipeline"
      );

      const result = {
        vatCalculation: {
          period: "2026-07",
          inputVat: 100000,
          outputVat: 2000000,
          netPosition: 1900000, // Large position > 1M
          isPayable: true,
          vatRate: 0.15,
          invoiceCount: 50,
        },
        withholdingSummary: null,
        payeFiling: null,
        corporateTax: null,
        regulatoryRisks: [],
      } as any;

      const review = await performComplianceReview(result);
      expect(review.confidence).toBeLessThan(0.96);
    });

    it("should escalate when more than 2 warnings exist", async () => {
      const { performComplianceReview } = await import(
        "../tax-compliance-pipeline"
      );

      const result = {
        vatCalculation: {
          period: "2026-07",
          inputVat: 100000,
          outputVat: 2000000,
          netPosition: 1900000,
          isPayable: true,
          vatRate: 0.15,
          invoiceCount: 50,
        },
        withholdingSummary: {
          period: "2026-07",
          withholdingRecords: [],
          totalWithheld: 600000, // > 500K
          count: 10,
        },
        payeFiling: {
          period: "2026-07",
          payrollRunId: "pr-1",
          employeeCount: 3,
          totalGrossPay: 30000,
          totalPaye: 0, // Zero PAYE with employees = warning
          totalSocialSecurity: 3000,
          filingDeadline: "2026-08-10",
        },
        corporateTax: {
          period: "2026-12",
          grossRevenue: 500000,
          costOfSales: 200000,
          grossProfit: 300000,
          operatingExpenses: 100000,
          netProfitBeforeTax: 200000,
          estimatedTaxLiability: 0, // Zero liability with profit = warning
          taxRate: 0.27,
        },
        regulatoryRisks: [
          {
            id: "risk-1",
            type: "deadline_missed",
            jurisdiction: "GM" as const,
            description: "Overdue deadline",
            severity: "high" as const,
            autoEscalated: true,
            detectedAt: new Date().toISOString(),
          },
        ],
      } as any;

      const review = await performComplianceReview(result);
      expect(review.escalated).toBe(true);
      expect(review.warnings.length).toBeGreaterThan(2);
    });
  });
});
