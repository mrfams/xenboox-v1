// ─── N45: unknown-tax escalation logic (implied-rate matching, pure) ────────

import { describe, it, expect } from "vitest";

function impliedTaxRate(subtotal: number, taxAmount: number): number {
  return Number(((taxAmount / subtotal) * 100).toFixed(2));
}

function isKnownRate(
  implied: number,
  entityTaxRates: Array<{ name: string; ratePercent: number }>,
  tolerance = 0.5,
): boolean {
  if (!entityTaxRates.length) return true; // nothing configured → not "unknown"
  return entityTaxRates.some(
    (r) => Math.abs(r.ratePercent - implied) <= tolerance,
  );
}

describe("N45 unknown-tax escalation", () => {
  const ghanaVat = [{ name: "Ghana VAT", ratePercent: 15 }];

  it("accepts a rate matching the configuration", () => {
    expect(isKnownRate(impliedTaxRate(1000, 150), ghanaVat)).toBe(true);
  });

  it("17.5% against a 15% config is unknown", () => {
    expect(isKnownRate(17.5, ghanaVat)).toBe(false);
  });

  it("accepts a rate within tolerance", () => {
    expect(isKnownRate(15.3, ghanaVat)).toBe(true);
    expect(isKnownRate(14.8, ghanaVat)).toBe(true);
  });

  it("nothing configured means nothing to match against — not unknown", () => {
    expect(isKnownRate(99, [])).toBe(true);
  });

  it("band rates are matched too (multi-band jurisdictions)", () => {
    const bands = [
      { name: "State tax", ratePercent: 4 },
      { name: "City tax", ratePercent: 4.5 },
    ];
    expect(isKnownRate(4, bands)).toBe(true);
    expect(isKnownRate(4.5, bands)).toBe(true);
    expect(
      isKnownRate(8.875, [{ name: "combined", ratePercent: 8.875 }]),
    ).toBe(true);
  });

  it("implied rate computation is exact at 2dp", () => {
    expect(impliedTaxRate(1000, 150)).toBe(15);
    expect(impliedTaxRate(350, 61.25)).toBe(17.5);
  });
});
