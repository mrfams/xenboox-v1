// ─── Audit Chain Backfill ─────────────────────────────────────────────────
//
// The SQL migration backfills existing audit_log rows using the SAME
// expression the trigger uses (jsonb_build_object(...)::text). This module is
// the JS mirror of that expression plus a pure mapper for building chains over
// legacy rows — used by tests and any JS-side backfill tooling. Keep the field
// list and canonicalize() in sync with the trigger in the 0025 migration.

import { buildChain, canonicalize } from "./chain";

/** Shape of a legacy audit_log row as read from the DB. */
export interface AuditRowInput {
  id: string;
  entityId: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityIdRef?: string | null;
  oldValues?: unknown | null;
  newValues?: unknown | null;
  confidence?: string | number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  actorType?: string | null;
  agentId?: string | null;
  reason?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
}

export interface BackfillResult {
  id: string;
  entityId: string;
  seq: number;
  prevHash: string;
  eventHash: string;
  payloadHashInput: string;
}

/**
 * Build the canonical payload TEXT for a row — the exact string the SQL
 * trigger hashes (jsonb_build_object of these fields, ::text). Field list and
 * value coercions MUST mirror the trigger.
 */
export function rowToChainPayload(row: AuditRowInput): string {
  return canonicalize({
    entityId: row.entityId,
    action: row.action,
    entityType: row.entityType,
    entityIdRef: row.entityIdRef ?? null,
    actorType: row.actorType ?? null,
    userId: row.userId ?? null,
    agentId: row.agentId ?? null,
    reason: row.reason ?? null,
    oldValues: (row.oldValues as Record<string, unknown> | null) ?? null,
    newValues: (row.newValues as Record<string, unknown> | null) ?? null,
    // String form — mirrors the SQL trigger's `a_confidence::text` so numeric
    // formatting can never drift between Postgres (numeric::text) and JS.
    confidence: row.confidence != null ? String(Number(row.confidence)) : null,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    sessionId: row.sessionId ?? null,
    requestId: row.requestId ?? null,
    createdAt: row.createdAt.toISOString().slice(0, 19) + "Z",
  });
}

/**
 * Compute the chain for every entity in the input. Returns per-row
 * {id, entityId, seq, prevHash, eventHash, payloadHashInput} tuples in
 * deterministic order.
 */
export function backfillAuditChain(rows: AuditRowInput[]): BackfillResult[] {
  const byEntity = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = byEntity.get(row.entityId) ?? [];
    group.push(row);
    byEntity.set(row.entityId, group);
  }

  const results: BackfillResult[] = [];
  for (const [entityId, entityRows] of byEntity) {
    const chain = buildChain(
      entityRows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        payloadText: rowToChainPayload(r),
      })),
    );
    for (const event of chain) {
      results.push({
        id: event.id,
        entityId,
        seq: event.seq,
        prevHash: event.prevHash,
        eventHash: event.eventHash,
        payloadHashInput: event.payloadText,
      });
    }
  }
  return results;
}
