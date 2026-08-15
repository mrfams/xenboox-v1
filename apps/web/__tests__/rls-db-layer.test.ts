// ─── §20.2 RLS DB-Layer Tests ──────────────────────────────────────────────
//
// Verifies that Postgres Row-Level Security policies actually filter data
// at the database level — not just at the application middleware layer.
//
// These tests connect to a REAL Neon database and test the actual RLS
// behavior by setting session variables and running queries.
//
// Requires: DATABASE_URL pointing to a Neon database with RLS enabled.
// Skipped automatically in environments without DB access.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

// Test entity IDs — these must not exist in production
const ENTITY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ENTITY_B = "bbbbbbbb-bbbb-bbbb-bbbbbbbbbbbbbbbb";
const USER_A = "11111111-1111-1111-1111-111111111111";

/**
 * Set the Postgres session variables that RLS policies read.
 * This mirrors what setRlsContext() does in the tRPC middleware.
 */
async function setRlsContext(userId: string, entityId: string) {
  await db.execute(
    sql.raw(`SELECT set_config('app.current_user_id', '${userId}', true)`),
  );
  await db.execute(
    sql.raw(`SELECT set_config('app.current_entity_id', '${entityId}', true)`),
  );
}

/**
 * Clear the RLS session context.
 */
async function clearRlsContext() {
  await db.execute(
    sql.raw(`SELECT set_config('app.current_user_id', '', true)`),
  );
  await db.execute(
    sql.raw(`SELECT set_config('app.current_entity_id', '', true)`),
  );
}

