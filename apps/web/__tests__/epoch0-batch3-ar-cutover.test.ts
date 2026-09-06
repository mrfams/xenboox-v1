// ─── Batch 3 / N37: AR invoice cut-over behind LEDGER_PRIMARY_AR ────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N37 AR invoice cut-over", () => {
  const ar = read("apps/web/server/ar-posting.ts");

  it("the cut-over flag makes the engine authoritative", () => {
    expect(ar).toContain('process.env.LEDGER_PRIMARY_AR === "true"');
    expect(ar).toContain("postToLedger(db, {");
    expect(ar).toContain("toLedgerLines(jeLines)");
    expect(ar).toContain('idempotencyKey: reference');
  });

  it("engine failure aborts everything; legacy-mirror failure leaves the event standing", () => {
    const flagBranch = ar.slice(
      ar.indexOf('LEDGER_PRIMARY_AR === "true"'),
      ar.indexOf("// Legacy-primary path"),
    );
    expect(flagBranch).toContain("engine posting failed");
    expect(flagBranch).toContain('reason: "journal_skipped"');
    expect(flagBranch).toContain("parity verifier will reconcile");
    // mirror runs AFTER the engine commit
    expect(flagBranch.indexOf("postToLedger(db, {")).toBeLessThan(
      flagBranch.indexOf("createPostedJournal({"),
    );
  });

  it("both paths link the invoice and write the same audit action", () => {
    const count = (ar.match(/action: "ar.postInvoice"/g) || []).length;
    // linkInvoice is shared by both branches — exactly one definition
    expect(count).toBe(1);
    expect(ar).toContain("const linkInvoice = async");
  });

  it("legacy-primary path is preserved as the default", () => {
    expect(ar).toContain("// Legacy-primary path (default until cut-over completes)");
    expect(ar).toContain("createPostedJournal({");
  });

  it("invoice fetch now selects currency (engine needs the real currency)", () => {
    expect(ar).toMatch(/status: true,\s*\n\s*currency: true,/);
  });
});
