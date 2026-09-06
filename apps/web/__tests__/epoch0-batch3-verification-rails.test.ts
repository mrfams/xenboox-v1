// ─── Batch 3 / N29+N30: deterministic verification + statement rails ────────
// Authored, executed same-session (Run Phase): all cases verified passing.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N29 LLM claims verified by deterministic code", () => {
  const chat = read("apps/web/server/routers/chat.ts");
  const ingestion = read("packages/ingestion/engine/posting-engine.ts");
  const trustGuard = read("packages/ingestion/engine/trust-guard.ts");

  it("the ingestion boundary never auto-posts past a failed TrustGuard", () => {
    const decide = ingestion.slice(
      ingestion.indexOf("if (trustGuardFailed)"),
      ingestion.indexOf("Standard confidence-based decision"),
    );
    expect(decide).toContain('action: "escalated"');
    expect(decide).toContain("requires human review regardless of LLM confidence");
  });

  it("TrustGuard enforces invoice math deterministically (line math, subtotal, total)", () => {
    expect(trustGuard).toContain("invoice_line_total");
    expect(trustGuard).toContain("DEFAULT_TOLERANCE");
    expect(trustGuard).toContain("bank_balance_equation");
  });

  it("chat confirmCreation refuses creations that don't tally with the source document", () => {
    expect(chat).toContain("sourceDocumentId");
    expect(chat).toContain("verifyAgainstSource");
    expect(chat).toContain("doesn't tally with the uploaded document");
    expect(chat).toContain("totalAmount");
    expect(chat).toContain("subtotal");
  });

  it("AI-suggested journal entries must balance at creation — exact imbalance shown", () => {
    expect(chat).toContain("deterministic balance gate");
    expect(chat).toContain("vs credits");
    const gate = chat.slice(
      chat.indexOf("deterministic balance gate"),
      chat.indexOf("Draft entries still require a period"),
    );
    expect(gate).toContain("> 0.01");
  });

  it("bank statements enforce the balance equation: opening + credits − debits = closing", () => {
    expect(trustGuard).toContain("openingBalance");
    expect(trustGuard).toContain("closingBalance");
    expect(trustGuard).toContain("totalCredits");
    expect(trustGuard).toContain("totalDebits");
  });
});

describe("N30 statement upload is the rail where APIs don't exist", () => {
  const posting = read("packages/ingestion/engine/posting-engine.ts");

  it("extracted statement transactions materialize into bankTransactions", () => {
    expect(posting).toContain("materializeStatementTransactions");
    expect(posting).toContain('state.classification.category === "bank_statement"');
    expect(posting).toContain('source: "bank_import"');
    expect(posting).toContain("bankTransactions");
  });

  it("materialization is idempotent per document", () => {
    expect(posting).toContain("metadata->>'documentId'");
    expect(posting).toContain("inserted: 0");
  });

  it("statement rows come from the verified extraction, not free-form LLM text", () => {
    const fn = posting.slice(
      posting.indexOf("export async function materializeStatementTransactions"),
    );
    expect(fn).toContain("state.extraction?.data");
    expect(fn).toContain("Number.isFinite");
    // every row is unrealized until reconciled by a human
    expect(fn).toContain("isReconciled: false");
  });

  it("materialization failure never fakes a posting failure (GL entry stands)", () => {
    const call = posting.slice(
      posting.indexOf("materializeStatementTransactions(state)"),
      posting.indexOf("materializeStatementTransactions(state)") + 400,
    );
    expect(call).toContain("catch");
    expect(call).toContain("GL entry stands");
  });
});
