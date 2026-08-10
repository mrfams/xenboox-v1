import { describe, it, expect } from "vitest";
import { GENESIS_HASH } from "@/lib/audit/chain";
import { backfillAuditChain, type AuditRowInput } from "@/lib/audit/backfill";

const row = (
  overrides: Partial<AuditRowInput> & { id: string },
): AuditRowInput => ({
  entityId: "entity-1",
  action: "create",
  entityType: "invoice",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("backfillAuditChain", () => {
  it("returns an empty result for empty input", () => {
    expect(backfillAuditChain([])).toEqual([]);
  });

  it("assigns per-entity sequential numbers starting at 1", () => {
    const result = backfillAuditChain([
      row({ id: "a1", entityId: "e1" }),
      row({ id: "a2", entityId: "e1", createdAt: new Date("2026-01-02") }),
      row({ id: "b1", entityId: "e2" }),
    ]);
    const e1 = result.filter((r) => r.entityId === "e1");
    const e2 = result.filter((r) => r.entityId === "e2");
    expect(e1.map((r) => r.seq)).toEqual([1, 2]);
    expect(e2.map((r) => r.seq)).toEqual([1]);
    expect(e1[0].prevHash).toBe(GENESIS_HASH);
  });

  it("is deterministic regardless of input order", () => {
    const input = [
      row({ id: "a1", createdAt: new Date("2026-01-01") }),
      row({ id: "a2", createdAt: new Date("2026-01-02") }),
      row({ id: "a3", createdAt: new Date("2026-01-03") }),
    ];
    const fwd = backfillAuditChain(input);
    const rev = backfillAuditChain([...input].reverse());
    expect(fwd).toEqual(rev);
  });

  it("orders by createdAt then id for stable chains", () => {
    const result = backfillAuditChain([
      row({ id: "z", createdAt: new Date("2026-01-01") }),
      row({ id: "a", createdAt: new Date("2026-01-01") }),
    ]);
    expect(result.map((r) => r.id)).toEqual(["a", "z"]);
    expect(result.map((r) => r.seq)).toEqual([1, 2]);
  });

  it("hashes the mapped payload — changing newValues changes the hash", () => {
    const r1 = backfillAuditChain([
      row({ id: "a1", newValues: { amount: "100" } }),
    ]);
    const r2 = backfillAuditChain([
      row({ id: "a1", newValues: { amount: "200" } }),
    ]);
    expect(r1[0].eventHash).not.toBe(r2[0].eventHash);
  });

  it("includes legacy rows (new columns null) without error", () => {
    const result = backfillAuditChain([
      row({ id: "legacy", userId: "u1", action: "update" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].eventHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the id, seq, prevHash, eventHash, and payload text needed for the UPDATE", () => {
    const result = backfillAuditChain([row({ id: "a1" })]);
    expect(result[0]).toEqual({
      id: "a1",
      entityId: "entity-1",
      seq: 1,
      prevHash: GENESIS_HASH,
      eventHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      payloadHashInput: expect.stringMatching(/^\{/),
    });
  });
});
