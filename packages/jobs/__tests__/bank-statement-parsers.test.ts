import { describe, it, expect } from "vitest";
import { parseBankCSV } from "../lib/bank-csv-parser";
import { parseBankStatementPDF } from "../lib/bank-statement-parser";

describe("parseBankCSV — direction inference", () => {
  it("infers direction from the balance delta when debits are positive numbers (C2)", () => {
    // Many bank exports print withdrawals as positive in a single Amount
    // column — the running balance is the deterministic truth.
    const csv = [
      "Opening Balance: 10000.00",
      "Closing Balance: 11350.00",
      "Date,Description,Amount,Balance",
      "01/01/2024,ATM Withdrawal,500.00,9500.00",
      "02/01/2024,Salary Deposit,2000.00,11500.00",
      "03/01/2024,Online Transfer,150.00,11350.00",
    ].join("\n");

    const r = parseBankCSV(csv);
    expect(r.transactions).toHaveLength(3);
    expect(r.transactions[0]!.type).toBe("debit");
    expect(r.transactions[1]!.type).toBe("credit");
    expect(r.transactions[2]!.type).toBe("debit");
    expect(r.totalDebits).toBeCloseTo(650, 2);
    expect(r.totalCredits).toBeCloseTo(2000, 2);
    // The statement reconciles → no fatal validation errors.
    expect(r.fatalErrors).toEqual([]);
  });

  it("falls back to the sign convention when no balance is available", () => {
    const csv = [
      "Date,Description,Amount",
      "01/01/2024,ATM Withdrawal,-500.00",
      "02/01/2024,Salary Deposit,2000.00",
    ].join("\n");

    const r = parseBankCSV(csv);
    expect(r.transactions[0]!.type).toBe("debit");
    expect(r.transactions[1]!.type).toBe("credit");
    expect(r.fatalErrors).toEqual([]);
    // No balance column and no opening/closing → surfaced as a warning,
    // never silently skipped.
    expect(
      r.parseErrors.some((e) => e.includes("no balance information")),
    ).toBe(true);
  });

  it("keeps explicit debit/credit columns authoritative", () => {
    const csv = [
      "Date,Description,Debit,Credit",
      "01/01/2024,ATM Withdrawal,500.00,",
      "02/01/2024,Salary Deposit,,2000.00",
    ].join("\n");

    const r = parseBankCSV(csv);
    expect(r.transactions[0]!.type).toBe("debit");
    expect(r.transactions[1]!.type).toBe("credit");
  });
});

describe("parseBankCSV — deterministic validation (TrustGuard)", () => {
  it("blocks on a balance equation mismatch", () => {
    const csv = [
      "Opening Balance: 10000.00",
      "Closing Balance: 11200.00",
      "Date,Description,Amount,Balance",
      "01/01/2024,ATM Withdrawal,500.00,9500.00",
      "02/01/2024,Salary Deposit,2000.00,11500.00",
    ].join("\n");

    const r = parseBankCSV(csv);
    expect(r.fatalErrors.length).toBeGreaterThan(0);
    expect(r.fatalErrors[0]).toContain("Balance equation mismatch");
  });

  it("emits a specific header diagnostic when required columns are missing (F7)", () => {
    const csv = ["Date,Amount", "01/01/2024,500.00"].join("\n");

    const r = parseBankCSV(csv);
    expect(r.transactions).toHaveLength(0);
    expect(
      r.fatalErrors.some((e) => e.includes("Could not map required columns")),
    ).toBe(true);
  });

  it("fails fast when no header row exists at all", () => {
    const r = parseBankCSV("Foo,Bar,Baz\na,b,c");
    expect(
      r.fatalErrors.some((e) => e.includes("Could not find header row")),
    ).toBe(true);
  });

  it("blocks on zero rows parsed despite content", () => {
    const csv = [
      "Date,Description,Amount",
      "01/01/2024,,500.00", // missing description → row dropped
    ].join("\n");

    const r = parseBankCSV(csv);
    expect(r.transactions).toHaveLength(0);
    expect(
      r.fatalErrors.some((e) => e.includes("No transactions could be parsed")),
    ).toBe(true);
  });

  it("warns (not blocks) on a single corrupted running balance when opening/closing are absent", () => {
    // 1 bad row = 2 bad pairs; 21 rows → 20 pairs → 10% → warning, not fatal.
    const lines: string[] = ["Date,Description,Amount,Balance"];
    let balance = 20000;
    for (let i = 1; i <= 21; i++) {
      const day = String(i).padStart(2, "0");
      lines.push(`${day}/01/2024,Withdrawal ${i},100.00,${balance.toFixed(2)}`);
      balance -= 100;
    }
    // Corrupt the middle row's balance (row 11 starts at 19000.00).
    lines[11] = lines[11]!.replace(/,19000\.00$/, ",1500.00");

    const r = parseBankCSV(lines.join("\n"));
    expect(r.fatalErrors).toEqual([]);
    expect(
      r.parseErrors.some((e) => e.includes("Running balance is inconsistent")),
    ).toBe(true);
  });

  it("blocks when running-balance corruption is widespread (no opening/closing)", () => {
    const lines: string[] = ["Date,Description,Amount,Balance"];
    let balance = 20000;
    for (let i = 1; i <= 21; i++) {
      const day = String(i).padStart(2, "0");
      lines.push(`${day}/01/2024,Withdrawal ${i},100.00,${balance.toFixed(2)}`);
      balance -= 100;
    }
    // Corrupt 4 rows → ~8 bad pairs of 20 = 40% → fatal.
    for (const idx of [4, 8, 12, 16]) {
      lines[idx] = lines[idx]!.replace(/,([\d]+\.00)$/, ",1500.00");
    }

    const r = parseBankCSV(lines.join("\n"));
    expect(
      r.fatalErrors.some((e) => e.includes("Running balance is inconsistent")),
    ).toBe(true);
  });
});

