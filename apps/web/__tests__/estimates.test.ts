import { describe, it, expect } from "vitest";

import {
  computeEstimateTotal,
  validateStatusTransition,
  validateConvertible,
  aggregate1099,
  daysUntil,
  TERMINAL_STATUSES,
  CONVERTIBLE_STATUSES,
  US_1099_THRESHOLD,
  parseEstimateRequest,
  matchCustomer,
} from "@/lib/accounting/estimates";

describe("computeEstimateTotal", () => {
  it("computes quantity × unit price across lines", () => {
    const total = computeEstimateTotal([
      { description: "Consulting", quantity: 2, unitPrice: "500" },
      { description: "License", quantity: 1, unitPrice: "1200.50" },
    ]);
    expect(total).toBe(2200.5);
  });

  it("rounds to 2 decimals", () => {
    const total = computeEstimateTotal([
      { description: "Item", quantity: 3, unitPrice: "0.3333" },
    ]);
    expect(total).toBe(1.0);
  });

  it("returns 0 for empty lines", () => {
    expect(computeEstimateTotal([])).toBe(0);
  });

  it("throws on negative unit price", () => {
    expect(() =>
      computeEstimateTotal([
        { description: "x", quantity: 1, unitPrice: "-5" },
      ]),
    ).toThrow("Invalid unit price");
  });

  it("throws on non-positive quantity", () => {
    expect(() =>
      computeEstimateTotal([
        { description: "x", quantity: 0, unitPrice: "10" },
      ]),
    ).toThrow("Invalid quantity");
  });
});

describe("validateStatusTransition", () => {
  it("allows draft → sent → viewed → accepted", () => {
    expect(validateStatusTransition("draft", "sent")).toBeNull();
    expect(validateStatusTransition("sent", "viewed")).toBeNull();
    expect(validateStatusTransition("viewed", "accepted")).toBeNull();
    expect(validateStatusTransition("draft", "declined")).toBeNull();
  });

  it("allows self-transition", () => {
    expect(validateStatusTransition("draft", "draft")).toBeNull();
  });

  it("rejects transitions from terminal statuses", () => {
    expect(validateStatusTransition("converted", "sent")).toMatch(
      /Cannot change status of a converted estimate/,
    );
    expect(validateStatusTransition("voided", "draft")).toMatch(
      /Cannot change status of a voided estimate/,
    );
  });

  it("rejects unknown statuses", () => {
    expect(validateStatusTransition("draft", "bogus")).toMatch(
      /Unknown status/,
    );
  });
});

describe("validateConvertible", () => {
  it("allows conversion from draft/sent/viewed/accepted", () => {
    for (const status of ["draft", "sent", "viewed", "accepted"]) {
      expect(validateConvertible(status, false)).toBeNull();
    }
  });

  it("rejects already-converted estimates", () => {
    expect(validateConvertible("converted", false)).toMatch(
      /already converted/,
    );
    expect(validateConvertible("accepted", true)).toMatch(/already converted/);
  });

  it("rejects declined/voided/expired conversion", () => {
    expect(validateConvertible("declined", false)).toMatch(
      /Cannot convert a declined estimate/,
    );
    expect(validateConvertible("voided", false)).toMatch(
      /Cannot convert a voided estimate/,
    );
  });
});

describe("aggregate1099", () => {
  it("aggregates payments per payee and marks ≥$600 threshold", () => {
    const summary = aggregate1099([
      {
        payeeId: "a",
        payeeName: "Alice Dev",
        amount: "400",
        taxWithheld: "96",
      },
      {
        payeeId: "a",
        payeeName: "Alice Dev",
        amount: "300",
        taxWithheld: "72",
      },
      {
        payeeId: "b",
        payeeName: "Bob Design",
        amount: "200",
        taxWithheld: "48",
      },
    ]);

    expect(summary).toHaveLength(2);
    const alice = summary.find((c) => c.payeeId === "a")!;
    expect(alice.totalPayments).toBe(700);
    expect(alice.totalWithheld).toBe(168);
    expect(alice.count).toBe(2);
    expect(alice.thresholdMet).toBe(true);

    const bob = summary.find((c) => c.payeeId === "b")!;
    expect(bob.thresholdMet).toBe(false);
  });

  it("sorts by total payments descending", () => {
    const summary = aggregate1099([
      { payeeId: "small", payeeName: "S", amount: "100", taxWithheld: "24" },
      { payeeId: "big", payeeName: "B", amount: "5000", taxWithheld: "1200" },
    ]);
    expect(summary[0].payeeId).toBe("big");
  });

  it("defaults missing names and handles empty input", () => {
    expect(aggregate1099([])).toEqual([]);
    const [c] = aggregate1099([
      { payeeId: "x", payeeName: null, amount: "600", taxWithheld: "144" },
    ]);
    expect(c.payeeName).toBe("Unknown contractor");
    expect(c.thresholdMet).toBe(true);
  });

  it("uses the US $600 statutory threshold", () => {
    expect(US_1099_THRESHOLD).toBe(600);
    const [below] = aggregate1099([
      { payeeId: "p", payeeName: "P", amount: "599.99", taxWithheld: "143.99" },
    ]);
    expect(below.thresholdMet).toBe(false);
  });
});

