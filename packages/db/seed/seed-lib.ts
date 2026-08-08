/**
 * Shared idempotent seed helpers.
 *
 * Every demo-account seed (demo@xenboox.com, yc@xenboox.com, …) uses these so
 * that re-running a seed:
 *   - never destroys OTHER accounts (no global TRUNCATE),
 *   - reuses the existing user / org / entity rows (find-or-create),
 *   - fully resets only the target entity's child data (delete-entity cascade),
 *   - keeps `email_verified` set so the account can sign in immediately.
 *
 * Run order for an account seed:
 *   1. findOrCreateUser(...)
 *   2. findOrCreateOrg(...)
 *   3. resetEntity(...)        // wipes + recreates the entity (cascades all children)
 *   4. grantAccess(...)
 *   5. setLastUsedEntity(...)
 */
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "../schema/organization";

// Raw neon client for transactional DDL-style resets (the append-only audit
// triggers must be disabled inside the same transaction as the delete).
const rawSql = neon(process.env.DATABASE_URL!);

// Shared demo password (bcrypt hash of "demo1234").
export const DEMO_PASSWORD_HASH =
  "$2a$12$QrxmI9v0MpLRsg6gWTH7F./KZOQl3fOoJDHGI4VzjOV0LHcpMED/2";

/** Deterministic UUID v4-looking id derived from an arbitrary key. */
export function idFromKey(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/** Deterministic UUID from a type + sequence number (legacy seed pattern). */
export function seedUuid(type: string, n: number): string {
  return idFromKey(`${type}-${n}`);
}

/** True when the module is being executed directly (not imported). */
export function shouldRunDirect(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try {
    return pathToFileURL(arg).href === import.meta.url;
  } catch {
    return false;
  }
}

export interface UserInput {
  email: string;
  name: string;
  passwordHash?: string;
}

/** Find-or-create a user. Always marks email as verified. */
export async function findOrCreateUser(input: UserInput): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, existing[0].id));
    return existing[0].id;
  }

  const id = idFromKey(`user:${input.email}`);
  await db
    .insert(users)
    .values({
      id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash ?? DEMO_PASSWORD_HASH,
      emailVerified: new Date(),
    })
    .onConflictDoNothing();
  return id;
}

export interface OrgInput {
  userId: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "growth" | "pro" | "firm";
  settings?: Record<string, unknown>;
}

/** Find-or-create an organization owned by `userId` (by slug / owner). */
export async function findOrCreateOrg(input: OrgInput): Promise<string> {
  const byOwner = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.ownerId, input.userId))
    .limit(1);
  if (byOwner[0]) return byOwner[0].id;

  const bySlug = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, input.slug))
    .limit(1);
  if (bySlug[0]) return bySlug[0].id;

  const id = idFromKey(`org:${input.slug}`);
  await db
    .insert(organizations)
    .values({
      id,
      name: input.name,
      slug: input.slug,
      type: "business",
      plan: input.plan,
      ownerId: input.userId,
      settings: input.settings ?? {},
    })
    .onConflictDoNothing();
  return id;
}

export interface EntityInput {
  orgId: string;
  name: string;
  currency: string;
  country: string;
  fiscalYearEnd?: string;
  taxId?: string | null;
  settings?: Record<string, unknown>;
  type?: "company" | "subsidiary" | "branch" | "client";
}

const AUDIT_TRIGGERS: Array<{ table: string; trigger: string }> = [
  { table: "audit_log", trigger: "trg_audit_log_no_delete" },
  { table: "security_audit_log", trigger: "trg_security_audit_log_no_delete" },
];

interface FkEdge {
  child: string;
  parent: string;
  childCol: string;
  parentCol: string;
}

interface DeleteStep {
  table: string;
  predicate: string;
}

// Cached delete plan (drift-proof — derived from information_schema +
// pg_constraint, so newly added entity-scoped tables are included).
let _deletePlan: DeleteStep[] | null = null;

/**
 * Build the entity-reset delete plan.
 *
 * The reset must delete every row that belongs to an entity — including
 * tables that have NO `entity_id` column but are scoped through a parent FK
 * (journal_entry_lines, sales_invoice_lines, po_lines, …). The plan is:
 *
 *   1. Closure: start from every table that carries `entity_id`, then
 *      transitively add any table with an FK into that set. This catches
 *      all child-of-child tables regardless of column shape.
 *   2. Ordering: topological sort over FK edges (child deleted before its
 *      parent), ignoring self-referencing FKs (chart_of_accounts.parent_id,
 *      agents.reports_to, …) which would otherwise create fake cycles.
 *   3. Predicate: `entity_id = $1` for entity-scoped tables; for the rest,
 *      a `col IN (SELECT id FROM parent WHERE <parent-predicate>)` chain up
 *      to the nearest entity-scoped ancestor.
 *
 * This runs entirely with ordinary DML privileges — `session_replication_role`
 * is unavailable to non-superusers on Neon, so the FK ordering MUST be
 * correct.
 */
