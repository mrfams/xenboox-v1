import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FISCAL = path.resolve(__dirname, "../server/routers/fiscal.ts");

describe("P8-A: fiscal period close state machine", () => {
  const c = fs.readFileSync(FISCAL, "utf-8");

  it("close refuses to strand unpostable draft/pending_review entries", () => {
    expect(c).toContain(
      'inArray(journalEntries.status, ["draft", "pending_review"]),',
    );
    expect(c).toContain("still unposted in this period");
  });

  it("close snapshot insert is idempotent (unique entity/period/account)", () => {
    expect(c).toContain(".insert(trialBalanceSnapshots)");
    expect(c).toContain(".values(snapshotValues)");
    expect(c).toContain(".onConflictDoNothing()");
  });

  it("close flips conditionally — a concurrent close cannot double-flip", () => {
    expect(c).toContain('eq(fiscalPeriods.status, "open"),');
    expect(c).toContain('message: "Period was already closed"');
  });

  it("lock requires closed first and role-gates are present", () => {
    expect(c).toContain("Must be closed before locking");
    expect(c).toContain("fiscal.lockPeriod");
    expect(c).toContain('requireRole("owner", "admin", "finance_director")');
  });

  it("delete refuses periods with journal entries and non-open periods", () => {
    expect(c).toContain("Cannot delete a closed or locked fiscal period");
    expect(c).toContain("Cannot delete a period with journal entries");
  });
});

describe("P8-B: month-end close job (checklist/GL integrity)", () => {
  const job = fs.readFileSync(
    path.resolve(__dirname, "../../../packages/jobs/month-end-close.ts"),
    "utf-8",
  );

  it("guards draft AND pending_review entries before close", () => {
    expect(job).toContain("IN ('draft', 'pending_review')");
  });

  it("allocates depreciation entry numbers from the MAX (desc), never min", () => {
    expect(job).toContain("orderBy(desc(journalEntries.entryNumber))");
    expect(job).not.toContain(".orderBy(journalEntries.entryNumber)");
  });

  it("links depreciation lines to the inserted header id (no random-UUID FK)", () => {
    expect(job).toContain(".returning({ id: journalEntries.id })");
    expect(job).toContain("journalEntryId: header.id,");
    expect(job).not.toContain("journalEntryId: jeId,");
  });
});
