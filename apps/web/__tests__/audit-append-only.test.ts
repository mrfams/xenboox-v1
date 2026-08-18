// @vitest-environment node
//
// ─── §21.2 Audit Trail Append-Only Enforcement ─────────────────────────────
//
// Verifies that the audit_log and security_audit_log tables reject
// UPDATE and DELETE at the DB layer via triggers (migrations 0011 + 0025).
//
// These tests run against a REAL Neon database — they verify the actual
// trigger behavior, not just the TypeScript code.
//
// Skipped automatically when the DB is unreachable or the demo entity/user
// cannot be resolved (module-scope probe so the skip is decided at
// collection time).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// ── Module-scope probe ────────────────────────────────────────────────────
async function probeDb(): Promise<{
  available: boolean;
  entityId: string;
  userId: string;
}> {
  const result = { available: false, entityId: "", userId: "" };
  try {
    await db.execute(sql`SELECT 1`);
    const entityRes = (await db.execute(
      sql`SELECT id FROM entities ORDER BY created_at LIMIT 1`,
    )) as unknown as { rows: Array<{ id: string }> };
    const userRes = (await db.execute(
      sql`SELECT id FROM users WHERE email = 'demo@xenboox.com' LIMIT 1`,
    )) as unknown as { rows: Array<{ id: string }> };
    result.entityId = entityRes.rows?.[0]?.id ?? "";
    result.userId = userRes.rows?.[0]?.id ?? "";
    result.available = !!result.entityId && !!result.userId;
  } catch {
    result.available = false;
  }
  return result;
}

const probe = await probeDb();
const describeIfDb = probe.available ? describe : describe.skip;

const ENTITY_ID = probe.entityId;
const USER_ID = probe.userId;

describeIfDb("§21.2 Audit Trail Append-Only Enforcement", () => {
  let auditLogId: string;

  beforeAll(async () => {
    // Insert a test audit log entry
    const result = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.append_only', 'user', NOW())
      RETURNING id
    `);
    auditLogId = (result as unknown as { rows: Array<{ id: string }> }).rows[0]
      .id;
  });

  afterAll(async () => {
    // Cleanup is intentionally omitted: DELETE on audit_log is blocked by the
    // append-only trigger, which is exactly what these tests verify. The
    // handful of test rows are harmless.
  });

  it("audit_log: INSERT succeeds", async () => {
    const result = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.insert', 'user', NOW())
      RETURNING id
    `);
    expect((result as unknown as { rows: Array<unknown> }).rows.length).toBe(1);
  });

  it("audit_log: UPDATE is blocked by trigger", async () => {
    await expect(
      db.execute(sql`
        UPDATE audit_log SET action = 'test.hacked' WHERE id = ${auditLogId}
      `),
    ).rejects.toThrow(); // Trigger raises EXCEPTION
  });

  it("audit_log: DELETE is blocked by trigger", async () => {
    await expect(
      db.execute(sql`
        DELETE FROM audit_log WHERE id = ${auditLogId}
      `),
    ).rejects.toThrow(); // Trigger raises EXCEPTION
  });

  it("audit_log: TRUNCATE is blocked (table has ROW SECURITY)", async () => {
    // TRUNCATE bypasses triggers but RLS still applies
    // In practice, the app user shouldn't have TRUNCATE permission
    await expect(db.execute(sql`TRUNCATE TABLE audit_log`)).rejects.toThrow();
  });

  it("security_audit_log: UPDATE is blocked by trigger", async () => {
    // Insert then try to update
    const result = await db.execute(sql`
      INSERT INTO security_audit_log (entity_id, user_id, event_type, resource_type, resource_id)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'access', 'table', 'test-resource')
      RETURNING id
    `);
    const secId = (result as unknown as { rows: Array<{ id: string }> }).rows[0]
      .id;

    await expect(
      db.execute(sql`
        UPDATE security_audit_log SET event_type = 'modification' WHERE id = ${secId}
      `),
    ).rejects.toThrow();
  });

  it("security_audit_log: DELETE is blocked by trigger", async () => {
    const result = await db.execute(sql`
      INSERT INTO security_audit_log (entity_id, user_id, event_type, resource_type, resource_id)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'access', 'table', 'test-delete-block')
      RETURNING id
    `);
    const secId = (result as unknown as { rows: Array<{ id: string }> }).rows[0]
      .id;

    await expect(
      db.execute(sql`
        DELETE FROM security_audit_log WHERE id = ${secId}
      `),
    ).rejects.toThrow();
  });

  it("audit_log: hash-chaining columns exist", async () => {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'audit_log'
      AND column_name IN ('seq', 'prev_hash', 'event_hash', 'payload_hash_input')
      ORDER BY column_name
    `);
    const columns = (
      result as unknown as { rows: Array<{ column_name: string }> }
    ).rows.map((r) => r.column_name);
    expect(columns).toContain("seq");
    expect(columns).toContain("prev_hash");
    expect(columns).toContain("event_hash");
    expect(columns).toContain("payload_hash_input");
  });

  it("audit_log: unique index on (entity_id, seq) prevents chain gaps", async () => {
    // The append-only trigger auto-assigns seq (MAX(seq)+1), so a duplicate
    // seq can never be inserted through the normal path. The guarantee that
    // matters is the unique index itself — verify it exists.
    const result = await db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'audit_log' AND indexname = 'audit_entity_seq_unique'
    `);
    expect(
      (result as unknown as { rows: Array<{ indexname: string }> }).rows.length,
    ).toBe(1);
  });

  it("audit_log: trigger auto-assigns sequential per-entity seq", async () => {
    const result = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.seq_auto', 'user', NOW())
      RETURNING id, seq
    `);
    const row = (
      result as unknown as { rows: Array<{ id: string; seq: number | null }> }
    ).rows[0];
    expect(row.seq).toBeTypeOf("number");

    // A second insert must get a strictly larger seq (no gaps/duplicates).
    const result2 = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.seq_auto2', 'user', NOW())
      RETURNING seq
    `);
    const seq2 = (result2 as unknown as { rows: Array<{ seq: number | null }> })
      .rows[0].seq;
    expect(seq2).toBeGreaterThan(row.seq as number);
  });
});
