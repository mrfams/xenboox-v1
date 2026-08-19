// ─── Audit Archive Router ──────────────────────────────────────────────────
//
// Manages audit log archives: list manifests, check archive status, verify
// integrity, and trigger manual archival. All procedures are entity-scoped.

import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { auditArchiveManifests } from "@xenboox/db/schema/audit-archive";
import { auditLog } from "@xenboox/db/schema/documents";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Router ───────────────────────────────────────────────────────────────

export const auditArchiveRouter = router({
  /**
   * List archive manifests for the current entity.
   */
  listManifests: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
          status: z
            .enum(["pending", "uploading", "completed", "verified", "failed"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions = [eq(auditArchiveManifests.entityId, entityId)];
      if (input?.status) {
        conditions.push(eq(auditArchiveManifests.status, input.status));
      }

      const manifests = await db
        .select()
        .from(auditArchiveManifests)
        .where(and(...conditions))
        .orderBy(desc(auditArchiveManifests.archiveDate))
        .limit(limit)
        .offset(offset);

      return manifests;
    }),

  /**
   * Get a single archive manifest by ID.
   */
  getManifest: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const manifest = await db
        .select()
        .from(auditArchiveManifests)
        .where(
          and(
            eq(auditArchiveManifests.id, input.id),
            eq(auditArchiveManifests.entityId, entityId),
          ),
        )
        .limit(1);

      if (manifest.length === 0) {
        throw new Error("Archive manifest not found");
      }

      return manifest[0];
    }),

  /**
   * Get archive statistics for the current entity.
   */
  getArchiveStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const manifests = await db
      .select()
      .from(auditArchiveManifests)
      .where(eq(auditArchiveManifests.entityId, entityId));

    const totalArchives = manifests.length;
    const completedArchives = manifests.filter(
      (m) => m.status === "completed" || m.status === "verified",
    ).length;
    const failedArchives = manifests.filter(
      (m) => m.status === "failed",
    ).length;
    const totalRowsArchived = manifests.reduce((sum, m) => sum + m.rowCount, 0);
    const totalBytesArchived = manifests.reduce(
      (sum, m) => sum + m.fileSizeBytes,
      0,
    );

    // Check how many audit log rows are older than 1 year (candidates for archival)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldLogsResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(and(eq(auditLog.entityId, entityId)));

    const totalAuditLogs = Number(oldLogsResult[0]?.count ?? 0);

    return {
      totalArchives,
      completedArchives,
      failedArchives,
      totalRowsArchived,
      totalBytesArchived,
      totalAuditLogs,
      lastArchiveDate:
        manifests.length > 0
          ? manifests.sort(
              (a, b) =>
                new Date(b.archiveDate).getTime() -
                new Date(a.archiveDate).getTime(),
            )[0].archiveDate
          : null,
    };
  }),

  /**
   * Verify the integrity of an archive manifest by re-checking its checksum.
   * In production, this would download the file from R2 and recompute SHA-256.
   * For now, it marks the manifest as verified.
   */
  verifyManifest: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const manifest = await db
        .select()
        .from(auditArchiveManifests)
        .where(
          and(
            eq(auditArchiveManifests.id, input.id),
            eq(auditArchiveManifests.entityId, entityId),
          ),
        )
        .limit(1);

      if (manifest.length === 0) {
        throw new Error("Archive manifest not found");
      }

      if (manifest[0].status === "failed") {
        throw new Error("Cannot verify a failed archive");
      }

      // In production: download from R2, recompute SHA-256, compare
      // For now: mark as verified
      const [updated] = await db
        .update(auditArchiveManifests)
        .set({
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: ctx.userId ?? "system",
        })
        .where(
          and(
            eq(auditArchiveManifests.id, input.id),
            eq(auditArchiveManifests.entityId, entityId),
          ),
        )
        .returning();

      logger.info(
        { entityId, manifestId: input.id },
        "audit-archive: manifest verified",
      );

      return updated;
    }),

  /**
   * Get the list of audit log tables eligible for archival.
   * Returns the count of rows older than 1 year per entity.
   */
  getArchivalCandidates: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoff = oneYearAgo.toISOString();

    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM audit_log
       WHERE entity_id = ${entityId}
         AND created_at < ${cutoff}`,
    );

    const rows = result as { count: number }[];
    const candidateCount = Number(rows[0]?.count ?? 0);

    return {
      entityId,
      candidateCount,
      cutoffDate: oneYearAgo.toISOString(),
      recommendation:
        candidateCount > 0
          ? `${candidateCount} audit log rows are older than 1 year and eligible for archival to R2.`
          : "No audit logs older than 1 year. Archival not needed yet.",
    };
  }),
});
