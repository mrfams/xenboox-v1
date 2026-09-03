import { describe, it, expect } from "vitest";

import {
  categorizeByDescription,
  matchBankRules,
  mapProviderCategory,
  normalizeTxType,
} from "../lib/bank-categorizer";

describe("bank categorizer — direction awareness (C1 regression)", () => {
  it("never labels an unmatched withdrawal as Revenue", () => {
    const match = categorizeByDescription({
      description: "RANDOM MERCHANT PURCHASE XYZZY",
      type: "withdrawal",
      amount: 150,
    });
    expect(match).toBeNull();
  });

  it("labels unmatched deposits as low-confidence Revenue only for money in", () => {
    const match = categorizeByDescription({
      description: "UNRECOGNIZED CREDIT INFLOW",
      type: "deposit",
      amount: 1200,
    });
    // Deposit keywords won't fire but provider-less deposit is not classifiable
    // without a signal — the old code stamped Revenue at 0.6 on everything.
    expect(match).toBeNull();
  });

  it("classifies a rent withdrawal as Rent & Lease", () => {
    const match = categorizeByDescription({
      description: "RENT PAYMENT LANDLORD",
      type: "withdrawal",
    });
    expect(match?.category).toBe("Rent & Lease");
    expect(match!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("classifies an electricity bill withdrawal as Utilities", () => {
    const match = categorizeByDescription({
      description: "ELECTRIC COMPANY BILL",
      type: "withdrawal",
    });
    expect(match?.category).toBe("Utilities");
  });

  it("classifies a client payment deposit as Revenue", () => {
    const match = categorizeByDescription({
      description: "CLIENT PAYMENT - ACME CORP",
      type: "deposit",
    });
    expect(match?.category).toBe("Revenue");
  });
});

describe("bank categorizer — provider category mapping (C3)", () => {
  it("maps Plaid personal_finance_category codes", () => {
    expect(mapProviderCategory("FOOD_AND_DRINK")?.category).toBe(
      "Meals & Entertainment",
    );
    expect(mapProviderCategory("TRANSPORTATION")?.category).toBe(
      "Travel & Transport",
    );
    expect(mapProviderCategory("RENT_AND_UTILITIES")?.category).toBe(
      "Rent & Lease",
    );
    expect(mapProviderCategory("BANK_FEES")?.category).toBe("Bank Fees");
  });

  it("maps detailed Plaid category paths by their first segment", () => {
    expect(
      mapProviderCategory("GENERAL_MERCHANDISE:SUPERMARKETS")?.category,
    ).toBe("Office Supplies");
  });

  it("maps Mono freeform categories", () => {
    expect(mapProviderCategory("Food & Drinks")?.category).toBe(
      "Meals & Entertainment",
    );
    expect(mapProviderCategory("Utility")?.category).toBe("Utilities");
  });

  it("returns null for unmappable categories (falls back to heuristics)", () => {
    expect(mapProviderCategory("XYZ_UNKNOWN_CATEGORY_42")).toBeNull();
    expect(mapProviderCategory(null)).toBeNull();
  });

  it("uses provider category through categorizeByDescription", () => {
    const match = categorizeByDescription({
      description: "UBER TRIP 06/14",
      type: "withdrawal",
      providerCategory: "TRANSPORTATION",
    });
    expect(match?.category).toBe("Travel & Transport");
    expect(match!.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe("bank categorizer — user rules (H3 direction-aware amount rules)", () => {
  const rules = [
    {
      matchType: "description_contains",
      matchValue: "netflix",
      category: "Software & Subscriptions",
      glAccountId: "acct-1",
      priority: 1,
    },
    {
      matchType: "amount_above",
      matchValue: "+5000",
      category: "Large Deposit Rule",
      glAccountId: null,
      priority: 2,
    },
    {
      matchType: "amount_above",
      matchValue: "100",
      category: "Any Large Tx",
      glAccountId: null,
      priority: 3,
    },
  ];

  it("rule matches outrank heuristics", () => {
    const match = matchBankRules(
      { description: "NETFLIX SUBSCRIPTION", type: "withdrawal", amount: 15 },
      rules,
    );
    expect(match?.category).toBe("Software & Subscriptions");
    expect(match?.categorizedBy).toBe("rule");
  });

  it("signed + amount rules only apply to deposits", () => {
    const depositMatch = matchBankRules(
      { description: "wire in", type: "deposit", amount: 6000 },
      rules,
    );
    expect(depositMatch?.category).toBe("Large Deposit Rule");

    // Same amount as a withdrawal must NOT match the + rule.
    const withdrawalMatch = matchBankRules(
      { description: "wire out", type: "withdrawal", amount: 6000 },
      rules,
    );
    expect(withdrawalMatch?.category).toBe("Any Large Tx");
  });

  it("respects priority order (lowest number wins)", () => {
    const match = matchBankRules(
      { description: "some payment", type: "deposit", amount: 6000 },
      [
        {
          matchType: "amount_above",
          matchValue: "5000",
          category: "low-priority",
          glAccountId: null,
          priority: 10,
        },
        {
          matchType: "amount_above",
          matchValue: "4000",
          category: "high-priority",
          glAccountId: null,
          priority: 1,
        },
      ],
    );
    expect(match?.category).toBe("high-priority");
  });
});

describe("bank categorizer — type normalization", () => {
  it("normalizes credit/debit to deposit/withdrawal", () => {
    expect(normalizeTxType("credit")).toBe("deposit");
    expect(normalizeTxType("debit")).toBe("withdrawal");
    expect(normalizeTxType("deposit")).toBe("deposit");
    expect(normalizeTxType("fee")).toBe("fee");
    expect(normalizeTxType("unknown")).toBeNull();
    expect(normalizeTxType(null)).toBeNull();
  });
});