async function buildDeletePlan(): Promise<DeleteStep[]> {
  if (_deletePlan) return _deletePlan;

  const rows = await rawSql`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'entity_id'
    ORDER BY table_name
  `;
  const entityScoped = new Set(rows.map((r) => r.table_name as string));

  // All FK edges across the whole schema, with column names. The driver
  // returns the SQL aliases (child_col, parent_col) verbatim — map them to
  // the interface's camelCase properties explicitly.
  const fkRows = await rawSql(
    `SELECT child.relname AS child, parent.relname AS parent,
            ca.attname AS child_col, pa.attname AS parent_col
     FROM pg_constraint con
     JOIN pg_class child ON con.conrelid = child.oid
     JOIN pg_class parent ON con.confrelid = parent.oid
     JOIN pg_attribute ca ON ca.attrelid = child.oid
        AND ca.attnum = con.conkey[1]
     JOIN pg_attribute pa ON pa.attrelid = parent.oid
        AND pa.attnum = con.confkey[1]
     WHERE con.contype = 'f'`,
  );
  const fks: FkEdge[] = fkRows.map((r) => ({
    child: r.child as string,
    parent: r.parent as string,
    childCol: r.child_col as string,
    parentCol: r.parent_col as string,
  }));

  // 1. Transitive closure from entity-scoped tables.
  const closure = new Set(entityScoped);
  let grew = true;
  while (grew) {
    grew = false;
    for (const fk of fks) {
      if (closure.has(fk.parent) && !closure.has(fk.child)) {
        closure.add(fk.child);
        grew = true;
      }
    }
  }
  const tables = [...closure].sort();

  // 2. Topological order (children first), skipping self-referencing FKs.
  const childrenOf = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const t of tables) {
    childrenOf.set(t, new Set());
    inDegree.set(t, 0);
  }
  for (const fk of fks) {
    if (fk.child === fk.parent) continue; // self-loop
    if (!closure.has(fk.child) || !closure.has(fk.parent)) continue;
    if (!childrenOf.get(fk.parent)!.has(fk.child)) {
      childrenOf.get(fk.parent)!.add(fk.child);
      inDegree.set(fk.child, (inDegree.get(fk.child) ?? 0) + 1);
    }
  }

  const queue = tables.filter((t) => (inDegree.get(t) ?? 0) === 0);
  const ordered: string[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const t = queue.shift()!;
    if (seen.has(t)) continue;
    seen.add(t);
    ordered.push(t);
    for (const child of childrenOf.get(t)!) {
      inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
      if ((inDegree.get(child) ?? 0) === 0) queue.push(child);
    }
  }
  for (const t of tables) {
    if (!seen.has(t)) ordered.push(t); // genuine cycle — surfaced loudly below
  }

  // 3. Predicate per table: an OR of every FK column that can point into this
  //    entity's data — the direct `entity_id` column (when present), plus any
  //    FK that references `entities` through another column (e.g.
  //    intercompany_tags.counterparty_entity_id), plus FK-chains up to an
  //    entity-scoped ancestor (journal_entry_lines → journal_entries).
  const predicateOf = new Map<string, string>();
  const resolve = (table: string, stack: Set<string>): string => {
    if (predicateOf.has(table)) return predicateOf.get(table)!;
    if (table === "entities") {
      // `entities` is deleted last; subqueries resolve against the row that
      // is still present mid-transaction.
      const p = `id = $1`;
      predicateOf.set(table, p);
      return p;
    }
    if (stack.has(table)) return "false"; // cycle guard (shouldn't happen)

    stack.add(table);
    const options: string[] = [];
    if (entityScoped.has(table)) options.push("entity_id = $1");
    for (const fk of fks) {
      if (fk.child !== table) continue;
      if (fk.child === fk.parent) continue; // self-loop (parent_id, reports_to)
      if (!closure.has(fk.parent) && fk.parent !== "entities") continue;
      options.push(
        `${fk.childCol} IN (SELECT ${fk.parentCol} FROM "${fk.parent}" WHERE ${resolve(fk.parent, stack)})`,
      );
    }
    stack.delete(table);
    const p = options.length ? options.join(" OR ") : "false";
    predicateOf.set(table, p);
    return p;
  };

  // Kahn's algorithm emits dependencies first (parents before children), but
  // deletes must run children-first so FK parents are never referenced by a
  // row that has already gone away. Reverse the order.
  _deletePlan = ordered.reverse().map((t) => ({
    table: t,
    predicate: resolve(t, new Set()),
  }));
  return _deletePlan;
}

