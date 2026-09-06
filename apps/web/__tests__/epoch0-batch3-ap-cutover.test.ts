// ─── Batch 3 / N38: AP bill + payment cut-overs behind LEDGER_PRIMARY_AP ────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N38 AP cut-over", () => {
  const ap = read("apps/web/server/ap-posting.ts");

  it("both bill and payment branch on LEDGER_PRIMARY_AP", () => {
    expect((ap.match(/LEDGER_PRIMARY_AP === "true"/g) || []).length).toBe(2);
  });

  it("engine posts first with the legacy reference as idempotency key", () => {
    expect(ap).toContain('idempotencyKey: reference');
    expect(ap).toContain("toLedgerLines(jeLines)");
    const billBranch = ap.slice(
      ap.indexOf('LEDGER_PRIMARY_AP === "true"'),
      ap.indexOf("Legacy-primary path"),
    );
    expect(billBranch.indexOf("postToLedger(db, {")).toBeLessThan(
      billBranch.indexOf("createPostedJournal({"),
    );
  });

  it("engine failure aborts; mirror failure leaves the event standing", () => {
    expect(ap).toContain("engine posting failed (LEDGER_PRIMARY_AP)");
    expect(ap).toContain("parity verifier will reconcile");
  });

  it("bill currency comes from the bill, payment currency from the bill too", () => {
    expect(ap).toContain("currency: bill.currency");
    expect(ap).not.toContain("currency: 'GMD'");
    expect(ap).not.toContain("currency: 'USD'");
  });

  it("shared link helpers; legacy-primary defaults preserved", () => {
    expect(ap).toContain("const linkBill = async");
    expect(ap).toContain("const linkPayment = async");
    expect((ap.match(/Legacy-primary path/g) || []).length).toBe(2);
  });
});
