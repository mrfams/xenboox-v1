import { describe, it, expect } from "vitest";

import {
  buildBankJournalLines,
  deriveBankCode,
  resolveBankGlAccount,
  resolveCategoryGlAccount,
} from "../lib/bank-ledger";
import type { CoaRow } from "../lib/bank-ledger";

const coa: CoaRow[] = [
  {
    id: "bank-1",
    code: "1020",
    name: "Bank Account",
    type: "asset",
    subtype: "bank_account",
  },
  {
    id: "rev-1",
    code: "4000",
    name: "Sales Revenue",
    type: "revenue",
    subtype: "sales_revenue",
  },
  {
    id: "fee-1",
    code: "6100",
    name: "Bank Fees Expense",
    type: "expense",
    subtype: "operating_expense",
  },
  {
    id: "rent-1",
    code: "6200",
    name: "Rent Expense",
    type: "expense",
    subtype: "operating_expense",
  },
];

describe("buildBankJournalLines", () => {
  it("deposit → Dr Bank / Cr Category, balanced", () => {
    const lines = buildBankJournalLines(
      { amount: "1500.50", type: "deposit", description: "CLIENT PAYMENT" },
      "bank-1",
      "rev-1",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      accountId: "bank-1",
      debit: "1500.50",
      credit: "0",
    });
    expect(lines[1]).toMatchObject({
      accountId: "rev-1",
      debit: "0",
      credit: "1500.50",
    });
    expect(debitsTotal(lines)).toBe(creditsTotal(lines));
  });

  it("withdrawal → Cr Bank / Dr Category, balanced", () => {
    const lines = buildBankJournalLines(
      { amount: "89.99", type: "withdrawal", description: "BANK FEE" },
      "bank-1",
      "fee-1",
    );
    expect(lines[0]).toMatchObject({ accountId: "fee-1", debit: "89.99" });
    expect(lines[1]).toMatchObject({ accountId: "bank-1", credit: "89.99" });
    expect(debitsTotal(lines)).toBe(creditsTotal(lines));
  });

  it("interest → Dr Bank / Cr Category (money in)", () => {
    const lines = buildBankJournalLines(
      { amount: "12.00", type: "interest", description: "INTEREST" },
      "bank-1",
      "rev-1",
    );
    expect(lines[0].accountId).toBe("bank-1");
    expect(lines[0].debit).toBe("12.00");
  });

  it("fee → treated as money out", () => {
    const lines = buildBankJournalLines(
      { amount: "5.00", type: "fee", description: "MONTHLY FEE" },
      "bank-1",
      "fee-1",
    );
    expect(lines[0].accountId).toBe("fee-1");
    expect(lines[1].accountId).toBe("bank-1");
  });

  it("transfer → money out side (Cr Bank)", () => {
    const lines = buildBankJournalLines(
      {
        amount: "500.00",
        type: "transfer",
        description: "TRANSFER TO SAVINGS",
      },
      "bank-1",
      "bank-1", // own-account transfer could map bank-to-bank
    );
    expect(lines[0].accountId).toBe("bank-1");
    expect(lines[0].debit).toBe("500.00");
  });
});

describe("resolveBankGlAccount", () => {
  it("reuses the named bank account row", () => {
    const { account } = resolveBankGlAccount(
      [
        {
          id: "b1",
          code: "1020",
          name: "GTBank - 12345",
          type: "asset",
          subtype: "bank_account",
        },
      ],
      { bankAccountName: "GTBank - 12345" },
    );
    expect(account?.id).toBe("b1");
  });

  it("falls back to any bank_account row when name differs", () => {
    const { account } = resolveBankGlAccount(coa, {
      bankAccountName: "Trust Bank - 0001",
    });
    expect(account?.id).toBe("bank-1");
  });

  it("describes a deterministic row to create when none exists", () => {
    const { toCreate } = resolveBankGlAccount([], {
      bankAccountName: "Access Bank - 9999",
      bankName: "Access Bank",
    });
    expect(toCreate).toBeDefined();
    expect(toCreate!.subtype).toBe("bank_account");
    expect(toCreate!.code).toBe(deriveBankCode("Access Bank - 9999"));
    // Deterministic across calls
    const again = resolveBankGlAccount([], {
      bankAccountName: "Access Bank - 9999",
    });
    expect(again.toCreate!.code).toBe(toCreate!.code);
  });
});

describe("resolveCategoryGlAccount", () => {
  it("rule glAccountId wins", () => {
    expect(
      resolveCategoryGlAccount(coa, {
        category: "Rent & Lease",
        ruleGlAccountId: "rent-1",
      }),
    ).toBe("rent-1");
  });

  it("exact name match", () => {
    expect(resolveCategoryGlAccount(coa, { category: "Sales Revenue" })).toBe(
      "rev-1",
    );
  });

  it("substring match on expense/revenue accounts", () => {
    expect(resolveCategoryGlAccount(coa, { category: "Bank Fees" })).toBe(
      "fee-1",
    );
    expect(resolveCategoryGlAccount(coa, { category: "Rent & Lease" })).toBe(
      "rent-1",
    );
  });

  it("returns null for uncategorized / unresolvable", () => {
    expect(
      resolveCategoryGlAccount(coa, { category: "Uncategorized" }),
    ).toBeNull();
    expect(
      resolveCategoryGlAccount(coa, { category: "XYZ Mystery" }),
    ).toBeNull();
    expect(resolveCategoryGlAccount(coa, { category: null })).toBeNull();
  });

  it("does not match asset accounts by accident", () => {
    expect(
      resolveCategoryGlAccount(coa, { category: "Bank Account" }),
    ).toBeNull();
  });
});

function debitsTotal(lines: Array<{ debit: string }>): number {
  return lines.reduce((s, l) => s + Number(l.debit), 0);
}
function creditsTotal(lines: Array<{ credit: string }>): number {
  return lines.reduce((s, l) => s + Number(l.credit), 0);
}
