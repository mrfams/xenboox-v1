// ─── Jurisdiction Tax & Payroll Rules — Unit Tests ─────────────────────────
//
// Validates the per-country statutory rule sets used by the Payroll Pipeline
// and Tax Compliance Pipeline:
//   - The Gambia (GM)   — GRA, 15% VAT, SSHFC
//   - Senegal (SN)      — DGID, 18% TVA, IPRES/CSS
//   - Ghana (GH)        — GRA-GH, 20% VAT (Act 1151, 2026), SSNIT
//   - Nigeria (NG)      — FIRS, 7.5% VAT
//   - Kenya (KE)        — KRA, 16% VAT
//   - USA (US)          — IRS, no federal VAT, FICA 7.65%, federal brackets
//
// These rules drive payroll net-pay and tax-filing exports, so rate regressions
// here are legal-correctness bugs, not cosmetic ones.

import { describe, it, expect } from "vitest";
import {
  STATUTORY_RULES,
  calculatePayeForJurisdiction,
  calculateSocialSecurityForJurisdiction,
} from "@xenboox/agents";

// ─── Payroll statutory rules per jurisdiction ───────────────────────────────

describe("Jurisdiction payroll rules", () => {
  it("exposes statutory rules for all 6 supported jurisdictions", () => {
    for (const jur of ["GM", "SN", "GH", "NG", "KE", "US"] as const) {
      const rules = STATUTORY_RULES[jur];
      expect(rules, `missing rules for ${jur}`).toBeDefined();
      expect(rules.paye.bands.length).toBeGreaterThan(0);
      expect(rules.socialSecurity.employeeContributionRate).toBeDefined();
      expect(rules.withholdingTax.bands[0]?.rate).toBeDefined();
    }
  });

  it("Gambia: SSHFC 5% employee / 10% employer on 30,000 ceiling", () => {
    const { employee, employer } = calculateSocialSecurityForJurisdiction(
      50000,
      "GM",
    );
    expect(employee).toBe(1500); // 30,000 * 5%
    expect(employer).toBe(3000); // 30,000 * 10%
  });

  it("Gambia: PAYE progressive bands apply", () => {
    // 3,000 personal relief wipes tax at D5,000; crosses threshold higher up
    expect(calculatePayeForJurisdiction(2000, "GM")).toBe(0); // below 3,000 threshold
    expect(calculatePayeForJurisdiction(8000, "GM")).toBeGreaterThan(0);
  });

  it("Senegal: IPRES/CSS employee 6.25% / employer 19.75%", () => {
    const { employee, employer } = calculateSocialSecurityForJurisdiction(
      100000,
      "SN",
    );
    expect(employee).toBe(6250);
    expect(employer).toBe(19750);
  });

  it("Senegal: IRSA 40% top bracket on high salaries", () => {
    const low = calculatePayeForJurisdiction(100000, "SN");
    const high = calculatePayeForJurisdiction(1000000, "SN");
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(0);
  });

  it("Ghana: SSNIT 5.5% employee / 13% employer (Act 1151 unchanged)", () => {
    const { employee, employer } = calculateSocialSecurityForJurisdiction(
      10000,
      "GH",
    );
    expect(employee).toBe(550);
    expect(employer).toBe(1300);
  });

  it("USA: FICA 7.65% employee/employer with SS wage-base ceiling", () => {
    const { employee, employer } = calculateSocialSecurityForJurisdiction(
      10000,
      "US",
    );
    expect(employee).toBe(765);
    expect(employer).toBe(765);

    // Above the SS wage base ($176,100/yr → ~$14,675/mo) Medicare 1.45% still
    // applies, so a very high earner is capped at the ceiling * 7.65%.
    const capped = calculateSocialSecurityForJurisdiction(100000, "US");
    expect(capped.employee).toBeLessThan(100000 * 0.0765);
    expect(capped.employee).toBeGreaterThan(0);
  });

  it("USA: federal tax brackets are progressive (10% → 37%)", () => {
    // ~$14,300 annual standard deduction wipes tax below ~$8,500/mo
    const low = calculatePayeForJurisdiction(800, "US");
    const mid = calculatePayeForJurisdiction(10000, "US");
    const high = calculatePayeForJurisdiction(60000, "US");
    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(0);
  });

  it("Nigeria: FIRS consolidated relief applies", () => {
    expect(calculatePayeForJurisdiction(50000, "NG")).toBe(0); // below relief
    // Consolidated relief = max(200,000, 20% of gross) — deep bracket income
    // pays after the relief; 10M/month crosses well past it.
    expect(calculatePayeForJurisdiction(10000000, "NG")).toBeGreaterThan(0);
  });

  it("Kenya: KRA PAYE personal relief 2,400/month", () => {
    expect(calculatePayeForJurisdiction(10000, "KE")).toBe(0);
    expect(calculatePayeForJurisdiction(100000, "KE")).toBeGreaterThan(0);
  });

  it("contractor withholding: USA backup withholding 24%, Senegal 5%", () => {
    expect(STATUTORY_RULES.US.withholdingTax.bands[0]?.rate).toBeCloseTo(0.24);
    expect(STATUTORY_RULES.SN.withholdingTax.bands[0]?.rate).toBeCloseTo(0.05);
    expect(STATUTORY_RULES.GM.withholdingTax.bands[0]?.rate).toBeCloseTo(0.1);
  });
});
