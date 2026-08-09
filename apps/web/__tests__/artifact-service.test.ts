import { describe, it, expect } from "vitest";

import { detectArtifactRequest } from "@/lib/chat/artifact-service";

describe("detectArtifactRequest", () => {
  it("detects explicit report generation requests", () => {
    expect(
      detectArtifactRequest(
        "Please generate a profit and loss report for this month",
      ),
    ).toEqual({
      requested: true,
      wantExport: false,
      reportType: "profit_loss",
    });
  });

  it("detects balance sheet, trial balance, and cash flow requests", () => {
    expect(detectArtifactRequest("Can you make a balance sheet?")).toEqual({
      requested: true,
      wantExport: false,
      reportType: "balance_sheet",
    });
    expect(
      detectArtifactRequest("Prepare my trial balance as a document"),
    ).toEqual({
      requested: true,
      wantExport: false,
      reportType: "trial_balance",
    });
    expect(
      detectArtifactRequest("I need a cash flow statement please"),
    ).toEqual({
      requested: true,
      wantExport: false,
      reportType: "cash_flow",
    });
  });

  it("treats CSV/Excel/export mentions as data exports", () => {
    expect(detectArtifactRequest("Export my trial balance to CSV")).toEqual({
      requested: true,
      wantExport: true,
      reportType: "trial_balance",
    });
    expect(detectArtifactRequest("Give me an Excel file of the P&L")).toEqual({
      requested: true,
      wantExport: true,
      reportType: "profit_loss",
    });
  });

  it("detects generic summary document requests", () => {
    expect(
      detectArtifactRequest("Create a summary document of my finances for me"),
    ).toEqual({ requested: true, wantExport: false, reportType: "summary" });
  });

  it("does not fire on plain chat questions", () => {
    expect(detectArtifactRequest("What is my cash balance?")).toEqual({
      requested: false,
    });
    expect(detectArtifactRequest("Explain how depreciation works")).toEqual({
      requested: false,
    });
    expect(detectArtifactRequest("Which invoices are overdue?")).toEqual({
      requested: false,
    });
  });

  it("does not fire on bare report mentions without a request", () => {
    expect(detectArtifactRequest("What reports do you have?")).toEqual({
      requested: false,
    });
  });

  it("handles empty input", () => {
    expect(detectArtifactRequest("")).toEqual({ requested: false });
    expect(detectArtifactRequest("   ")).toEqual({ requested: false });
  });
});
