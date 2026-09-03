import { describe, it, expect } from "vitest";

import { isMoneyIn, signedBankAmount } from "../lib/bank-amount";

describe("bank amount convention", () => {
  describe("isMoneyIn", () => {
    it("treats deposit and interest as money in", () => {
      expect(isMoneyIn("deposit")).toBe(true);
      expect(isMoneyIn("interest")).toBe(true);
    });

    it("treats withdrawal, transfer, fee as money out", () => {
      expect(isMoneyIn("withdrawal")).toBe(false);
      expect(isMoneyIn("transfer")).toBe(false);
      expect(isMoneyIn("fee")).toBe(false);
    });

    it("handles null/undefined safely", () => {
      expect(isMoneyIn(null)).toBe(false);
      expect(isMoneyIn(undefined)).toBe(false);
    });
  });

  describe("signedBankAmount", () => {
    it("returns positive magnitude for money in", () => {
      expect(signedBankAmount("deposit", "1250.50")).toBe(1250.5);
      expect(signedBankAmount("interest", "37.25")).toBe(37.25);
    });

    it("returns negative magnitude for money out", () => {
      expect(signedBankAmount("withdrawal", "1250.50")).toBe(-1250.5);
      expect(signedBankAmount("transfer", "500")).toBe(-500);
      expect(signedBankAmount("fee", "12.5")).toBe(-12.5);
    });

    it("treats a stored negative magnitude as magnitude (never sign-inferred)", () => {
      // A buggy writer storing "-100" must still produce +100 for a deposit
      // and -100 for a withdrawal — the type, not the stored sign, decides.
      expect(signedBankAmount("deposit", "-100")).toBe(100);
      expect(signedBankAmount("withdrawal", "-100")).toBe(-100);
    });

    it("handles numeric input and garbage safely", () => {
      expect(signedBankAmount("deposit", 42)).toBe(42);
      expect(signedBankAmount("withdrawal", "abc")).toBe(-0);
    });
  });
});
