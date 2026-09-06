// ─── Batch 3 / N26+N27: posting hygiene leftovers ───────────────────────────
// Authored RED-first; Run Phase pending.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("N26 no post-then-cleanup in the posting paths", () => {
  const core = readFileSync("apps/web/server/journal-posting-core.ts", "utf8");
  const ar = readFileSync("apps/web/server/ar-posting.ts", "utf8");
  const ap = readFileSync("apps/web/server/ap-posting.ts", "utf8");

  it("cleanupJournal is deleted everywhere", () => {
    expect(core).not.toContain("cleanupJournal");
    expect(ar).not.toContain("cleanupJournal");
    expect(ap).not.toContain("cleanupJournal");
  });

  it("createPostedJournal supports in-transaction document linking", () => {
    expect(core).toContain("linkInsideTx");
    expect(core).toMatch(/linkInsideTx[\s\S]*journalEntryId/);
  });

  it("AR invoice, AR payment, AP bill, AP payment link inside the posting tx", () => {
    expect(ar.match(/linkInsideTx:/g)?.length).toBe(2);
    expect(ap.match(/linkInsideTx:/g)?.length).toBe(2);
    for (const src of [ar, ap]) {
      expect(src).not.toMatch(/catch \(linkErr\)/);
    }
  });

  it("void reversals commit lines + original-status flip in ONE transaction", () => {
    for (const src of [ar, ap]) {
      const afterInsertFailed = src.slice(src.indexOf('reversal_insert_failed'));
      expect(afterInsertFailed).toContain('db.transaction');
      expect(afterInsertFailed.indexOf('db.transaction')).toBeLessThan(
        afterInsertFailed.indexOf('reversedBy'),
      );
    }
  });
});

describe("N27 statusCode column typed correctly", () => {
  it("schema declares an integer status_code, migration uses a safe cast", () => {
    const schema = readFileSync("packages/db/schema/idempotency.ts", "utf8");
    expect(schema).toContain('statusCode: integer("status_code")');
    const migration = readFileSync(
      "packages/db/migrations/0040_majestic_gamora.sql",
      "utf8",
    );
    expect(migration).toContain("USING NULL::integer");
  });
});