describe("parseBankCSV — date disambiguation", () => {
  it("parses DD/MM/YYYY as day-first by default", () => {
    const csv = ["Date,Description,Amount", "13/02/2024,Purchase,500.00"].join(
      "\n",
    );
    const r = parseBankCSV(csv);
    expect(r.transactions[0]!.date).toBe("2024-02-13");
  });

  it("detects MM/DD/YYYY when the second field cannot be a month (M2)", () => {
    const csv = ["Date,Description,Amount", "02/13/2024,Purchase,500.00"].join(
      "\n",
    );
    const r = parseBankCSV(csv);
    // 13 cannot be a month → layout must be MM/DD → Feb 13, 2024.
    expect(r.transactions[0]!.date).toBe("2024-02-13");
  });
});

describe("parseBankStatementPDF — deterministic validation", () => {
  const goodStatement = [
    "XYZ Bank",
    "Account: 0123456789",
    "Statement Period: 01/01/2024 to 31/01/2024",
    "Opening Balance: 10000.00",
    "Closing Balance: 11500.00",
    "Date Description Debit Credit Balance",
    "01/01/2024 ATM Withdrawal 500.00 9500.00",
    "02/01/2024 Salary Deposit 2000.00 11500.00",
  ].join("\n");

  it("parses a well-formed statement with no validation errors", () => {
    const r = parseBankStatementPDF(goodStatement);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]!.type).toBe("debit");
    expect(r.transactions[0]!.balance).toBe(9500);
    expect(r.transactions[1]!.type).toBe("credit");
    expect(r.fatalErrors).toEqual([]);
    expect(r.openingBalance).toBe(10000);
    expect(r.closingBalance).toBe(11500);
  });

  it("blocks on a balance equation mismatch (C1)", () => {
    const bad = goodStatement.replace(
      "Closing Balance: 11500.00",
      "Closing Balance: 11200.00",
    );
    const r = parseBankStatementPDF(bad);
    expect(r.fatalErrors.length).toBeGreaterThan(0);
    expect(r.fatalErrors[0]).toContain("Balance equation mismatch");
  });

  it("fails loudly when the transaction table header cannot be found", () => {
    const garbage = [
      "XYZ Bank",
      "Account: 0123456789",
      "Statement Period: 01/01/2024 to 31/01/2024",
      "Opening Balance: 10000.00",
      "Closing Balance: 11500.00",
      "Some random content here",
      "More random content",
    ].join("\n");

    const r = parseBankStatementPDF(garbage);
    expect(
      r.fatalErrors.some((e) =>
        e.includes("Could not locate the transaction table"),
      ),
    ).toBe(true);
  });

  it("fails fast on text too short to be a statement", () => {
    const r = parseBankStatementPDF("Not a statement");
    expect(r.fatalErrors.some((e) => e.includes("too short"))).toBe(true);
  });
});
