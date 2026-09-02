import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const BANKING_ROUTER = path.resolve(__dirname, "../server/routers/banking.ts");

const TRANSACTIONS_ROUTER = path.resolve(
  __dirname,
  "../server/routers/transactions.ts",
);

const SCHEMA_PATH = path.resolve(
  __dirname,
  "../../../packages/db/schema/treasury.ts",
);

describe("P1 #4: Bank Auto-Matching", () => {
  it("bankRules table exists with match types", () => {
    const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(content).toContain("bank_rules");
    expect(content).toContain("description_contains");
    expect(content).toContain("description_equals");
    expect(content).toContain("reference_contains");
    expect(content).toContain("amount_equals");
    expect(content).toContain("amount_above");
    expect(content).toContain("amount_below");
  });

  it("banking router has CRUD for bank rules", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("bankRules");
    expect(content).toContain("createRule");
    expect(content).toContain("updateRule");
    expect(content).toContain("deleteRule");
  });

  it("bank rules support priority ordering", () => {
    const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(content).toContain("priority");
  });

  it("bank rules are entity-scoped", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("eq(bankRules.entityId, entityId)");
  });

  it("transactions router has auto-categorization", () => {
    const content = fs.readFileSync(TRANSACTIONS_ROUTER, "utf-8");
    expect(content).toContain("auto-categoriz");
    expect(content).toContain("categoriz");
  });

  it("bank transactions support categorization fields", () => {
    const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(content).toContain("category");
    expect(content).toContain("categorization_confidence");
    expect(content).toContain("categorized_by");
  });

  it("bank rules link to GL accounts for proper posting", () => {
    const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(content).toContain("gl_account_id");
  });

  it("bank rules can be activated/deactivated", () => {
    const content = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(content).toContain("is_active");
  });
});
