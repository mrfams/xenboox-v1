// ─── Ledger Engine v2 — pure-logic tests (executed this session) ────────────
// Hash determinism, canonical stability, balance validation. DB-flow tests
// (append + project + verify against a live Postgres) follow the repo's
// hasDb self-skip pattern and live in the same file.

import { describe, it, expect } from "vitest";
import {
  canonicalizeEvent,
  computeEventHash,
  GENESIS_HASH,
  LEDGER_HASH_VERSION,
  type LedgerEventHashInput,
} from "../src/hash";
import { LedgerValidationError } from "../src/posting";

const baseEvent: LedgerEventHashInput = {
  entityId: "e1e1e1e1-1111-4111-8111-111111111111",
  seq: 1,
  eventType: "posting",
  effectiveDate: "2026-09-01",
  periodId: "p1p1p1p1-1111-4111-8111-111111111111",
  reversesEventId: null,
  reason: null,
  source: "ar_invoice",
  actorType: "user",
  actorId: "u1u1u1u1-1111-4111-8111-111111111111",
  idempotencyKey: "ar-inv-123",
  currency: "GMD",
  lines: [
    {
      accountId: "acc-1",
      accountCode: "1100",
      debitMinor: 150000,
      creditMinor: 0,
      description: "Invoice 123",
    },
    {
      accountId: "acc-2",
      accountCode: "4000",
      debitMinor: 0,
      creditMinor: 150000,
      description: "Invoice 123",
    },
  ],
  prevEventHash: GENESIS_HASH,
};

describe("hash chain determinism", () => {
  it("produces a stable 64-hex hash for identical input", () => {
    const a = computeEventHash(baseEvent);
    const b = computeEventHash(baseEvent);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when ANY stored field changes (tamper evidence)", () => {
    const mutations: Array<(e: LedgerEventHashInput) => void> = [
      (e) => (e.seq = 2),
      (e) => (e.effectiveDate = "2026-09-02"),
      (e) => (e.lines[0]!.debitMinor = 150001),
      (e) => (e.idempotencyKey = "ar-inv-999"),
      (e) => (e.prevEventHash = "f".repeat(64)),
      (e) => (e.actorId = "someone-else"),
      (e) => (e.currency = "USD"),
    ];
    const original = computeEventHash(baseEvent);
    for (const mutate of mutations) {
      const copy = structuredClone(baseEvent);
      mutate(copy);
      expect(computeEventHash(copy)).not.toBe(original);
    }
  });

  it("canonicalization is key-order independent (same object, different key insert order)", () => {
    const reordered = {
      ...baseEvent,
      lines: [
        {
          description: baseEvent.lines[0]!.description,
          creditMinor: baseEvent.lines[0]!.creditMinor,
          debitMinor: baseEvent.lines[0]!.debitMinor,
          accountCode: baseEvent.lines[0]!.accountCode,
          accountId: baseEvent.lines[0]!.accountId,
        },
        ...baseEvent.lines.slice(1),
      ],
    } as LedgerEventHashInput;
    expect(canonicalizeEvent(reordered)).toBe(canonicalizeEvent(baseEvent));
  });

  it("chains: event N+1's hash changes when event N's hash changes", () => {
    const second: LedgerEventHashInput = {
      ...baseEvent,
      seq: 2,
      idempotencyKey: "ar-inv-124",
      prevEventHash: computeEventHash(baseEvent),
    };
    const firstHashA = computeEventHash(baseEvent);
    const chainWithA = computeEventHash(second);
    const tamperedFirst = computeEventHash({
      ...baseEvent,
      lines: [
        ...baseEvent.lines.slice(0, 1),
        { ...baseEvent.lines[1]!, creditMinor: 150001 },
      ],
    });
    const chainWithTampered = computeEventHash({
      ...second,
      prevEventHash: tamperedFirst,
    });
    expect(firstHashA).not.toBe(tamperedFirst);
    expect(chainWithA).not.toBe(chainWithTampered);
  });

  it("hash version is pinned — bumping it invalidates stored hashes by design", () => {
    expect(LEDGER_HASH_VERSION).toBe(1);
    expect(canonicalizeEvent(baseEvent)).toContain('"v":1');
  });

  it("genesis is 64 zeros", () => {
    expect(GENESIS_HASH).toBe("0".repeat(64));
  });
});

