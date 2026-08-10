// ─── Tamper-Evident Audit Chain ───────────────────────────────────────────
//
// Pure-TS implementation of the audit hash chain primitives.
//
// Design: each audit_log row stores the exact canonical payload text that was
// hashed (`payload_hash_input`), produced by the PostgreSQL BEFORE-INSERT
// trigger (and the SQL backfill) via `jsonb_build_object(...)::text`. Because
// verification hashes the STORED text — not a re-serialization of the row —
// there is no cross-language JSON-serialization drift between Postgres and
// this module. `canonicalize` below is the JS mirror of the SQL expression,
// used by tests and any JS-side backfill tooling; keep both in sync with the
// trigger in the 0025 migration.
//
// Model: per-entity chains. Each event stores its 1-based `seq` within the
// entity, the SHA-256 `eventHash` of (prevHash + canonical text), and the
// `prevHash` of the event before it. The first event links to GENESIS_HASH.
// Altering any past event (content, sequence, deletion) breaks subsequent
// links and is detected by verifyChain().

import { createHash } from "node:crypto";

/** First hash in every chain. Deterministic: sha256("xenboox-audit-genesis"). */
export const GENESIS_HASH = createHash("sha256")
  .update("xenboox-audit-genesis")
  .digest("hex");

export interface ChainEventInput {
  id: string;
  createdAt: Date;
  /** The exact canonical payload text that was (or will be) hashed. */
  payloadText: string;
}

export interface ChainEvent {
  id: string;
  seq: number;
  prevHash: string;
  eventHash: string;
  createdAt: Date;
  payloadText: string;
}

/**
 * Canonical serialization matching Postgres `jsonb_build_object(...)::text`:
 * keys sorted, one space after `:` and `,` (jsonb's canonical text form), and
 * JSON.stringify escaping (identical to jsonb's for the values Xenboox
 * stores — short escapes for \b \f \n \r \t, \uXXXX for other controls).
 * MUST mirror the SQL trigger's payload expression in the 0025 migration.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map(
      (k) => `${JSON.stringify(k)}: ${canonicalize(obj[k])}`,
    );
    return `{${parts.join(", ")}}`;
  }
  return JSON.stringify(value);
}

/**
 * SHA-256 of the canonical payload text bound to the previous hash. This must
 * match the SQL trigger's `encode(digest(prev || E'\\n' || payload, 'sha256'), 'hex')`.
 */
export function computeEventHash(
  prevHash: string,
  payloadText: string,
): string {
  return createHash("sha256")
    .update(`${prevHash}\n${payloadText}`)
    .digest("hex");
}

/**
 * Build a linked chain from events. Events are sorted by createdAt (then id)
 * for stability, so input order does not matter.
 */
export function buildChain(events: ChainEventInput[]): ChainEvent[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  );

  let prevHash = GENESIS_HASH;
  return sorted.map((event, index) => {
    const eventHash = computeEventHash(prevHash, event.payloadText);
    const chained: ChainEvent = {
      id: event.id,
      seq: index + 1,
      prevHash,
      eventHash,
      createdAt: event.createdAt,
      payloadText: event.payloadText,
    };
    prevHash = eventHash;
    return chained;
  });
}

export interface ChainVerification {
  valid: boolean;
  checkedCount: number;
  /** Sequence number of the first event that broke the chain, if any. */
  firstBrokenSeq: number | null;
}

/**
 * Recompute the chain over the given events and confirm every link and hash
 * matches. Detects tampered payloads, broken prevHash links, reordered or
 * deleted events, and out-of-order seq numbers.
 */
export function verifyChain(events: ChainEvent[]): ChainVerification {
  if (events.length === 0) {
    return { valid: true, checkedCount: 0, firstBrokenSeq: null };
  }

  // Must be contiguous from 1.
  const seqs = events.map((e) => e.seq).sort((a, b) => a - b);
  for (let i = 0; i < seqs.length; i++) {
    if (seqs[i] !== i + 1) {
      return {
        valid: false,
        checkedCount: i,
        firstBrokenSeq: Math.min(...seqs),
      };
    }
  }

  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let prevHash = GENESIS_HASH;
  let expectedSeq = 1;

  for (const event of ordered) {
    if (event.seq !== expectedSeq) {
      return {
        valid: false,
        checkedCount: expectedSeq - 1,
        firstBrokenSeq: event.seq,
      };
    }
    if (event.prevHash !== prevHash) {
      return {
        valid: false,
        checkedCount: expectedSeq - 1,
        firstBrokenSeq: event.seq,
      };
    }
    const expectedHash = computeEventHash(prevHash, event.payloadText);
    if (event.eventHash !== expectedHash) {
      return {
        valid: false,
        checkedCount: expectedSeq - 1,
        firstBrokenSeq: event.seq,
      };
    }
    prevHash = event.eventHash;
    expectedSeq += 1;
  }

  return { valid: true, checkedCount: ordered.length, firstBrokenSeq: null };
}
