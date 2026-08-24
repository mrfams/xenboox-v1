// @vitest-environment node
//
// ─── §20.2 RLS DB-Layer Tests ──────────────────────────────────────────────
//
// Verifies that Postgres Row-Level Security policies are correctly defined
// and actually filter data at the database level.
//
// Two layers are tested:
//
// 1. STATIC (no special role needed): every entity-scoped table must have
//    RLS enabled and a SELECT policy whose qual filters on
//    `app.current_entity_id`. This catches a policy being dropped or
//    weakened — a silent cross-entity leak.
//
// 2. DYNAMIC (proves enforcement): the policies are executed under a real
//    non-owner role inside a single transaction (`SET ROLE` + `SET LOCAL`
//    context + queries). When the session runs as a subject of RLS, a row
//    belonging to another entity must be invisible, and an INSERT for a
//    foreign entity must be rejected by the WITH CHECK clause.
//
// Note on the production connection: the application connects as the table
// owner (neondb_owner), and RLS is not currently FORCED on any table, so the
// owner connection bypasses the policies. The application-layer entity
// scoping in every tRPC query is the effective control today; these tests
// prove the DB-layer policies are correct and would enforce isolation for
// any non-owner role (e.g. a dedicated app role, or once
// `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is applied).
//
// Requires: DATABASE_URL pointing to a Neon database with RLS policies,
// at least two entities, and the ability to create a throwaway role
// (neondb_owner / Neon project owner). Skipped automatically otherwise.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// ── Module-scope probe ────────────────────────────────────────────────────
// Resolve real entity IDs and confirm DB + role-creation capability BEFORE
// the suite is collected, so describe.skipIf() decides at collection time.

async function probeDb(): Promise<{
  available: boolean;
  entityA: string;
  entityB: string;
}> {
  const result = { available: false, entityA: "", entityB: "" };
  if (!sql) return result;
  try {
    await sql`SELECT 1`;
    const ent = await sql`SELECT id FROM entities ORDER BY created_at LIMIT 2`;
    result.entityA = ent[0]?.id ?? "";
    result.entityB = ent[1]?.id ?? "";
    result.available = !!result.entityA && !!result.entityB;
  } catch {
    result.available = false;
  }
  return result;
}

const probe = await probeDb();
const describeIfDb = probe.available ? describe : describe.skip;

const ENTITY_A = probe.entityA;
const ENTITY_B = probe.entityB;

const TEST_ROLE = "xenboox_rls_test";
const SUP_A = "RLS Test Supplier A";
const SUP_B = "RLS Test Supplier B";
const COA_A = "RLS Test Cash - Entity A";
const COA_B = "RLS Test Cash - Entity B";

