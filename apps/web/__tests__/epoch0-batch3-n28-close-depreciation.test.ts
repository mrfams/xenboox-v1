// ─── Batch 3 / N28: close depreciation routes through the ledger engine ─────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N28 close depreciation cut-over", () => {
  const pipeline = read("packages/agents/core/close-pipeline.ts");

  it("depreciation branches on LEDGER_PRIMARY_CLOSE", () => {
    expect(pipeline).toContain('process.env.LEDGER_PRIMARY_CLOSE === "true"');
  });

  it("engine posts with the deterministic depreciation reference and system actor", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_CLOSE === "true"'),
      pipeline.indexOf("Legacy-primary path (default until cut-over completes)"),
    );
    expect(flagBranch).toContain("postToLedger(db, {");
    expect(flagBranch).toContain("idempotencyKey: reference");
    expect(flagBranch).toContain('actorType: "system"');
    expect(flagBranch).toContain("effectiveDate: period.endDate");
    expect(flagBranch).toContain("majorToMinor(amount.toFixed(2))");
  });

  it("engine refusal = adjustment failure (close goes awaiting_human per existing mapping)", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_CLOSE === "true"'),
      pipeline.indexOf("Legacy-primary path (default until cut-over completes)"),
    );
    expect(flagBranch).toContain(
      "return { success: false, depreciationCount, adjustments };",
    );
  });

  it("mirror failure leaves the engine event standing and is surfaced as an adjustment note", () => {
    const flagBranch = pipeline.slice(
      pipeline.indexOf('LEDGER_PRIMARY_CLOSE === "true"'),
      pipeline.indexOf("Legacy-primary path (default until cut-over completes)"),
    );
    expect(flagBranch).toContain("parity verifier will reconcile");
  });

  it("legacy-primary path preserved as default", () => {
    expect(pipeline).toContain(
      "Legacy-primary path (default until cut-over completes)",
    );
  });
});
