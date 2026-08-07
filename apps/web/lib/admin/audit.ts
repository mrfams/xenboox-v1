import { adminAuditLog } from "@xenboox/db/schema";

import type { AdminRole } from "@/lib/admin/roles";

/**
 * Audit executor — a Drizzle `db` instance or a transaction (`tx`).
 * The audit write always shares the same transaction as the mutation it
 * records, so a failed mutation can never leave a partial audit entry and
 * a recorded entry can never survive a rolled-back change.
 */
export type AuditExecutor = {
  insert: typeof import("@xenboox/db").db.insert;
};

export type AdminAuditEntryInput = {
  actorAdminUserId?: string;
  actorRoleAtTimeOfAction?: AdminRole;
  actionType: string;
  targetEntityType: string;
  targetEntityId?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AdminAuditEntry = {
  actorAdminUserId?: string;
  actorRoleAtTimeOfAction?: AdminRole;
  actionType: string;
  targetEntityType: string;
  targetEntityId?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
};

/** Build a normalized audit entry with a stable createdAt. */
export function buildAuditEntry(input: AdminAuditEntryInput): AdminAuditEntry {
  return {
    actorAdminUserId: input.actorAdminUserId,
    actorRoleAtTimeOfAction: input.actorRoleAtTimeOfAction,
    actionType: input.actionType,
    targetEntityType: input.targetEntityType,
    targetEntityId: input.targetEntityId ?? null,
    beforeValue: input.beforeValue ?? null,
    afterValue: input.afterValue ?? null,
    reason: input.reason,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: new Date(),
  };
}

/** Append a row to the admin audit log (append-only — never update/delete). */
export async function writeAdminAudit(
  executor: AuditExecutor,
  entry: AdminAuditEntry,
): Promise<void> {
  await executor.insert(adminAuditLog).values({
    actorAdminUserId: entry.actorAdminUserId ?? null,
    actorRoleAtTimeOfAction: entry.actorRoleAtTimeOfAction ?? null,
    actionType: entry.actionType,
    targetEntityType: entry.targetEntityType,
    targetEntityId: entry.targetEntityId ?? null,
    beforeValue: (entry.beforeValue as never) ?? null,
    afterValue: (entry.afterValue as never) ?? null,
    reason: entry.reason ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    createdAt: entry.createdAt,
  });
}

/**
 * Run a mutation and write the audit entry for it.
 * Both happen against the same executor (pass `tx` inside a transaction).
 * If the mutation throws, no audit entry is written.
 */
export async function withAdminAudit<T>(
  executor: AuditExecutor,
  input: AdminAuditEntryInput,
  mutation: () => Promise<T>,
): Promise<T> {
  const result = await mutation();
  await writeAdminAudit(executor, buildAuditEntry(input));
  return result;
}
