import { describe, it, expect } from "vitest";
import { formatConfirmationText } from "../../../packages/agents/core/creation-tools";
import type {
  ParsedInvoice,
  ParsedVendor,
  ParsedCustomer,
  ParsedExpense,
  ParsedJournalEntry,
} from "../../../packages/agents/core/creation-tools";

describe("formatConfirmationText", () => {
  it("formats invoice confirmation with line items", () => {
    const invoice: ParsedInvoice = {
      type: "create_invoice",
      customerName: "Acme Corp",
      customerEmail: "billing@acme.com",
      lines: [
        { description: "Consulting", quantity: 2, unitPrice: 100 },
        { description: "Design", quantity: 1, unitPrice: 250 },
      ],
      currency: "GMD",
      dueInDays: 30,
    };

    const text = formatConfirmationText(invoice);
    expect(text).toContain("Acme Corp");
    expect(text).toContain("billing@acme.com");
    expect(text).toContain("Consulting");
    expect(text).toContain("Design");
    expect(text).toContain("450.00"); // 2*100 + 1*250
    expect(text).toContain("Net 30");
  });

  it("formats invoice with notes", () => {
    const invoice: ParsedInvoice = {
      type: "create_invoice",
      customerName: "Acme Corp",
      lines: [{ description: "Service", quantity: 1, unitPrice: 500 }],
      currency: "USD",
      dueInDays: 15,
      notes: "Please pay promptly",
    };

    const text = formatConfirmationText(invoice);
    expect(text).toContain("Please pay promptly");
    expect(text).toContain("Net 15");
  });

  it("formats vendor confirmation", () => {
    const vendor: ParsedVendor = {
      type: "create_vendor",
      name: "Supply Co",
      email: "info@supply.com",
      phone: "+220 123 4567",
    };

    const text = formatConfirmationText(vendor);
    expect(text).toContain("Supply Co");
    expect(text).toContain("info@supply.com");
    expect(text).toContain("+220 123 4567");
  });

  it("formats customer confirmation", () => {
    const customer: ParsedCustomer = {
      type: "create_customer",
      name: "John Doe",
      email: "john@example.com",
    };

    const text = formatConfirmationText(customer);
    expect(text).toContain("John Doe");
    expect(text).toContain("john@example.com");
  });

  it("formats expense confirmation", () => {
    const expense: ParsedExpense = {
      type: "create_expense",
      description: "Office supplies",
      amount: 500,
      currency: "GMD",
      vendorName: "Stationery Shop",
    };

    const text = formatConfirmationText(expense);
    expect(text).toContain("Office supplies");
    expect(text).toContain("500.00");
    expect(text).toContain("Stationery Shop");
  });

  it("formats journal entry confirmation", () => {
    const je: ParsedJournalEntry = {
      type: "create_journal_entry",
      description: "Record office rent",
      lines: [
        {
          accountCode: "6100",
          accountName: "Rent Expense",
          debit: 5000,
          credit: 0,
        },
        { accountCode: "1100", accountName: "Cash", debit: 0, credit: 5000 },
      ],
    };

    const text = formatConfirmationText(je);
    expect(text).toContain("Record office rent");
    expect(text).toContain("Rent Expense");
    expect(text).toContain("Dr 5000.00");
    expect(text).toContain("Cash");
    expect(text).toContain("Cr 5000.00");
  });

  it("formats journal entry without account names", () => {
    const je: ParsedJournalEntry = {
      type: "create_journal_entry",
      description: "Simple entry",
      lines: [
        { accountCode: "6100", debit: 100, credit: 0 },
        { accountCode: "1100", debit: 0, credit: 100 },
      ],
    };

    const text = formatConfirmationText(je);
    expect(text).toContain("6100");
    expect(text).toContain("1100");
  });
});
