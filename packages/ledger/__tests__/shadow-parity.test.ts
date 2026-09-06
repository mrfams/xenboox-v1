// ─── N36: shadow dual-write mapping + parity comparison (executed) ──────────

import { describe, it, expect } from "vitest";
import { majorToMinor, toLedgerLines, isShadowEnabled } from "../src/shadow";
import { compareEntry } from "../src/parity";

describe("majorToMinor (legacy money → integer minor units)", () => {
  it("converts 2dp strings exactly", () => {
    expect(majorToMinor("150000.00")).toBe(15000000);
    expect(majorToMinor("0.01")).toBe(1);
    expect(majorToMinor("1234.56")).toBe(123456);
  });

  it("rounds half-up stray 3rd decimals", () => {
    expect(majorToMinor("10.005")).toBe(1001);
    expect(majorToMinor("10.004")).toBe(1000);
  });

  it("handles numbers and garbage safely", () => {
    expect(majorToMinor(2500)).toBe(250000);
    expect(majorToMinor("not-a-number")).toBe(0);
    expect(majorToMinor("")).toBe(0);
  });
});

describe("toLedgerLines (legacy line shape → engine shape)", () => {
  it("maps debit/credit strings to integer minor units per side", () => {
    const lines = toLedgerLines([
      { accountId: "a1", debit: "150000.00", credit: "0", description: "AR" },
      { accountId: "a2", debit: "0", credit: "150000.00", description: "Rev" },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      accountId: "a1",
      debitMinor: 15000000,
      creditMinor: 0,
      description: "AR",
    });
    expect(lines[1]).toMatchObject({ creditMinor: 15000000, debitMinor: 0 });
  });
});

describe("shadow flag", () => {
  it("is off by default and on only when LEDGER_SHADOW=true", () => {
    delete process.env.LEDGER_SHADOW;
    expect(isShadowEnabled()).toBe(false);
    process.env.LEDGER_SHADOW = "true";
    expect(isShadowEnabled()).toBe(true);
    process.env.LEDGER_SHADOW = "1";
    expect(isShadowEnabled()).toBe(false); // strict
    delete process.env.LEDGER_SHADOW;
  });
});

describe("parity comparison (pure)", () => {
  const legacy = { reference: "ar-inv-1", totalMinor: 15000000, periodId: "p1" };

  it("missing event is reported", () => {
    expect(compareEntry(legacy, null)).toMatchObject({ kind: "missing_event" });
  });

  it("total mismatch reports both sides", () => {
    const m = compareEntry(legacy, { totalMinor: 14000000, periodId: "p1" });
    expect(m).toMatchObject({
      kind: "total_mismatch",
      legacyTotalMinor: 15000000,
      eventTotalMinor: 14000000,
    });
  });

  it("period mismatch reports even when totals match", () => {
    const m = compareEntry(legacy, { totalMinor: 15000000, periodId: "p2" });
    expect(m).toMatchObject({ kind: "period_mismatch" });
  });

  it("perfect parity returns null", () => {
    expect(compareEntry(legacy, { totalMinor: 15000000, periodId: "p1" })).toBeNull();
  });
});