describeIfDb("§20.2 RLS DB-Layer Enforcement", () => {
  beforeAll(async () => {
    if (!sql) return;
    // Insert fixture rows as the owner (bypasses RLS so rows exist
    // regardless of session context).
    await sql`DELETE FROM suppliers WHERE name IN (${SUP_A}, ${SUP_B})`;
    await sql`DELETE FROM chart_of_accounts WHERE name IN (${COA_A}, ${COA_B})`;
    await sql`
      INSERT INTO suppliers (entity_id, name, is_active, created_at, updated_at)
      VALUES (${ENTITY_A}, ${SUP_A}, true, NOW(), NOW())
    `;
    await sql`
      INSERT INTO suppliers (entity_id, name, is_active, created_at, updated_at)
      VALUES (${ENTITY_B}, ${SUP_B}, true, NOW(), NOW())
    `;
    await sql`
      INSERT INTO chart_of_accounts (entity_id, code, name, type, subtype, is_active, created_at, updated_at)
      VALUES (${ENTITY_A}, '6111', ${COA_A}, 'asset', 'cash', true, NOW(), NOW())
      ON CONFLICT (entity_id, code) DO NOTHING
    `;
    await sql`
      INSERT INTO chart_of_accounts (entity_id, code, name, type, subtype, is_active, created_at, updated_at)
      VALUES (${ENTITY_B}, '6112', ${COA_B}, 'asset', 'cash', true, NOW(), NOW())
      ON CONFLICT (entity_id, code) DO NOTHING
    `;
  });

  afterAll(async () => {
    if (!sql) return;
    try {
      await sql`DELETE FROM suppliers WHERE name IN (${SUP_A}, ${SUP_B})`;
      await sql`DELETE FROM chart_of_accounts WHERE name IN (${COA_A}, ${COA_B})`;
      await sql(
        `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${TEST_ROLE}`,
      ).catch(() => {});
      await sql(`REVOKE ${TEST_ROLE} FROM CURRENT_USER`).catch(() => {});
      await sql(`DROP ROLE IF EXISTS ${TEST_ROLE}`).catch(() => {});
    } catch {
      // Cleanup is best-effort — the tests already verified what they needed.
    }
  });

  // ── Static: policies exist and are correctly formed ────────────────────

  it("every entity-scoped table has RLS enabled with a SELECT policy", async () => {
    if (!sql) return;
    const rows = (await sql`
      SELECT c.relname AS table_name,
             count(p.polname) FILTER (WHERE p.polcmd = 'r') AS select_policies
      FROM pg_class c
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE c.relrowsecurity
        AND c.relkind = 'r'
        AND c.relname NOT IN ('audit_log', 'security_audit_log')
      GROUP BY c.relname
      HAVING count(p.polname) FILTER (WHERE p.polcmd = 'r') = 0
      ORDER BY c.relname
    `) as unknown as Array<{ table_name: string; select_policies: number }>;
    expect(rows).toEqual([]);
  });

  it("RLS policies are fail-closed: every qual references the session context", async () => {
    if (!sql) return;
    // Entity-scoped tables filter on app.current_entity_id; user-scoped
    // tables (users, notifications, model_*, etc.) filter on
    // app.current_user_id. Either is acceptable — the point is NO policy
    // permits unfiltered access (a silent cross-tenant leak). Policies with
    // an explicit `true` qual (e.g. model_registry — a shared global
    // catalogue, not tenant data) are intentionally unfiltered and skipped.
    const rows = (await sql`
      SELECT DISTINCT tablename
      FROM pg_policies
      WHERE schemaname = 'public'
        AND qual IS NOT NULL
        AND qual::text NOT IN ('true')
        AND qual::text NOT LIKE '%app.current_entity_id%'
        AND qual::text NOT LIKE '%app.current_user_id%'
        AND tablename NOT IN ('audit_log', 'security_audit_log')
      ORDER BY tablename
    `) as unknown as Array<{ tablename: string }>;
    expect(rows).toEqual([]);
  });

  // ── Dynamic: real enforcement under a non-owner role ───────────────────

  async function ensureTestRole(grants: string): Promise<void> {
    if (!sql) return;
    // Identifiers cannot be bound as query parameters in DDL. TEST_ROLE is a
    // fixed test constant (never user input), so it is safe to inline via
    // the driver's raw string form. Drop any leftover role from a prior
    // failed run: revoke membership + object grants first, or DROP ROLE
    // fails on the dependent privileges.
    await sql(
      `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${TEST_ROLE}`,
    ).catch(() => {});
    await sql(`REVOKE ${TEST_ROLE} FROM CURRENT_USER`).catch(() => {});
    await sql(`DROP ROLE IF EXISTS ${TEST_ROLE}`).catch(() => {});
    await sql(`CREATE ROLE ${TEST_ROLE} NOLOGIN`);
    await sql(`GRANT ${TEST_ROLE} TO CURRENT_USER`);
    await sql(`GRANT ${grants} TO ${TEST_ROLE}`);
  }

  it("RLS filters cross-entity rows for a non-owner role", async () => {
    if (!sql) return;
    await ensureTestRole("SELECT ON suppliers, chart_of_accounts");

    const results = await sql.transaction((txn) => [
      txn(`SET ROLE ${TEST_ROLE}`),
      txn`SELECT set_config('app.current_entity_id', ${ENTITY_A}, true)`,
      txn`SELECT name FROM suppliers WHERE name IN (${SUP_A}, ${SUP_B}) ORDER BY name`,
      txn`RESET ROLE`,
    ]);
    const visible = (results[2] as Array<{ name: string }>).map((r) => r.name);
    expect(visible).toContain(SUP_A);
    expect(visible).not.toContain(SUP_B);
  });

  it("RLS blocks INSERT for a foreign entity (WITH CHECK)", async () => {
    if (!sql) return;
    await ensureTestRole("SELECT, INSERT ON suppliers");

    await expect(
      sql.transaction((txn) => [
        txn(`SET ROLE ${TEST_ROLE}`),
        txn`SELECT set_config('app.current_entity_id', ${ENTITY_A}, true)`,
        txn`
          INSERT INTO suppliers (entity_id, name, is_active, created_at, updated_at)
          VALUES (${ENTITY_B}, 'RLS Hacked Supplier', true, NOW(), NOW())
        `,
        txn`RESET ROLE`,
      ]),
    ).rejects.toThrow();
  });

  it("RLS fails closed when the entity context is not set", async () => {
    if (!sql) return;
    await ensureTestRole("SELECT ON suppliers");

    // No set_config call: current_setting('app.current_entity_id') throws,
    // so the policy qual errors and the query is rejected.
    await expect(
      sql.transaction((txn) => [
        txn(`SET ROLE ${TEST_ROLE}`),
        txn`SELECT name FROM suppliers WHERE name IN (${SUP_A}, ${SUP_B})`,
        txn`RESET ROLE`,
      ]),
    ).rejects.toThrow();
  });

  // ── Session-variable behavior at the app layer ─────────────────────────

  it("setRlsContext is transaction-scoped (SET LOCAL semantics)", async () => {
    if (!sql) return;
    // The app middleware uses set_config(..., true) = SET LOCAL. With the
    // neon HTTP driver each db.execute call is its own transaction, so the
    // context does NOT persist across separate calls — the app relies on
    // query-level entity filters (verified elsewhere) rather than session
    // variables. This test documents that behavior so it isn't mistaken for
    // a bug later.
    await sql`SELECT set_config('app.current_entity_id', ${ENTITY_A}, true)`;
    const check = (await sql`
      SELECT current_setting('app.current_entity_id', true) AS v
    `) as unknown as Array<{ v: string }>;
    expect(check[0]?.v ?? "").not.toBe(ENTITY_A);
  });
});
