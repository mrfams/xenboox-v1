// ─── Batch 3 / N40+N41: payroll + AR payment cut-overs ──────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N40 payroll cut-over", () => {
  const pipeline = read("packages/agents/core/payroll-pipeline.ts");

  it("branches on LEDGER_PRIMARY_PAYROLL with the engine authoritative", () => {
    expect(pipeline).toContain('process.env.LEDGER_PRIMARY_PAYROLL === "true"');
    expect(pipeline).toContain("postToLedger(db, {");
    expect(pipeline).toContain('idempotencyKey: `payroll-run-${payrollRunId}`');
    expect(pipeline).toContain('actorType: "system"');
  });

  it("all payroll credit components convert to minor units", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_PAYROLL === "true"'),
      pipeline.indexOf("// Sequential entryNumber"),
    );
    for (const part of [
      "majorToMinor(totalEmployerCost)",
      "majorToMinor(totalNetPay)",
      "majorToMinor(totalPaye)",
      "totalSSEmployee + totalSSEmployer",
      "majorToMinor(totalWHT)",
    ]) {
      expect(flagBranch).toContain(part);
    }
  });

  it("an unbalanced payroll is reported honestly, never posted crooked", () => {
    expect(pipeline).toContain('err.code === "UNBALANCED"');
    expect(pipeline).toContain("balanced: false");
  });

  it("legacy mirror is failure-isolated after the engine commit", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_PAYROLL === "true"'),
      pipeline.indexOf("// Sequential entryNumber"),
    );
    expect(flagBranch).toContain("parity verifier will reconcile");
    expect(flagBranch.indexOf("postToLedger(db, {")).toBeLessThan(
      flagBranch.indexOf("createLegacyMirror") === -1
        ? flagBranch.indexOf("insert(journalEntries)")
        : flagBranch.indexOf("createLegacyMirror"),
    );
  });

  it("engine posts before any legacy write", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_PAYROLL === "true"'),
      pipeline.indexOf("// Sequential entryNumber"),
    );
    expect(flagBranch.indexOf("postToLedger(db, {")).toBeLessThan(
      flagBranch.indexOf("insert(journalEntries)"),
    );
  });
});

describe("N41 AR payment cut-over", () => {
  const ar = read("apps/web/server/ar-posting.ts");

  it("branches on LEDGER_PRIMARY_AR with the ar-pay reference key", () => {
    expect((ar.match(/LEDGER_PRIMARY_AR === "true"/g) || []).length).toBe(2);
    expect(ar).toContain("idempotencyKey: reference");
    expect(ar).toContain("ar-pay-${payment.id}");
  });

  it("payment currency comes from the payment row — never hardcoded", () => {
    expect(ar).toContain("currency: payment.currency");
    const flagBranches = ar.split('LEDGER_PRIMARY_AR === "true"').slice(1);
    for (const branch of flagBranches) {
      expect(branch).not.toContain("currency: 'GMD'");
    }
  });

  it("shared linkPayment helper serves both branches", () => {
    expect((ar.match(/const linkPayment = async/g) || []).length).toBe(1);
    expect((ar.match(/linkPayment\(tx, /g) || []).length).toBe(2);
  });

  it("declaration order is valid: jeLines before the flag branch", () => {
    const payFn = ar.slice(ar.indexOf("postArPaymentToLedger"));
    expect(payFn.indexOf("const jeLines = buildArPaymentLines")).toBeLessThan(
      payFn.indexOf('LEDGER_PRIMARY_AR === "true"'),
    );
  });
});
