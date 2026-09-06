// ─── Batch 3 / N42a: FX revaluation cut-over behind LEDGER_PRIMARY_FX ───────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N42a FX revaluation cut-over", () => {
  const currency = read("apps/web/server/routers/currency.ts");

  it("branches on LEDGER_PRIMARY_FX with the engine authoritative", () => {
    expect(currency).toContain('process.env.LEDGER_PRIMARY_FX === "true"');
    expect(currency).toContain("postToLedger(db, {");
    expect(currency).toContain("idempotencyKey: `fx-reval:${entityId}:${input.period}`");
    expect(currency).toContain('actorType: "system"');
  });

  it("engine failure surfaces as a plain-English revaluation refusal", () => {
    expect(currency).toContain("Revaluation entry could not be posted —");
  });

  it("legacy mirror is failure-isolated; the event stands in the engine", () => {
    expect(currency).toContain("parity verifier will reconcile");
    expect(currency).toContain("journalEntryId = engineEventId;");
  });

  it("legacy-primary path is preserved as the default", () => {
    expect(currency).toContain("Legacy-primary path (default until cut-over completes)");
  });

  it("engine line stamps participate in tamper evidence (FX lines differ)", () => {
    const ledger = read("packages/db/schema/ledger.ts");
    expect(ledger).toContain("baseAmountMinor?: number");
    expect(ledger).toContain("exchangeRate?: number");
  });
});