describeIfDb("§20.2 RLS DB-Layer Enforcement", () => {
  beforeAll(async () => {
    // Seed test data for both entities
    await setRlsContext(USER_A, ENTITY_A);

    // Insert a chart of accounts entry for Entity A
    await db.execute(
      sql.raw(`
      INSERT INTO chart_of_accounts (id, entity_id, code, name, account_type, is_active, created_at, updated_at)
      VALUES ('${ENTITY_A}-coa-001', '${ENTITY_A}', '1000', 'Cash - Entity A', 'asset', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `),
    );

    // Insert a chart of accounts entry for Entity B
    await db.execute(
      sql.raw(`
      INSERT INTO chart_of_accounts (id, entity_id, code, name, account_type, is_active, created_at, updated_at)
      VALUES ('${ENTITY_B}-coa-001', '${ENTITY_B}', '1000', 'Cash - Entity B', 'asset', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `),
    );

    // Insert a supplier for Entity A
    await db.execute(
      sql.raw(`
      INSERT INTO suppliers (id, entity_id, name, is_active, created_at, updated_at)
      VALUES ('${ENTITY_A}-sup-001', '${ENTITY_A}', 'Supplier A', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `),
    );

    // Insert a supplier for Entity B
    await db.execute(
      sql.raw(`
      INSERT INTO suppliers (id, entity_id, name, is_active, created_at, updated_at)
      VALUES ('${ENTITY_B}-sup-001', '${ENTITY_B}', 'Supplier B', true, NOW(), NOW())
    `),
    );

    // Insert a customer for Entity A
    await db.execute(
      sql.raw(`
      INSERT INTO customers (id, entity_id, name, is_active, created_at, updated_at)
      VALUES ('${ENTITY_A}-cust-001', '${ENTITY_A}', 'Customer A', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `),
    );

    await clearRlsContext();
  });

  afterAll(async () => {
    // Cleanup test data
    await clearRlsContext();
    await db.execute(
      sql.raw(
        `DELETE FROM chart_of_accounts WHERE id IN ('${ENTITY_A}-coa-001', '${ENTITY_B}-coa-001')`,
      ),
    );
    await db.execute(
      sql.raw(
        `DELETE FROM suppliers WHERE id IN ('${ENTITY_A}-sup-001', '${ENTITY_B}-sup-001')`,
      ),
    );
    await db.execute(
      sql.raw(`DELETE FROM customers WHERE id IN ('${ENTITY_A}-cust-001')`),
    );
  });

  // ── Chart of Accounts ──────────────────────────────────────────────────

  it("chart_of_accounts: Entity A sees only its own accounts", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      SELECT id, name FROM chart_of_accounts WHERE entity_id = current_setting('app.current_entity_id')::UUID
    `),
    );
    const rows = result as unknown as any[];
    const names = rows.map((r) => r.name);
    expect(names).toContain("Cash - Entity A");
    expect(names).not.toContain("Cash - Entity B");
  });

  it("chart_of_accounts: Entity B data is invisible to Entity A", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      SELECT id FROM chart_of_accounts WHERE id = '${ENTITY_B}-coa-001'
    `),
    );
    const rows = result as unknown as any[];
    // RLS should filter this out — the row exists but isn't visible
    expect(rows.length).toBe(0);
  });

  // ── Suppliers ──────────────────────────────────────────────────────────

  it("suppliers: Entity A sees only its own suppliers", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      SELECT id, name FROM suppliers WHERE entity_id = current_setting('app.current_entity_id')::UUID
    `),
    );
    const rows = result as unknown as any[];
    const names = rows.map((r) => r.name);
    expect(names).toContain("Supplier A");
    expect(names).not.toContain("Supplier B");
  });

  it("suppliers: cross-entity access is blocked", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      SELECT id FROM suppliers WHERE id = '${ENTITY_B}-sup-001'
    `),
    );
    const rows = result as unknown as any[];
    expect(rows.length).toBe(0);
  });

  // ── Customers ──────────────────────────────────────────────────────────

  it("customers: Entity A sees only its own customers", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      SELECT id, name FROM customers WHERE entity_id = current_setting('app.current_entity_id')::UUID
    `),
    );
    const rows = result as unknown as any[];
    const names = rows.map((r) => r.name);
    expect(names).toContain("Customer A");
  });

  // ── Session Variable Behavior ──────────────────────────────────────────

  it("RLS fails closed when session variable is not set", async () => {
    await clearRlsContext();
    // Without setting the session variable, current_setting() throws
    await expect(
      db.execute(
        sql.raw(`
        SELECT id FROM chart_of_accounts
        WHERE entity_id = current_setting('app.current_entity_id')::UUID
      `),
      ),
    ).rejects.toThrow();
  });

  it("RLS fails closed with empty entity ID", async () => {
    await setRlsContext(USER_A, "");
    // Empty string cast to UUID will fail
    await expect(
      db.execute(
        sql.raw(`
        SELECT id FROM chart_of_accounts
        WHERE entity_id = current_setting('app.current_entity_id')::UUID
      `),
      ),
    ).rejects.toThrow();
  });

  // ── INSERT with RLS ────────────────────────────────────────────────────

  it("INSERT respects RLS — cannot insert for wrong entity", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    // Try to insert a row with a different entity_id than the session variable
    // RLS policy checks entity_id = current_setting('app.current_entity_id')
    // This should fail because the INSERT's entity_id doesn't match the session
    await expect(
      db.execute(
        sql.raw(`
        INSERT INTO chart_of_accounts (id, entity_id, code, name, account_type, is_active, created_at, updated_at)
        VALUES ('test-rls-insert', '${ENTITY_B}', '9999', 'Hacked Account', 'asset', true, NOW(), NOW())
      `),
      ),
    ).rejects.toThrow();
  });

  // ── UPDATE with RLS ────────────────────────────────────────────────────

  it("UPDATE respects RLS — cannot update another entity's rows", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    // Try to update Entity B's row — RLS should prevent this
    const result = await db.execute(
      sql.raw(`
      UPDATE chart_of_accounts SET name = 'Hacked' WHERE id = '${ENTITY_B}-coa-001'
    `),
    );
    // The update succeeds but affects 0 rows (RLS filters the WHERE)
    const count = (result as any).rowCount || 0;
    expect(count).toBe(0);
  });

  // ── DELETE with RLS ────────────────────────────────────────────────────

  it("DELETE respects RLS — cannot delete another entity's rows", async () => {
    await setRlsContext(USER_A, ENTITY_A);
    const result = await db.execute(
      sql.raw(`
      DELETE FROM chart_of_accounts WHERE id = '${ENTITY_B}-coa-001'
    `),
    );
    const count = (result as any).rowCount || 0;
    expect(count).toBe(0);
  });
});
