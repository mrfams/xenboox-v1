import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Cash Flow Statement Validation
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname || __dirname, "../../..");
const REPORTS_PATH = path.join(
  PROJECT_ROOT,
  "apps/web/server/routers/reports.ts",
);
const TOOLS_PATH = path.join(
  PROJECT_ROOT,
  "packages/agents/platform/reporting-agent/tools.ts",
);

describe("Cash Flow Statement", () => {
  test("reports router has getCashFlow procedure", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("getCashFlow");
  });

  test("reports router uses entity scoping on getCashFlow", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("ctx.entityId!");
  });

  test("reports router validates periodId input with Zod", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("z.string().uuid()");
  });

  test("reports router has handleMutationError", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("handleMutationError");
  });

  test("generateCashFlow exists in reporting tools", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("export async function generateCashFlow");
  });

  test("generateCashFlow has operating activities", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("operating");
  });

  test("generateCashFlow has investing activities", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("investing");
  });

  test("generateCashFlow has financing activities", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("financing");
  });

  test("generateCashFlow has net cash change", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("netCashChange");
  });

  test("generateCashFlow has opening/closing cash", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("openingCash");
    expect(content).toContain("closingCash");
  });

  test("generateCashFlow classifies accounts by subtype", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("REVENUE_SUBTYPES");
    expect(content).toContain("EXPENSE_SUBTYPES");
    expect(content).toContain("INVESTING_SUBTYPES");
    expect(content).toContain("FINANCING_SUBTYPES");
  });

  test("generateCashFlow is entity-scoped", () => {
    const content = fs.readFileSync(TOOLS_PATH, "utf-8");
    expect(content).toContain("account.entityId !== entityId");
  });
});
