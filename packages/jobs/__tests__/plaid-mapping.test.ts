import { describe, it, expect } from "vitest";

import {
  mapPlaidTransaction,
  plaidMagnitude,
  plaidType,
} from "../lib/plaid-mapping";

describe("Plaid transaction mapping", () => {
  it("maps a POSITIVE Plaid amount (money OUT / purchase) to a withdrawal", () => {
    // Plaid docs: positive = cash debited, e.g. a $50 coffee purchase.
    expect(plaidType({ amount: 50.0 })).toBe("withdrawal");
    expect(plaidMagnitude({ amount: 50.0 })).toBe("50");
  });

  it("maps a NEGATIVE Plaid amount (money IN / deposit) to a deposit", () => {
    // Plaid docs: negative = cash credited, e.g. a payroll deposit.
    expect(plaidType({ amount: -2000.0 })).toBe("deposit");
    expect(plaidMagnitude({ amount: -2000.0 })).toBe("2000");
  });

  it("regression: never maps positive purchases to deposits", () => {
    // This exact inversion shipped in production sync jobs — a purchase
    // stored as a deposit corrupted cash-flow direction at the source.
    expect(plaidType({ amount: 2307.21 })).toBe("withdrawal");
    expect(plaidType({ amount: -42.5 })).toBe("deposit");
  });

  it("stores the magnitude, never the sign", () => {
    expect(plaidMagnitude({ amount: -123.45 })).toBe("123.45");
    expect(plaidMagnitude({ amount: 0 })).toBe("0");
  });

  it("maps a full added transaction with valueDate fallback", () => {
    const mapped = mapPlaidTransaction({
      transaction_id: "tx-1",
      account_id: "acct-1",
      amount: -750.25,
      date: "2024-01-15",
      name: "ACME CORP PAYROLL",
      merchant_name: "ACME",
      payment_channel: "online",
      pending: false,
    });
    expect(mapped.type).toBe("deposit");
    expect(mapped.amount).toBe("750.25");
    expect(mapped.valueDate).toBe("2024-01-15");
    expect(mapped.transactionId).toBe("tx-1");
  });
});
