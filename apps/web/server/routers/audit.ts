import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, desc, asc, and, or, gte, lte, like, sql } from "drizzle-orm";
import { auditLog } from "@xenboox/db/schema/documents";
import { verifyChain, type ChainEvent } from "@/lib/audit/chain";
import { rowToChainPayload } from "@/lib/audit/backfill";

type AuditRow = typeof auditLog.$inferSelect;

/**
 * Map a stored row into the chain representation used by verifyChain. Hashes
 * the STORED payload text (what the trigger actually hashed) so verification
 * never re-serializes the row. Falls back to the JS mirror only for rows that
 * predate the payload column (tests/edge data).
 */
function rowToChainEvent(row: AuditRow): ChainEvent {
  return {
    id: row.id,
    seq: row.seq ?? 0,
    prevHash: row.prevHash ?? "",
    eventHash: row.eventHash ?? "",
    createdAt: row.createdAt,
    payloadText: row.payloadHashInput ?? rowToChainPayload(row as never),
  };
}

/**
 * Parse the stored canonical payload text (exactly what the DB trigger hashed)
 * and compare every field against the row's current column values. Because the
 * payload is jsonb::text (Postgres canonical form) and the comparison is
 * value-level, serialization differences across languages cannot cause false
 * positives — but a column edit that leaves the stored text untouched is
 * caught.
 */
function payloadMatchesColumns(
  storedText: string | null | undefined,
  row: AuditRow,
): boolean {
  if (!storedText) return false;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(storedText) as Record<string, unknown>;
  } catch {
    return false;
  }

  const s = (v: unknown): string | null => (v == null ? null : String(v));
  const num = (v: unknown): string | null =>
    v == null || v === "" ? null : String(Number(v));

  return (
    s(parsed.entityId) === s(row.entityId) &&
    parsed.action === row.action &&
    parsed.entityType === row.entityType &&
    s(parsed.entityIdRef) === s(row.entityIdRef) &&
    parsed.actorType === (row.actorType ?? null) &&
    s(parsed.userId) === s(row.userId) &&
    parsed.agentId === (row.agentId ?? null) &&
    parsed.reason === (row.reason ?? null) &&
    // old/new values are stored as JSONB in the payload (nested objects)
    JSON.stringify(parsed.oldValues ?? null) ===
      JSON.stringify(row.oldValues ?? null) &&
    JSON.stringify(parsed.newValues ?? null) ===
      JSON.stringify(row.newValues ?? null) &&
    num(parsed.confidence) === num(row.confidence) &&
    parsed.ipAddress === (row.ipAddress ?? null) &&
    parsed.userAgent === (row.userAgent ?? null) &&
    parsed.sessionId === (row.sessionId ?? null) &&
    parsed.requestId === (row.requestId ?? null) &&
    // createdAt is stored in the payload as ISO-8601 UTC (seconds precision)
    String(parsed.createdAt) === row.createdAt.toISOString().slice(0, 19) + "Z"
  );
}

/**
 * Verify the entity's chain. Rows written before the chain migration (or not
 * yet backfilled) have null hash fields — report them as "unchained" rather
 * than falsely accusing tampering.
 */
function verifyForEntity(rows: AuditRow[]) {
  const unchained = rows.some(
    (r) => r.seq == null || !r.prevHash || !r.eventHash || !r.payloadHashInput,
  );
  const chain = rows.map(rowToChainEvent);
  const result = verifyChain(chain);

  // Column-consistency check: an attacker (or bug) who edits a visible column
  // (newValues, action, …) WITHOUT rewriting the stored payload text breaks
  // the recomputation even though the chain hashes still match. The stored
  // payload is the exact text Postgres hashed (jsonb::text canonical form);
  // we compare it SEMANTICALLY (parse + field compare) rather than by string,
  // so cross-language serialization differences (spacing, number formatting)
  // can never produce false tamper alarms.
  let firstInconsistentSeq: number | null = null;
  if (!unchained) {
    for (const r of rows) {
      if (!payloadMatchesColumns(r.payloadHashInput, r)) {
        firstInconsistentSeq = r.seq ?? null;
        break;
      }
    }
  }

  const inconsistent = firstInconsistentSeq != null;
  return {
    valid: result.valid && !unchained && !inconsistent,
    status: unchained
      ? ("unchained" as const)
      : result.valid && !inconsistent
        ? ("valid" as const)
        : ("broken" as const),
    checkedCount: result.checkedCount,
    firstBrokenSeq: firstInconsistentSeq ?? result.firstBrokenSeq,
    checkedAt: new Date(),
  };
}

