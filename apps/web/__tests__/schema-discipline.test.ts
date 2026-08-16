// ─── §17.5 NUMERIC integrity & JSONB discipline ────────────────────────────
//
// Two schema-level rules, enforced in CI so NEW columns can't violate them:
//
// 1. FLOAT/REAL is never used for money. PostgreSQL `real`/`double precision`
//    are binary floating point — rounding drift on financial values is
//    unacceptable. Money must be NUMERIC. REAL is tolerated ONLY for
//    statistical/non-monetary fields (e.g. agent confidence 0-1).
//
// 2. JSONB is restricted to extensible/metadata payloads (webhook bodies,
//    custom fields, audit before/after snapshots, agent eval outputs) — it
//    must NEVER hold core ledger data (journal lines, invoice totals, etc.)
//    where queryability and integrity matter.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_DIR = join(process.cwd(), "../../packages/db/schema");
const schemaFiles = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".ts"));

// Column names that signal money. `real`/`doublePrecision` on any of these
// is a rule violation.
const MONEY_NAME =
  /\b(amount|balance|rate|price|total|debit|credit|value|charge|fee|salary|tax|revenue|expense|cost|payment|principal|interest|premium|payout)\b/i;

// JSONB column names allowed on ledger tables (extensible/metadata payloads).
const ALLOWED_JSONB_NAME =
  /\b(metadata|data|payload|breakdown|output|basis|pipelines|values|config|preferences|settings|extra|details|snapshot|components|before|after|fields|attributes)\b/i;

// Ledger-critical tables where JSONB must be strictly limited.
const LEDGER_TABLES = new Set([
  "journalEntries",
  "journalEntryLines",
  "transactions",
  "invoicesAp",
  "invoicesAr",
  "salesInvoices",
  "purchaseOrders",
  "chartOfAccounts",
  "bankAccounts",
  "payrollRuns",
  "payrollRunLines",
  "assets",
  "budgets",
  "budgetLines",
]);

describe("§17.5 — never use FLOAT/DOUBLE for money", () => {
  it("no real/doublePrecision column has a money name", () => {
    const violations: string[] = [];
    for (const f of schemaFiles) {
      const src = readFileSync(join(SCHEMA_DIR, f), "utf8");
      for (const m of src.matchAll(/\b(real|doublePrecision)\("([^"]+)"/g)) {
        if (MONEY_NAME.test(m[2]!)) {
          violations.push(`${f}: ${m[2]} is ${m[1]} — money must be NUMERIC`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("§17.5 — JSONB restricted to metadata/extensible payloads", () => {
  it("no JSONB column on a ledger table unless it is an allowed metadata name", () => {
    const violations: string[] = [];
    for (const f of schemaFiles) {
      const src = readFileSync(join(SCHEMA_DIR, f), "utf8");
      // Walk each ledger table definition and its jsonb columns.
      for (const tableName of LEDGER_TABLES) {
        const tableMatch = src.match(
          new RegExp(
            `export const ${tableName}\\b[\\s\\S]*?=\\s*(pgTable|sqliteTable)\\("([^"]+)",\\s*{([\\s\\S]*?)},\\s*\\([^)]*\\)\\s*\\)`,
          ),
        );
        if (!tableMatch) continue;
        const body = tableMatch[3]!;
        for (const j of body.matchAll(/\bjsonb\("([^"]+)"/g)) {
          if (!ALLOWED_JSONB_NAME.test(j[1]!)) {
            violations.push(
              `${f}: ${tableName}.${j[1]} is jsonb — not allowed on ledger data`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("JSONB is otherwise available for extensible payloads (metadata present)", () => {
    // Sanity: the discipline doesn't ban JSONB entirely — it must exist for
    // metadata-style columns.
    const accounting = readFileSync(join(SCHEMA_DIR, "accounting.ts"), "utf8");
    expect(accounting).toMatch(/jsonb\("metadata"/);
  });
});
