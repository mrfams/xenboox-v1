// ─── §21.2 Audit Trail Append-Only Enforcement ─────────────────────────────
//
// Verifies that the audit_log and security_audit_log tables reject
// UPDATE and DELETE at the DB layer via triggers (migrations 0011 + 0025).
//
// These tests run against a REAL Neon database — they verify the actual
// trigger behavior, not just the TypeScript code.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const ENTITY_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";

// Skip if no real DB connection (CI without Neon)
const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("§21.2 Audit Trail Append-Only Enforcement", () => {
  let auditLogId: string;

  beforeAll(async () => {
    // Insert a test audit log entry
    const result = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.append_only', 'user', NOW())
      RETURNING id
    `);
    auditLogId = (result as unknown as any[])[0].id;
  });

  afterAll(async () => {
    // Cleanup — note: this DELETE itself will be blocked by the trigger!
    // We need to use a direct SQL connection that bypasses the trigger,
    // or just leave test data (it's harmless).
    // For test isolation, we rely on the test entity ID being unique.
  });

  it("audit_log: INSERT succeeds", async () => {
    const result = await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.insert', 'user', NOW())
      RETURNING id
    `);
    expect((result as unknown as any[]).length).toBe(1);
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
    const secId = (result as unknown as any[])[0].id;

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
    const secId = (result as unknown as any[])[0].id;

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
    const columns = (result as unknown as any[]).map((r: any) => r.column_name);
    expect(columns).toContain("seq");
    expect(columns).toContain("prev_hash");
    expect(columns).toContain("event_hash");
    expect(columns).toContain("payload_hash_input");
  });

  it("audit_log: unique constraint on (entity_id, seq) prevents chain gaps", async () => {
    // Try to insert two entries with the same seq — should fail
    await db.execute(sql`
      INSERT INTO audit_log (entity_id, user_id, action, entity_type, seq, created_at)
      VALUES (${ENTITY_ID}, ${USER_ID}, 'test.seq_dup1', 'user', 999999, NOW())
    `);

    await expect(
      db.execute(sql`
        INSERT INTO audit_log (entity_id, user_id, action, entity_type, seq, created_at)
        VALUES (${ENTITY_ID}, ${USER_ID}, 'test.seq_dup2', 'user', 999999, NOW())
      `),
    ).rejects.toThrow(); // Unique constraint violation
  });
});