/**
 * Delete an entity and EVERY row that references it, in a single transaction.
 *
 *  1. Disables the append-only `audit_log` / `security_audit_log` BEFORE
 *     DELETE triggers (they raise on DELETE).
 *  2. Deletes every entity-scoped table in FK-dependency order (children
 *     first), so the many non-cascade inter-table FKs cannot block.
 *  3. Deletes `consolidation_runs` by org (scoped by organization_id).
 *  4. Deletes the entity row itself, then re-enables the audit triggers.
 */
async function deleteEntityAndChildren(
  entityId: string,
  orgId?: string,
): Promise<void> {
  const plan = await buildDeletePlan();
  const queries: unknown[] = [];

  // Table/trigger names are trusted constants (information_schema + the
  // migration-defined trigger names), so string interpolation is safe here.
  for (const { table, trigger } of AUDIT_TRIGGERS) {
    queries.push(rawSql(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`));
  }

  for (const step of plan) {
    queries.push(
      rawSql(`DELETE FROM "${step.table}" WHERE ${step.predicate}`, [entityId]),
    );
  }

  if (orgId) {
    queries.push(
      rawSql("DELETE FROM consolidation_runs WHERE organization_id = $1", [
        orgId,
      ]),
    );
  }

  queries.push(rawSql("DELETE FROM entities WHERE id = $1", [entityId]));

  for (const { table, trigger } of AUDIT_TRIGGERS) {
    queries.push(rawSql(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`));
  }

  await rawSql.transaction(queries as never[]);
}

/**
 * Delete any existing entity with this org+name (and all its child data),
 * then re-create it with a deterministic id. Returns the entity id.
 */
export async function resetEntity(input: EntityInput): Promise<string> {
  const existing = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, input.orgId),
        eq(entities.name, input.name),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await deleteEntityAndChildren(existing[0].id, input.orgId);
  }

  const id = idFromKey(`entity:${input.name}`);
  await db
    .insert(entities)
    .values({
      id,
      organizationId: input.orgId,
      name: input.name,
      type: input.type ?? "company",
      currency: input.currency,
      country: input.country,
      fiscalYearEnd: input.fiscalYearEnd ?? "12",
      taxId: input.taxId ?? null,
      settings: input.settings ?? {},
      isActive: true,
    })
    .onConflictDoNothing();
  return id;
}

/** Grant an entity role to a user (idempotent). */
export async function grantAccess(input: {
  userId: string;
  entityId: string;
  role:
    | "owner"
    | "admin"
    | "finance_director"
    | "accountant"
    | "payroll_officer"
    | "cashier"
    | "department_manager"
    | "employee"
    | "external_auditor"
    | "external_accountant"
    | "donor";
  grantedBy: string;
}): Promise<void> {
  await db
    .insert(userEntityAccess)
    .values({
      userId: input.userId,
      entityId: input.entityId,
      role: input.role,
      grantedBy: input.grantedBy,
    })
    .onConflictDoNothing();
}

/** Point a user's default entity at `entityId` (bootstrap for the client). */
export async function setLastUsedEntity(
  userId: string,
  entityId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ lastUsedEntityId: entityId })
    .where(eq(users.id, userId));
}

/**
 * Remove junk/test entities under `orgId` (names containing "healtest" or
 * "test"), keeping all legitimate entities — including consolidation
 * subsidiaries, which the seeds create deliberately and reference from
 * intercompany_tags / entity_relationships.
 *
 * Used to sweep leftover junk rows (e.g. "HealTest …") out of demo orgs.
 */
export async function removeOtherEntities(orgId: string): Promise<number> {
  const rows = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .where(eq(entities.organizationId, orgId));

  const isJunk = (name: string) => /healtest|\btest\b|test\d+/i.test(name);

  let removed = 0;
  for (const row of rows) {
    if (!isJunk(row.name)) continue;
    await deleteEntityAndChildren(row.id, orgId);
    removed++;
  }
  return removed;
}