function escapeCsv(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Neutralize spreadsheet formula injection: cells beginning with = + - @ or
  // a tab/CR can be interpreted as formulas by Excel/Sheets when opened.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export const auditRouter = router({
  /**
   * Tiered audit visibility (see ADR-0007):
   * - owner/admin → full trail, including sensitive metadata (IP, session).
   * - regular member → their OWN actions + agent actions only; sensitive
   *   metadata (ipAddress, userAgent, sessionId, requestId, userId of others)
   *   is stripped. Least privilege without losing accountability.
   */
  list: rlsProtectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        entityType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const isPrivileged =
          ctx.entityRole === "owner" || ctx.entityRole === "admin";
        const conditions = [eq(auditLog.entityId, ctx.entityId!)];

        if (!isPrivileged) {
          // Members see their own actions plus agent/system actions. `or`
          // is typed SQL | undefined; entityId is always present so the
          // result is non-null at runtime — assert for the type checker.
          conditions.push(
            or(
              eq(auditLog.userId, ctx.session?.user?.id ?? ""),
              eq(auditLog.actorType, "agent"),
              eq(auditLog.actorType, "system"),
            )!,
          );
        }

        if (input.action) {
          conditions.push(like(auditLog.action, `%${input.action}%`));
        }
        if (input.entityType) {
          conditions.push(eq(auditLog.entityType, input.entityType));
        }
        if (input.dateFrom) {
          conditions.push(gte(auditLog.createdAt, new Date(input.dateFrom)));
        }
        if (input.dateTo) {
          conditions.push(lte(auditLog.createdAt, new Date(input.dateTo)));
        }

        // conditions always includes the entityId clause, so whereClause is
        // guaranteed non-null at runtime; assert once for the type checker.
        const whereClause = and(...conditions)!;

        const countQuery = db.execute(
          sql`SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
        );

        const [logs, countResult] = await Promise.all([
          db.query.auditLog.findMany({
            where: whereClause,
            orderBy: [desc(auditLog.createdAt)],
            limit: input.limit,
            offset: input.offset,
          }),
          countQuery,
        ]);

        const total = Number(
          (countResult.rows?.[0] as { total?: number })?.total ?? 0,
        );

        return {
          logs: logs.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityIdRef: log.entityIdRef,
            userId: log.userId,
            newValues: log.newValues as Record<string, unknown> | null,
            oldValues: log.oldValues as Record<string, unknown> | null,
            createdAt: log.createdAt,
            // Chain + actor fields (non-sensitive — always present)
            seq: log.seq,
            prevHash: log.prevHash,
            eventHash: log.eventHash,
            actorType: log.actorType,
            agentId: log.agentId,
            reason: log.reason,
            // Sensitive metadata — owners/admins only; null for members
            sessionId: isPrivileged ? log.sessionId : null,
            requestId: isPrivileged ? log.requestId : null,
            ipAddress: isPrivileged ? log.ipAddress : null,
            userAgent: isPrivileged ? log.userAgent : null,
          })),
          total,
          scoped: !isPrivileged,
        };
      } catch (error) {
        handleMutationError(error, "Failed to fetch audit logs");
      }
    }),

  /**
   * Verify the integrity of this entity's audit chain. Recomputes every hash
   * and link; any tampered, reordered, or deleted event breaks verification.
   * Owner/admin only — a verification report is an evidentiary artifact.
   */
  verify: rlsProtectedProcedure
    .use(requireRole("owner", "admin"))
    .query(async ({ ctx }) => {
      try {
        const rows = await db.query.auditLog.findMany({
          where: eq(auditLog.entityId, ctx.entityId!),
          orderBy: [asc(auditLog.seq), asc(auditLog.createdAt)],
        });
        return verifyForEntity(rows);
      } catch (error) {
        handleMutationError(error, "Failed to verify audit chain");
      }
    }),

  /**
   * Export this entity's audit chain (JSON or CSV) together with a live
   * verification report, so records can be handed to auditors with proof of
   * integrity.
   */
  export: rlsProtectedProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const rows = await db.query.auditLog.findMany({
          where: eq(auditLog.entityId, ctx.entityId!),
          orderBy: [asc(auditLog.seq), asc(auditLog.createdAt)],
        });

        const verification = verifyForEntity(rows);

        const events = rows.map((r) => ({
          id: r.id,
          seq: r.seq,
          action: r.action,
          entityType: r.entityType,
          entityIdRef: r.entityIdRef,
          actorType: r.actorType,
          userId: r.userId,
          agentId: r.agentId,
          reason: r.reason,
          oldValues: r.oldValues,
          newValues: r.newValues,
          confidence: r.confidence,
          ipAddress: r.ipAddress,
          userAgent: r.userAgent,
          sessionId: r.sessionId,
          requestId: r.requestId,
          createdAt: r.createdAt,
          prevHash: r.prevHash,
          eventHash: r.eventHash,
        }));

        if (input.format === "csv") {
          const header = [
            "seq",
            "action",
            "entity_type",
            "entity_id_ref",
            "actor_type",
            "user_id",
            "agent_id",
            "reason",
            "created_at",
            "prev_hash",
            "event_hash",
          ];
          const lines = rows.map((r) =>
            [
              r.seq,
              r.action,
              r.entityType,
              r.entityIdRef,
              r.actorType,
              r.userId,
              r.agentId,
              r.reason,
              r.createdAt?.toISOString(),
              r.prevHash,
              r.eventHash,
            ]
              .map(escapeCsv)
              .join(","),
          );
          return {
            csv: [header.map(escapeCsv).join(","), ...lines].join("\n"),
            events: [],
            verification,
          };
        }

        return { events, verification };
      } catch (error) {
        handleMutationError(error, "Failed to export audit chain");
      }
    }),
});
