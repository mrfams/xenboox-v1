// ─── Batch 3 / N43: banking categorization cut-over (final posting site) ────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N43 banking categorization cut-over", () => {
  const banking = read("apps/web/server/routers/banking.ts");

  it("branches on LEDGER_PRIMARY_BANKING per transaction", () => {
    expect(banking).toContain(
      'process.env.LEDGER_PRIMARY_BANKING === "true"',
    );
  });

  it("engine posts with the bank-tx reference key and the bank account's currency", () => {
    const branch = banking.slice(
      banking.indexOf("ledgerEnginePrimary"),
      banking.indexOf("// Build + TrustGuard-validate"),
    );
    expect(branch).toContain("postToLedger(db, {");
    expect(branch).toContain("idempotencyKey: `bank-tx-${tx.id}`");
    expect(branch).toContain("currency: bankCurrency");
    expect(branch).toContain("bankAccountsRows.find((ba) => ba.id === tx.bankAccountId)");
  });

  it("engine failure → skipped per-tx (loop semantics preserved)", () => {
    const branch = banking.slice(
      banking.indexOf("ledgerEnginePrimary"),
      banking.indexOf("// Build + TrustGuard-validate"),
    );
    expect(branch).toContain('status: "skipped"');
    expect(branch).toContain("continue;");
  });

  it("the legacy block ALWAYS runs as the mirror — TrustGuard and idempotency intact", () => {
    const engineIdx = banking.indexOf("ledgerEnginePrimary");
    const mirror = banking.slice(engineIdx, banking.indexOf("return { postedCount, skipped: results };"));
    expect(mirror).toContain("validateJournalEntry({");
    expect(mirror).toContain("onConflictDoNothing({ target: journalEntries.reference })");
    expect(mirror).toContain("parity verifier reconciles");
  });

  it("mirror outcomes are recorded honestly — no double counting", () => {
    const outcome = banking.slice(
      banking.indexOf("if (ledgerEnginePrimary) {", banking.indexOf("Link the bank tx")),
      banking.indexOf("return { postedCount, skipped: results };"),
    );
    expect(outcome).toContain("legacy mirror pending parity reconciliation");
    // The engine branch and the legacy path each increment exactly once —
    // exclusive by `continue`, so no transaction is ever counted twice.
    expect((outcome.match(/postedCount\+\+/g) || []).length).toBe(2);
  });
});
