// ─── Country Tax Preset Catalog — Integrity Tests ───────────────────────────
//
// The catalog is DATA shipped to users as one-click starting packs. These
// tests guard the data shape so a bad rate or a malformed band never reaches
// the Settings UI or the payroll pipeline.

import { describe, it, expect } from "vitest";

import {
  TAX_PRESET_CATALOG,
  getTaxPresetsForCountry,
  PRESET_COUNTRIES,
  type TaxPreset,
} from "../tax-presets";
import { calculateTax } from "../tax-engine";

const VALID_TYPES = new Set([
  "vat",
  "sales_tax",
  "paye",
  "withholding",
  "corporate",
  "social_security",
  "excise",
  "property",
  "capital_gains",
  "customs",
  "digital_services",
  "payroll_tax",
  "wealth",
  "environmental",
  "health",
  "unemployment",
  "tourist",
  "stamp_duty",
  "gift",
  "inheritance",
  "license_fee",
  "other",
]);

const VALID_APPLIES_TO = new Set([
  "sales",
  "purchases",
  "payroll",
  "income",
  "other",
]);

describe("tax preset catalog", () => {
  it("exposes preset packs for the shipped countries", () => {
    // GM, SN, US are the explicitly requested first-class packs.
    for (const c of ["GM", "SN", "US"]) {
      expect(getTaxPresetsForCountry(c).length).toBeGreaterThan(0);
    }
    expect(PRESET_COUNTRIES).toContain("GM");
    expect(PRESET_COUNTRIES).toContain("SN");
    expect(PRESET_COUNTRIES).toContain("US");
  });

  it("US pack is jurisdiction-complete: a sales tax preset for every state + DC, plus the NYC combined-rate preset", () => {
    const usSales = getTaxPresetsForCountry("US").filter(
      (p) => p.ruleType === "sales_tax",
    );
    expect(usSales.length).toBe(52);
    // Unique per-state ids (us-sales-tax-<code>) + the NYC combined preset.
    const codes = new Set(
      usSales.map((p) => p.id.replace("us-sales-tax-", "")),
    );
    expect(codes.size).toBe(52);
    // Every component-based rule sums to <= 1 with sane component rates.
    for (const p of usSales) {
      const rc = p.rateConfig;
      if (rc.type === "rate" && rc.components) {
        const sum = rc.components.reduce((acc, c) => acc + c.rate, 0);
        expect(sum, `${p.id} components sum`).toBeLessThanOrEqual(1);
        for (const c of rc.components) {
          expect(c.rate, `${p.id} ${c.name}`).toBeGreaterThanOrEqual(0);
          expect(c.rate, `${p.id} ${c.name}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("NYC combined-rate preset ships as three named components summing to 8.875%", () => {
    const nyc = getTaxPresetsForCountry("US").find(
      (p) => p.id === "us-sales-tax-nyc",
    );
    expect(nyc, "us-sales-tax-nyc exists").toBeDefined();
    expect(nyc?.ruleType).toBe("sales_tax");
    const rc = nyc?.rateConfig;
    expect(rc?.type, "NYC uses a combined rate").toBe("rate");
    if (rc?.type === "rate") {
      expect(rc.components).toEqual([
        { name: "State", rate: 0.04 },
        { name: "City", rate: 0.045 },
        { name: "MCTD", rate: 0.00375 },
      ]);
      const sum = (rc.components ?? []).reduce((a, c) => a + c.rate, 0);
      expect(sum, "State + City + MCTD = 8.875%").toBeCloseTo(0.08875, 6);
    }
  });

  it("mandatory-local splits sum to the statutory base (CA, UT, VA)", () => {
    const usSales = getTaxPresetsForCountry("US").filter(
      (p) => p.ruleType === "sales_tax",
    );
    const expected: Record<string, number> = {
      "us-sales-tax-ca": 0.0725,
      "us-sales-tax-ut": 0.061,
      "us-sales-tax-va": 0.053,
    };
    for (const [id, base] of Object.entries(expected)) {
      const preset = usSales.find((p) => p.id === id);
      expect(preset, `${id} exists`).toBeDefined();
      const rc = preset?.rateConfig;
      expect(rc?.type, `${id} uses components`).toBe("rate");
      if (rc?.type === "rate") {
        const sum = (rc.components ?? []).reduce((a, c) => a + c.rate, 0);
        expect(sum, `${id} components sum to base`).toBeCloseTo(base, 6);
      }
    }
  });

  it("has unique preset ids across the whole catalog", () => {
    const ids = TAX_PRESET_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset carries a valid rule type, appliesTo, and ISO country", () => {
    for (const p of TAX_PRESET_CATALOG) {
      expect(VALID_TYPES.has(p.ruleType), p.id).toBe(true);
      expect(VALID_APPLIES_TO.has(p.appliesTo), p.id).toBe(true);
      expect(p.country).toMatch(/^[A-Z]{2}$/);
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.description.length).toBeGreaterThan(10);
      expect(p.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("flat rates are within [0, 1] and split rates are within [0, 1]", () => {
    for (const p of TAX_PRESET_CATALOG) {
      const rc = p.rateConfig;
      if (rc.type === "rate") {
        const rates = [rc.rate, rc.employeeRate, rc.employerRate].filter(
          (r): r is number => r !== undefined,
        );
        for (const r of rates) {
          expect(r, `${p.id} rate ${r}`).toBeGreaterThanOrEqual(0);
          expect(r, `${p.id} rate ${r}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("band schedules are ascending, non-overlapping, and end with a null top", () => {
    for (const p of TAX_PRESET_CATALOG) {
      if (p.rateConfig.type !== "bands") continue;
      const bands = p.rateConfig.bands ?? [];
      expect(bands.length, `${p.id} needs bands`).toBeGreaterThan(0);
      // First band starts at 0.
      expect(bands[0].from, `${p.id} first band starts at 0`).toBe(0);
      for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        expect(b.rate, `${p.id} band ${i} rate`).toBeGreaterThanOrEqual(0);
        expect(b.rate, `${p.id} band ${i} rate`).toBeLessThanOrEqual(1);
        if (b.to !== null) {
          expect(b.to, `${p.id} band ${i} to > from`).toBeGreaterThan(b.from);
          const next = bands[i + 1];
          if (next) {
            expect(next.from, `${p.id} next band from > prev to`).toBe(
              b.to + 1,
            );
          }
        }
      }
      const last = bands[bands.length - 1];
      expect(last.to, `${p.id} last band is open-ended`).toBeNull();
    }
  });

  it("payroll presets stay in sync with the engine's split semantics", () => {
    for (const p of TAX_PRESET_CATALOG) {
      if (p.ruleType !== "social_security") continue;
      const rc = p.rateConfig;
      if (rc.type === "rate") {
        expect(
          rc.employeeRate !== undefined || rc.employerRate !== undefined,
          `${p.id} social security needs a split`,
        ).toBe(true);
      }
    }
  });

  it("every payroll preset band set computes a non-negative tax", () => {
    // Smoke-check the engine accepts every catalog config without throwing.
    for (const p of TAX_PRESET_CATALOG as TaxPreset[]) {
      const result = calculateTax(p.rateConfig, 1_000_000);
      expect(result.amount, `${p.id} computes`).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.amount), `${p.id} finite`).toBe(true);
    }
  });
});