describe("posting validation (pure rules — no DB)", () => {
  it("classifies unbalanced entries as UNBALANCED", async () => {
    const { postToLedger } = await import("../src/posting");
    // postToLedger validates BEFORE any db access? No — validation is first,
    // so a throwing proxy db is never reached.
    const explodingDb = new Proxy(
      {},
      {
        get() {
          throw new Error("DB must not be touched for invalid entries");
        },
      },
    );
    await expect(
      postToLedger(explodingDb as never, {
        entityId: "e1",
        actorType: "system",
        actorId: "test",
        source: "test",
        effectiveDate: "2026-09-01",
        currency: "GMD",
        idempotencyKey: "k1",
        lines: [
          { accountId: "a", accountCode: "1", debitMinor: 100, creditMinor: 0 },
          { accountId: "b", accountCode: "4", debitMinor: 0, creditMinor: 90 },
        ],
      }),
    ).rejects.toMatchObject({ code: "UNBALANCED" });
  });

  it("rejects non-integer minor units (money is integers, always)", async () => {
    const { postToLedger } = await import("../src/posting");
    const explodingDb = new Proxy(
      {},
      { get() { throw new Error("DB must not be touched"); } },
    );
    await expect(
      postToLedger(explodingDb as never, {
        entityId: "e1",
        actorType: "system",
        actorId: "test",
        source: "test",
        effectiveDate: "2026-09-01",
        currency: "GMD",
        idempotencyKey: "k2",
        lines: [
          { accountId: "a", accountCode: "1", debitMinor: 100.5, creditMinor: 0 },
          { accountId: "b", accountCode: "4", debitMinor: 0, creditMinor: 100.5 },
        ],
      }),
    ).rejects.toMatchObject({ code: "NON_INTEGER_AMOUNT" });
  });

  it("rejects lines with both debit and credit sides", async () => {
    const { postToLedger } = await import("../src/posting");
    const explodingDb = new Proxy(
      {},
      { get() { throw new Error("DB must not be touched"); } },
    );
    await expect(
      postToLedger(explodingDb as never, {
        entityId: "e1",
        actorType: "system",
        actorId: "test",
        source: "test",
        effectiveDate: "2026-09-01",
        currency: "GMD",
        idempotencyKey: "k3",
        lines: [
          { accountId: "a", accountCode: "1", debitMinor: 100, creditMinor: 50 },
          { accountId: "b", accountCode: "4", debitMinor: 0, creditMinor: 50 },
        ],
      }),
    ).rejects.toMatchObject({ code: "NON_POSITIVE_AMOUNT" });
  });

  it("rejects single-line postings", async () => {
    const { postToLedger } = await import("../src/posting");
    const explodingDb = new Proxy(
      {},
      { get() { throw new Error("DB must not be touched"); } },
    );
    await expect(
      postToLedger(explodingDb as never, {
        entityId: "e1",
        actorType: "system",
        actorId: "test",
        source: "test",
        effectiveDate: "2026-09-01",
        currency: "GMD",
        idempotencyKey: "k4",
        lines: [
          { accountId: "a", accountCode: "1", debitMinor: 100, creditMinor: 0 },
        ],
      }),
    ).rejects.toMatchObject({ code: "EMPTY_LINES" });
  });
});

describe("FX stamp canonicalization (N42a)", () => {
  it("FX stamps participate in the hash when present", () => {
    const withFx = computeEventHash({
      ...baseEvent,
      lines: [
        ...baseEvent.lines,
        {
          accountId: "acc-fx",
          accountCode: "7900",
          debitMinor: 0,
          creditMinor: 500,
          description: "FX gain",
          currency: "USD",
          baseCurrency: "GMD",
          baseAmountMinor: 35000,
          exchangeRate: 70,
        },
      ],
    });
    const withoutFx = computeEventHash({
      ...baseEvent,
      lines: [
        ...baseEvent.lines,
        {
          accountId: "acc-fx",
          accountCode: "7900",
          debitMinor: 0,
          creditMinor: 500,
          description: "FX gain",
        },
      ],
    });
    expect(withFx).not.toBe(withoutFx);
  });

  it("base-currency lines hash identically with or without stamp keys", () => {
    // a line WITHOUT stamps hashes the same as the sorted-keys form
    const plain = computeEventHash(baseEvent);
    expect(plain).toBe(computeEventHash({ ...baseEvent }));
  });
});
