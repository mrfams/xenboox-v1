import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Bank Feed Import Validation
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname || __dirname, "../../..");
const PLAID_LINK = path.join(
  PROJECT_ROOT,
  "apps/web/app/api/plaid/create-link-token/route.ts",
);
const PLAID_EXCHANGE = path.join(
  PROJECT_ROOT,
  "apps/web/app/api/plaid/exchange-token/route.ts",
);
const BANKING_ROUTER = path.join(
  PROJECT_ROOT,
  "apps/web/server/routers/banking.ts",
);
const INTEGRATIONS_SCHEMA = path.join(
  PROJECT_ROOT,
  "packages/db/schema/integrations.ts",
);
const TREASURY_SCHEMA = path.join(
  PROJECT_ROOT,
  "packages/db/schema/treasury.ts",
);

describe("Bank Feed Import", () => {
  test("Plaid link token route exists", () => {
    expect(fs.existsSync(PLAID_LINK)).toBe(true);
  });

  test("Plaid link token has entity access verification", () => {
    const content = fs.readFileSync(PLAID_LINK, "utf-8");
    expect(content).toContain("resolveEntityAccess");
  });

  test("Plaid link token has demo mode fallback", () => {
    const content = fs.readFileSync(PLAID_LINK, "utf-8");
    expect(content).toContain("isDemoMode");
  });

  test("Plaid exchange token route exists", () => {
    expect(fs.existsSync(PLAID_EXCHANGE)).toBe(true);
  });

  test("Plaid exchange creates bank connection", () => {
    const content = fs.readFileSync(PLAID_EXCHANGE, "utf-8");
    expect(content).toContain("bankConnections");
  });

  test("Plaid exchange creates bank account", () => {
    const content = fs.readFileSync(PLAID_EXCHANGE, "utf-8");
    expect(content).toContain("bankAccounts");
  });

  test("Plaid exchange has entity scoping", () => {
    const content = fs.readFileSync(PLAID_EXCHANGE, "utf-8");
    expect(content).toContain("resolveEntityAccess");
  });

  test("Banking router has listTransactions endpoint", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("listTransactions");
  });

  test("Banking router has listConnections endpoint", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("listConnections");
  });

  test("Banking router has listRules endpoint", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("listRules");
  });

  test("Integrations schema has bankConnections table", () => {
    const content = fs.readFileSync(INTEGRATIONS_SCHEMA, "utf-8");
    expect(content).toContain("bankConnections");
  });

  test("Treasury schema has bankAccounts table", () => {
    const content = fs.readFileSync(TREASURY_SCHEMA, "utf-8");
    expect(content).toContain("bankAccounts");
  });

  test("Treasury schema has bankTransactions table", () => {
    const content = fs.readFileSync(TREASURY_SCHEMA, "utf-8");
    expect(content).toContain("bankTransactions");
  });

  test("Treasury schema has bankRules for auto-categorization", () => {
    const content = fs.readFileSync(TREASURY_SCHEMA, "utf-8");
    expect(content).toContain("bankRules");
  });
});
