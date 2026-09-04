import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  isValidMoney,
  moneyToCents,
  isValidIsoDate,
  MAX_CENTS,
} from "../server/ar-validation";
import {
  moneyString,
  positiveMoneyString,
  isoDateString,
} from "../server/ar-validation";

const AR_ROUTER = path.resolve(__dirname, "../server/routers/ar.ts");
const INVOICING_ROUTER = path.resolve(
  __dirname,
  "../server/routers/invoicing.ts",
);
const DIALOG = path.resolve(
  __dirname,
  "../components/dashboard/create-invoice-dialog.tsx",
);

describe("P3-A: money validators", () => {
  it("accepts well-formed amounts up to 2dp", () => {
    for (const v of [
      "0",
      "0.5",
      "0.05",
      "1",
      "25",
      "25.5",
      "25.50",
      "9999999999999.99",
    ]) {
      expect(isValidMoney(v), v).toBe(true);
    }
  });

  it("rejects signs, exponents, commas, junk and >2dp", () => {
    for (const v of [
      "",
      "-5",
      "+5",
      "1.999",
      "abc",
      "1,000",
      "1.2.3",
      "1e3",
      "NaN",
      "Infinity",
      ".",
      " 5",
    ]) {
      expect(isValidMoney(v), v).toBe(false);
    }
  });

  it("converts money strings to exact cents", () => {
    expect(moneyToCents("125.5")).toBe(12550);
    expect(moneyToCents("0.05")).toBe(5);
    expect(moneyToCents("9999999999999.99")).toBe(MAX_CENTS);
  });

  it("zod money schemas reject the old parseFloat poison values", () => {
    // "abc" → parseFloat → NaN; "-50" slips past `> balance` guards; "1.999"
    // is not a currency amount.
    for (const bad of ["abc", "-50", "1.999", "1e3", ""]) {
      expect(moneyString.safeParse(bad).success, bad).toBe(false);
    }
    expect(positiveMoneyString.safeParse("0").success).toBe(false);
    expect(positiveMoneyString.safeParse("-5").success).toBe(false);
    expect(positiveMoneyString.safeParse("25.00").success).toBe(true);
  });
});

describe("P3-A: date validators", () => {
  it("accepts real ISO calendar days", () => {
    for (const v of ["2026-01-01", "2026-02-28", "2026-12-31", "2024-02-29"]) {
      expect(isValidIsoDate(v), v).toBe(true);
    }
  });

  it("rejects garbage and impossible days", () => {
    for (const v of [
      "",
      "abc",
      "01/02/2026",
      "2026-13-01",
      "2026-02-30",
      "2026-00-10",
      "2025-02-29", // not a leap year
      "26-09-04",
    ]) {
      expect(isValidIsoDate(v), v).toBe(false);
    }
  });

  it("isoDateString schema enforces real dates at the boundary", () => {
    expect(isoDateString.safeParse("2026-13-99").success).toBe(false);
    expect(isoDateString.safeParse("2026-09-04").success).toBe(true);
  });
});

describe("P3-A: record-layer guards present in ar router", () => {
  it("createInvoice validates money, dates, line caps and due >= invoice date", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("moneyString");
    expect(c).toContain("isoDateString");
    expect(c).toContain("Due date cannot be before the invoice date");
    expect(c).toContain('.max(200, "An invoice can have at most 200 lines")');
    expect(c).toContain(
      '.max(40, "Invoice number must be under 40 characters")',
    );
    expect(c).toContain("Number.isSafeInteger(lineCents)");
    expect(c).toContain("MAX_CENTS");
  });

  it("createInvoice entity-scopes line accounts (A4 cross-entity leak)", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("ownedAccounts");
    expect(c).toContain("One or more line accounts are not in this entity");
    expect(c).toContain("inArray(chartOfAccounts.id, lineAccountIds)");
  });

  it("updateInvoice is a gated state machine (A5): no totalAmount, void-only", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).not.toContain("totalAmount: z.string().optional()");
    expect(c).toContain('status: z.literal("voided").optional()');
    expect(c).toContain("Cannot void a paid invoice");
    expect(c).toContain("reverse them before voiding");
    expect(c).toContain('action: "ar.voidInvoice"');
  });

  it("createPayment is atomic compare-and-set (A7) with positive validated amount", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("amount: positiveMoneyString");
    expect(c).toContain("paymentDate: isoDateString");
    expect(c).toContain("Payment amount must be greater than zero");
    expect(c).toContain("Invoice balance changed — refresh and try again");
    expect(c).toContain(
      "balance: sql`${salesInvoices.balance}::numeric - ${amountStr}::numeric`",
    );
    expect(c).not.toContain("return await db.transaction");
  });

  it("delete guards surface clear conflicts (A6) and deletePayment restores invoice state (A11)", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("reverse the payments before deleting");
    expect(c).toContain("deactivate them instead of deleting");
    expect(c).toContain(
      "COALESCE(SUM(${paymentsAr.amount}::numeric), 0)::text",
    );
  });
});

describe("P3-A: numbering + dialog integrity", () => {
  it("getNextInvoiceNumber is max-sequence based, not count based (A8)", () => {
    const c = fs.readFileSync(INVOICING_ROUTER, "utf-8");
    expect(c).toContain("maxSeq");
    expect(c).toContain("parseInt(suffix, 10)");
    expect(c).not.toContain("const sequence = (result?.count ?? 0) + 1;");
  });

  it("create dialog validates lines instead of silently dropping them (A10)", () => {
    const c = fs.readFileSync(DIALOG, "utf-8");
    expect(c).toContain("isValidMoney");
    expect(c).toContain("lineErrors");
    expect(c).toContain("invalidLineCount");
    expect(c).toContain("Fix ${invalidLineCount} line item");
    expect(c).not.toContain("const validLines = lines.filter");
  });
});
