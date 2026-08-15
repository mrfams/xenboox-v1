import { describe, it, expect } from "vitest";

import {
  GENESIS_HASH,
  canonicalize,
  computeEventHash,
  buildChain,
  verifyChain,
  type ChainEventInput,
} from "@/lib/audit/chain";

// ─── canonicalize ─────────────────────────────────────────────────────────

describe("canonicalize", () => {
  it("is deterministic regardless of object key order", () => {
    const a = { action: "update", newValues: { b: 1, a: 2 }, entityId: "e1" };
    const b = { entityId: "e1", newValues: { a: 2, b: 1 }, action: "update" };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("produces stable output for nested objects and arrays", () => {
    const x = { list: [{ b: 1, a: 2 }], flag: true, n: 5 };
    const y = { n: 5, flag: true, list: [{ a: 2, b: 1 }] };
    expect(canonicalize(x)).toBe(canonicalize(y));
  });

  it("serializes null and undefined identically to jsonb nulls", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(undefined)).toBe("null");
    expect(canonicalize({ a: undefined, b: null })).toBe(
      canonicalize({ a: null, b: null }),
    );
  });
});

// ─── computeEventHash ─────────────────────────────────────────────────────

describe("computeEventHash", () => {
  it("returns a 64-char hex sha256 digest", () => {
    const hash = computeEventHash(
      GENESIS_HASH,
      canonicalize({ action: "create" }),
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for identical input", () => {
    const payloadText = canonicalize({
      action: "create",
      entityType: "invoice",
    });
    expect(computeEventHash(GENESIS_HASH, payloadText)).toBe(
      computeEventHash(GENESIS_HASH, payloadText),
    );
  });

  it("changes when the payload text changes", () => {
    const h1 = computeEventHash(
      GENESIS_HASH,
      canonicalize({ action: "create" }),
    );
    const h2 = computeEventHash(
      GENESIS_HASH,
      canonicalize({ action: "update" }),
    );
    expect(h1).not.toBe(h2);
  });

  it("changes when the previous hash changes (chaining)", () => {
    const payloadText = canonicalize({ action: "create" });
    const h1 = computeEventHash(GENESIS_HASH, payloadText);
    const h2 = computeEventHash("a".repeat(64), payloadText);
    expect(h1).not.toBe(h2);
  });
});

// ─── buildChain ───────────────────────────────────────────────────────────

describe("buildChain", () => {
  const events: ChainEventInput[] = [
    {
      id: "a",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      payloadText: canonicalize({ action: "create", entityIdRef: "inv-1" }),
    },
    {
      id: "b",
      createdAt: new Date("2026-01-01T00:00:01Z"),
      payloadText: canonicalize({ action: "update", entityIdRef: "inv-1" }),
    },
    {
      id: "c",
      createdAt: new Date("2026-01-01T00:00:02Z"),
      payloadText: canonicalize({ action: "approve", entityIdRef: "inv-1" }),
    },
  ];

  it("assigns 1-based sequential numbers", () => {
    const chain = buildChain(events);
    expect(chain.map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it("links the genesis event to GENESIS_HASH", () => {
    const chain = buildChain(events);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
  });

  it("links each event to the previous event's hash", () => {
    const chain = buildChain(events);
    expect(chain[1].prevHash).toBe(chain[0].eventHash);
    expect(chain[2].prevHash).toBe(chain[1].eventHash);
  });

  it("is deterministic for the same events", () => {
    expect(buildChain(events)).toEqual(buildChain([...events].reverse()));
  });

  it("starts a fresh chain for a single event", () => {
    const chain = buildChain([events[0]]);
    expect(chain).toHaveLength(1);
    expect(chain[0].seq).toBe(1);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
  });

  it("returns an empty array for empty input", () => {
    expect(buildChain([])).toEqual([]);
  });
});

// ─── verifyChain ──────────────────────────────────────────────────────────

describe("verifyChain", () => {
  it("verifies a chain built by buildChain", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
      {
        id: "b",
        createdAt: new Date("2026-01-02"),
        payloadText: canonicalize({ action: "update" }),
      },
    ]);
    expect(verifyChain(chain)).toMatchObject({ valid: true, checkedCount: 2 });
  });

  it("reports valid for a single-event chain", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
    ]);
    expect(verifyChain(chain).valid).toBe(true);
  });

  it("detects a tampered payload (hash no longer matches)", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
      {
        id: "b",
        createdAt: new Date("2026-01-02"),
        payloadText: canonicalize({ action: "update" }),
      },
    ]);
    chain[1] = {
      ...chain[1],
      payloadText: canonicalize({ action: "DELETE_ME" }),
    };
    const report = verifyChain(chain);
    expect(report.valid).toBe(false);
    expect(report.firstBrokenSeq).toBe(2);
  });

  it("detects a broken link (prevHash tampered)", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
      {
        id: "b",
        createdAt: new Date("2026-01-02"),
        payloadText: canonicalize({ action: "update" }),
      },
    ]);
    chain[1] = { ...chain[1], prevHash: "f".repeat(64) };
    const report = verifyChain(chain);
    expect(report.valid).toBe(false);
    expect(report.firstBrokenSeq).toBe(2);
  });

  it("detects a missing event (deleted row breaks the link)", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
      {
        id: "b",
        createdAt: new Date("2026-01-02"),
        payloadText: canonicalize({ action: "update" }),
      },
      {
        id: "c",
        createdAt: new Date("2026-01-03"),
        payloadText: canonicalize({ action: "approve" }),
      },
    ]);
    // Simulate deletion of event b: event c's prevHash still points at b's hash.
    const shortened = [chain[0], { ...chain[2] }];
    expect(verifyChain(shortened).valid).toBe(false);
  });

  it("detects reordered events (seq numbers swapped between rows)", () => {
    const chain = buildChain([
      {
        id: "a",
        createdAt: new Date("2026-01-01"),
        payloadText: canonicalize({ action: "create" }),
      },
      {
        id: "b",
        createdAt: new Date("2026-01-02"),
        payloadText: canonicalize({ action: "update" }),
      },
    ]);
    // seq is the authoritative order, so a real reorder attack must also swap
    // the seq numbers — that breaks the prevHash/hash linkage.
    const swapped = [chain[1], chain[0]].map((e, i) => ({ ...e, seq: i + 1 }));
    expect(verifyChain(swapped).valid).toBe(false);
  });

  it("verifies an empty chain as valid with zero events", () => {
    expect(verifyChain([])).toMatchObject({ valid: true, checkedCount: 0 });
  });
});