describe("daysUntil", () => {
  it("computes positive/negative days and null for no expiry", () => {
    const now = new Date("2026-08-08T12:00:00Z");
    expect(daysUntil("2026-08-18T12:00:00Z", now)).toBe(10);
    expect(daysUntil("2026-08-01T12:00:00Z", now)).toBe(-7);
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe("lifecycle constants", () => {
  it("defines terminal and convertible status sets", () => {
    expect(TERMINAL_STATUSES.has("converted")).toBe(true);
    expect(TERMINAL_STATUSES.has("voided")).toBe(true);
    expect(CONVERTIBLE_STATUSES.has("accepted")).toBe(true);
    expect(CONVERTIBLE_STATUSES.has("declined")).toBe(false);
  });
});

describe("parseEstimateRequest (deterministic AI fallback)", () => {
  const CUSTOMERS = ["Acme Corp", "Fatou's Boutique", "Global Health Ltd"];

  it("parses quantity, description, unit price and matches customer", () => {
    const draft = parseEstimateRequest(
      "5 days of consulting at $500 per day for Acme Corp, net 30, valid 30 days",
      CUSTOMERS,
    );
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0].description.toLowerCase()).toContain("consulting");
    expect(draft.lines[0].quantity).toBe(5);
    expect(draft.lines[0].unitPrice).toBe("500");
    expect(draft.customerMatch).toBe("Acme Corp");
    expect(draft.terms).toBe("net30");
    expect(draft.expiryDays).toBe(30);
    expect(draft.source).toBe("deterministic");
    // $ symbol implies USD unless an explicit code or default is given
    expect(draft.currency).toBe("USD");
  });

  it("parses multiple comma-separated lines", () => {
    const draft = parseEstimateRequest(
      "2 laptops at 1500 each, 1 printer at 300 each",
      CUSTOMERS,
      "USD",
    );
    expect(draft.lines).toHaveLength(2);
    expect(draft.lines[0].description.toLowerCase()).toContain("laptop");
    expect(draft.lines[0].quantity).toBe(2);
    expect(draft.lines[0].unitPrice).toBe("1500");
    expect(draft.lines[1].unitPrice).toBe("300");
    expect(draft.currency).toBe("USD");
  });

  it("detects currency from the prompt", () => {
    const draft = parseEstimateRequest(
      "3 days at $400/day for Fatou's Boutique",
      CUSTOMERS,
    );
    expect(draft.currency).toBe("USD");
    expect(draft.customerMatch).toBe("Fatou's Boutique");
  });

  it("parses 'for' as a price connector (5 days for $500)", () => {
    const draft = parseEstimateRequest(
      "5 days of consulting for $500 per day, Acme Corp",
      CUSTOMERS,
    );
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0].quantity).toBe(5);
    expect(draft.lines[0].unitPrice).toBe("500");
    expect(draft.lines[0].description.toLowerCase()).toContain("consulting");
    expect(draft.customerMatch).toBe("Acme Corp");
  });

  it("falls back to a single line when nothing structured parses", () => {
    const draft = parseEstimateRequest("quote for new client onboarding", []);
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0].quantity).toBe(1);
    expect(draft.customerMatch).toBeNull();
  });

  it("leaves customer null when no known customer matches", () => {
    const draft = parseEstimateRequest(
      "5 days consulting at $500/day for Unknown Ltd",
      CUSTOMERS,
    );
    expect(draft.customerMatch).toBeNull();
  });

  it("handles per-hour pricing and expiry", () => {
    const draft = parseEstimateRequest(
      "10 hours of support at $100 per hour, valid 14 days",
      CUSTOMERS,
    );
    expect(draft.lines[0].quantity).toBe(10);
    expect(draft.lines[0].unitPrice).toBe("100");
    expect(draft.expiryDays).toBe(14);
  });
});

describe("matchCustomer", () => {
  it("matches exact and partial customer names", () => {
    expect(matchCustomer("Send quote to Acme Corp please", ["Acme Corp"])).toBe(
      "Acme Corp",
    );
    expect(matchCustomer("for global health ltd", ["Global Health Ltd"])).toBe(
      "Global Health Ltd",
    );
  });

  it("returns null when no customer is mentioned", () => {
    expect(matchCustomer("5 days consulting at $500/day", ["Acme Corp"])).toBe(
      null,
    );
  });

  it("prefers the more distinctive match", () => {
    const customers = ["The Shop", "The Shop Downtown"];
    expect(matchCustomer("quote for The Shop Downtown", customers)).toBe(
      "The Shop Downtown",
    );
  });
});
