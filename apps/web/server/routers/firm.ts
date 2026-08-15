// ─── Accounting Firm Dashboard & Client Switcher Router ──────────────
//
// Read-only aggregation layer for accounting firms managing multiple
// client entities. Core constraint: cross-client isolation is enforced
// identically to standard entity isolation — this is a convenience layer,
// not an exception to RBAC.
//
// Endpoints:
//   listClients          — All active client engagements with health snapshots
//   getClientHealth      — Detailed read-only health for a specific client
//   linkClient           — Create a new client engagement
//   unlinkClient         — End a client engagement
//   listAvailableClients — Entities in the org not yet linked
//   listEngagementHistory — Historical engagement records
//   refreshSnapshot      — Manually refresh a client's dashboard snapshot

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { clientEngagements, firmDashboardSnapshots } from "@xenboox/db/schema";
import {
  organizations,
  entities,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import { auditLog } from "@xenboox/db/schema/documents";
import { salesInvoices, invoicesAp } from "@xenboox/db/schema/ap-ar";
import { bankAccounts, bankTransactions } from "@xenboox/db/schema/treasury";
import { journalEntries } from "@xenboox/db/schema/accounting";
import { consolidationRuns } from "@xenboox/db/schema/consolidation";
import { withRetry, withTimeout, redactPIIFromObject } from "@xenboox/agents"; // ─── Helpers ──────────────────────────────────────────────────────────

import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

/** Compute health status from dashboard snapshot fields */
function computeHealthStatus(snapshot: {
  booksCurrent: boolean | null;
  unreconciledItems: string;
  overdueInvoices: string;
  pendingApprovals: string;
}): "healthy" | "needs_review" | "critical" {
  const unreconciled = Number(snapshot.unreconciledItems);
  const overdue = Number(snapshot.overdueInvoices);
  const pending = Number(snapshot.pendingApprovals);

  if (overdue > 10 || unreconciled > 20 || !snapshot.booksCurrent) {
    return "critical";
  }
  if (overdue > 3 || unreconciled > 5 || pending > 5) {
    return "needs_review";
  }
  return "healthy";
}

/** Refresh a client's dashboard snapshot by reading from their entity data */
async function refreshClientSnapshot(
  firmOrgId: string,
  clientEntityId: string,
): Promise<void> {
  // Enterprise: retry + timeout guards on all heavy DB operations
  await withRetry(
    async () => {
      // Count overdue AR invoices (past due) — 5s timeout
      const invoicesAr = await withTimeout(
        () =>
          db.query.salesInvoices.findMany({
            where: and(
              eq(salesInvoices.entityId, clientEntityId),
              eq(salesInvoices.status, "pending"),
            ),
          }),
        5_000,
        "firm-refresh-overdue-ar",
      );
      const overdueCount = invoicesAr.filter(
        (inv) => new Date(inv.dueDate) < new Date(),
      ).length;

      // Count unreconciled bank transactions — 5s timeout
      const unreconciledTxs = await withTimeout(
        () =>
          db.query.bankTransactions.findMany({
            where: and(
              eq(bankTransactions.entityId, clientEntityId),
              eq(bankTransactions.isReconciled, false),
            ),
          }),
        5_000,
        "firm-refresh-unreconciled",
      );
      const unreconciledCount = unreconciledTxs.length;

      // Count pending approvals — 5s timeout (parallel queries)
      const [pendingJournalEntries, pendingApInvoices] = await Promise.all([
        withTimeout(
          () =>
            db.query.journalEntries.findMany({
              where: and(
                eq(journalEntries.entityId, clientEntityId),
                eq(journalEntries.status, "draft"),
              ),
            }),
          5_000,
          "firm-refresh-pending-jes",
        ),
        withTimeout(
          () =>
            db.query.invoicesAp.findMany({
              where: and(
                eq(invoicesAp.entityId, clientEntityId),
                eq(invoicesAp.status, "pending"),
              ),
            }),
          5_000,
          "firm-refresh-pending-ap",
        ),
      ]);
      const totalPending =
        pendingJournalEntries.length + pendingApInvoices.length;

      // Check last close period — 5s timeout
      const lastCloseRun = await withTimeout(
        () =>
          db.query.consolidationRuns.findFirst({
            where: and(
              eq(consolidationRuns.parentEntityId, clientEntityId),
              eq(consolidationRuns.status, "completed"),
            ),
            orderBy: [desc(consolidationRuns.period)],
          }),
        5_000,
        "firm-refresh-last-close",
      );
      const lastClosePeriod = lastCloseRun?.period ?? null;

      // Get total cash balance from bank accounts — 5s timeout
      const bankAccs = await withTimeout(
        () =>
          db.query.bankAccounts.findMany({
            where: and(
              eq(bankAccounts.entityId, clientEntityId),
              eq(bankAccounts.isActive, true),
            ),
          }),
        5_000,
        "firm-refresh-bank-balance",
      );
      const cashBal = bankAccs.reduce(
        (sum, a) => sum + parseFloat(a.currentBalance || "0"),
        0,
      );

      // Check if books are current (close was this month or last month)
      const booksCurrent = lastClosePeriod
        ? (() => {
            const [year, month] = lastClosePeriod.split("-").map(Number);
            const now = new Date();
            const monthsDiff =
              (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
            return monthsDiff <= 2;
          })()
        : false;

      // Days until next close (estimate: 15th of next month)
      const now = new Date();
      const nextClose = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const daysUntilClose = Math.max(
        0,
        Math.round(
          (nextClose.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      const snapshotData = {
        unreconciledCount,
        overdueCount,
        totalPending,
        cashBal,
        booksCurrent,
        lastClosePeriod,
        daysUntilClose,
        refreshedAt: new Date().toISOString(),
      };

      const healthStatus = computeHealthStatus({
        booksCurrent,
        unreconciledItems: String(unreconciledCount),
        overdueInvoices: String(overdueCount),
        pendingApprovals: String(totalPending),
      });

      // Upsert the snapshot — 5s timeout
      const existing = await withTimeout(
        () =>
          db.query.firmDashboardSnapshots.findFirst({
            where: and(
              eq(firmDashboardSnapshots.firmOrgId, firmOrgId),
              eq(firmDashboardSnapshots.clientEntityId, clientEntityId),
            ),
          }),
        5_000,
        "firm-refresh-find-snapshot",
      );

      if (existing) {
        await withTimeout(
          () =>
            db
              .update(firmDashboardSnapshots)
              .set({
                healthStatus,
                booksCurrent,
                unreconciledItems: String(unreconciledCount),
                overdueInvoices: String(overdueCount),
                pendingApprovals: String(totalPending),
                daysUntilClose: String(daysUntilClose),
                lastClosePeriod,
                cashBalance: String(cashBal),
                lastRefreshedAt: new Date(),
                snapshotData,
              })
              .where(eq(firmDashboardSnapshots.id, existing.id)),
          5_000,
          "firm-refresh-update-snapshot",
        );
      } else {
        await withTimeout(
          () =>
            db.insert(firmDashboardSnapshots).values({
              firmOrgId,
              clientEntityId,
              healthStatus,
              booksCurrent,
              unreconciledItems: String(unreconciledCount),
              overdueInvoices: String(overdueCount),
              pendingApprovals: String(totalPending),
              daysUntilClose: String(daysUntilClose),
              lastClosePeriod,
              cashBalance: String(cashBal),
              lastRefreshedAt: new Date(),
              snapshotData,
            }),
          5_000,
          "firm-refresh-insert-snapshot",
        );
      }
    },
    {
      agentId: "firm-dashboard",
      operationName: "refresh-client-snapshot",
      context: { firmOrgId, clientEntityId },
    },
  );
}

// ─── Router ────────────────────────────────────────────────────────────

export const firmRouter = router({
  // ── List Active Clients ───────────────────────────────────────────
  // Returns all active client engagements with dashboard snapshots.
  // Cross-client isolation: the firm_org_id is derived from the user's
  // session, not from client input.

  listClients: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["active", "ended", "pending_consent"])
            .default("active"),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Get the user's organizations (the firm's orgs)
      const userOrgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!),
      });

      const firmOrgs = userOrgs.filter((o) => o.type === "accounting_firm");
      if (firmOrgs.length === 0) return { firms: [], clients: [] };

      const engagements = await db.query.clientEngagements.findMany({
        where: and(
          eq(clientEngagements.firmOrgId, firmOrgs[0].id),
          eq(clientEngagements.status, input?.status ?? "active"),
        ),
        with: {
          clientEntity: {
            columns: {
              id: true,
              name: true,
              currency: true,
              country: true,
              type: true,
              isActive: true,
            },
          },
        },
        orderBy: [desc(clientEngagements.addedAt)],
      });

      // Get snapshots for each client
      const clientIds = engagements.map((e) => e.clientEntityId);
      const snapshots =
        clientIds.length > 0
          ? await db.query.firmDashboardSnapshots.findMany({
              where: inArray(firmDashboardSnapshots.clientEntityId, clientIds),
            })
          : [];
      const snapshotMap = new Map(snapshots.map((s) => [s.clientEntityId, s]));

      // Apply search filter if provided
      const searchTerm = input?.search?.toLowerCase();
      const filtered = engagements.filter((e) => {
        if (!searchTerm) return true;
        return e.clientEntity.name.toLowerCase().includes(searchTerm);
      });

      return {
        firms: firmOrgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
        })),
        clients: filtered.map((e) => {
          const snapshot = snapshotMap.get(e.clientEntityId);
          return {
            engagementId: e.id,
            engagementType: e.engagementType,
            addedAt: e.addedAt,
            clientConsentedAt: e.clientConsentedAt,
            entity: e.clientEntity,
            snapshot: snapshot
              ? {
                  healthStatus: snapshot.healthStatus,
                  booksCurrent: snapshot.booksCurrent,
                  unreconciledItems: Number(snapshot.unreconciledItems),
                  overdueInvoices: Number(snapshot.overdueInvoices),
                  pendingApprovals: Number(snapshot.pendingApprovals),
                  daysUntilClose: Number(snapshot.daysUntilClose),
                  lastClosePeriod: snapshot.lastClosePeriod,
                  cashBalance: Number(snapshot.cashBalance),
                  lastRefreshedAt: snapshot.lastRefreshedAt,
                }
              : null,
          };
        }),
      };
    }),

  // ── Get Single Client Health ─────────────────────────────────────
  // Detailed read-only health aggregation for a specific client entity.

  getClientHealth: protectedProcedure
    .input(
      z.object({
        clientEntityId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify the user has access to this client through a firm engagement
      const userOrgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!),
      });
      const firmOrgIds = userOrgs
        .filter((o) => o.type === "accounting_firm")
        .map((o) => o.id);

      if (firmOrgIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User does not belong to an accounting firm",
        });
      }

      const engagement = await db.query.clientEngagements.findFirst({
        where: and(
          eq(clientEngagements.clientEntityId, input.clientEntityId),
          inArray(clientEngagements.firmOrgId, firmOrgIds),
          eq(clientEngagements.status, "active"),
        ),
      });

      if (!engagement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client engagement not found or access denied",
        });
      }

      // Refresh the snapshot before returning
      await refreshClientSnapshot(engagement.firmOrgId, input.clientEntityId);

      const snapshot = await db.query.firmDashboardSnapshots.findFirst({
        where: and(
          eq(firmDashboardSnapshots.firmOrgId, engagement.firmOrgId),
          eq(firmDashboardSnapshots.clientEntityId, input.clientEntityId),
        ),
      });

      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, input.clientEntityId),
      });

      return {
        engagement: {
          id: engagement.id,
          engagementType: engagement.engagementType,
          status: engagement.status,
          addedAt: engagement.addedAt,
          clientConsentedAt: engagement.clientConsentedAt,
          notes: engagement.notes,
        },
        entity,
        snapshot: snapshot
          ? {
              healthStatus: snapshot.healthStatus,
              booksCurrent: snapshot.booksCurrent,
              unreconciledItems: Number(snapshot.unreconciledItems),
              overdueInvoices: Number(snapshot.overdueInvoices),
              pendingApprovals: Number(snapshot.pendingApprovals),
              daysUntilClose: Number(snapshot.daysUntilClose),
              lastClosePeriod: snapshot.lastClosePeriod,
              cashBalance: Number(snapshot.cashBalance),
              lastRefreshedAt: snapshot.lastRefreshedAt,
              snapshotData: snapshot.snapshotData,
            }
          : null,
      };
    }),

  // ── Link Client ──────────────────────────────────────────────────
  // Creates a new client engagement linking a client entity to the firm.
  // Two paths: (a) create new entity + grant access, or (b) link existing.

  linkClient: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        clientEntityId: z.string().uuid(),
        engagementType: z
          .enum(["full", "review", "tax_only", "audit_only"])
          .default("full"),
        clientConsented: z.boolean().default(false),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the user's accounting firm organizations
        const userOrgs = await db.query.organizations.findMany({
          where: eq(organizations.ownerId, ctx.session!.user!.id!),
        });
        const firmOrg = userOrgs.find((o) => o.type === "accounting_firm");

        if (!firmOrg) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not belong to an accounting firm",
          });
        }

        // Verify the client entity exists
        const clientEntity = await db.query.entities.findFirst({
          where: eq(entities.id, input.clientEntityId),
        });
        if (!clientEntity) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client entity not found",
          });
        }

        // Check for existing engagement
        const existing = await db.query.clientEngagements.findFirst({
          where: and(
            eq(clientEngagements.firmOrgId, firmOrg.id),
            eq(clientEngagements.clientEntityId, input.clientEntityId),
          ),
        });

        if (existing && existing.status === "active") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Client is already linked to this firm",
          });
        }

        // Create engagement
        const [engagement] = await db
          .insert(clientEngagements)
          .values({
            firmOrgId: firmOrg.id,
            clientEntityId: input.clientEntityId,
            status: input.clientConsented ? "active" : "pending_consent",
            addedById: ctx.session!.user!.id!,
            engagementType: input.engagementType,
            clientConsentedAt: input.clientConsented ? new Date() : null,
            clientConsentedById: input.clientConsented
              ? ctx.session!.user!.id!
              : null,
            notes: input.notes,
          })
          .returning();

        // Grant firm users external_auditor access to the client entity
        // This uses the existing user_entity_access table — same isolation
        await db.insert(userEntityAccess).values({
          userId: ctx.session!.user!.id!,
          entityId: input.clientEntityId,
          role: "external_auditor",
          grantedBy: ctx.session!.user!.id!,
        });

        // Log audit trail (PII redacted)
        await db.insert(auditLog).values({
          entityId: input.clientEntityId,
          userId: ctx.session!.user!.id!,
          action: "firm.linkClient",
          entityType: "client_engagement",
          entityIdRef: engagement.id,
          newValues: redactPIIFromObject({
            firmOrgId: firmOrg.id,
            engagementType: input.engagementType,
            clientConsented: input.clientConsented,
          }),
        });

        return {
          success: true,
          engagement: {
            id: engagement.id,
            status: engagement.status,
          },
        };
      } catch (error) {
        handleMutationError(error, "Failed to link client");
      }
    }),

  // ── Unlink Client ────────────────────────────────────────────────
  // Ends a client engagement. The client entity remains intact — only
  // the firm's access is revoked.

  unlinkClient: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        engagementId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const engagement = await db.query.clientEngagements.findFirst({
          where: eq(clientEngagements.id, input.engagementId),
        });

        if (!engagement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Engagement not found",
          });
        }

        // End the engagement
        await db
          .update(clientEngagements)
          .set({
            status: "ended",
            endedAt: new Date(),
            endedById: ctx.session!.user!.id!,
          })
          .where(eq(clientEngagements.id, input.engagementId));

        // Remove firm user's access to client entity
        await db
          .delete(userEntityAccess)
          .where(
            and(
              eq(userEntityAccess.entityId, engagement.clientEntityId),
              eq(userEntityAccess.userId, ctx.session!.user!.id!),
            ),
          );

        // Log audit trail (PII redacted)
        await db.insert(auditLog).values({
          entityId: engagement.clientEntityId,
          userId: ctx.session!.user!.id!,
          action: "firm.unlinkClient",
          entityType: "client_engagement",
          entityIdRef: engagement.id,
          newValues: redactPIIFromObject({ status: "ended" }),
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to unlink client");
      }
    }),

  // ── List Available Entities (for linking) ───────────────────────
  // Returns entities in the same org that are NOT yet linked as clients.

  listAvailableEntities: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userOrgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!),
      });
      const firmOrg = userOrgs.find((o) => o.type === "accounting_firm");
      if (!firmOrg) return [];

      // Get all entities in the firm's org
      const orgEntities = await db.query.entities.findMany({
        where: and(
          eq(entities.organizationId, firmOrg.id),
          eq(entities.isActive, true),
        ),
      });

      // Get already-linked entities
      const existingLinks = await db.query.clientEngagements.findMany({
        where: eq(clientEngagements.firmOrgId, firmOrg.id),
      });
      const linkedIds = new Set(existingLinks.map((l) => l.clientEntityId));

      // Filter out linked entities and self
      const available = orgEntities.filter((e) => !linkedIds.has(e.id));

      // Apply search
      const searchTerm = input?.search?.toLowerCase();
      return searchTerm
        ? available.filter((e) => e.name.toLowerCase().includes(searchTerm))
        : available;
    }),

  // ── Refresh Dashboard Snapshot ───────────────────────────────────
  // Manually triggers a refresh of a client's dashboard snapshot.

  refreshSnapshot: mutateProcedure
    .input(
      z.object({
        clientEntityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userOrgs = await db.query.organizations.findMany({
          where: eq(organizations.ownerId, ctx.session!.user!.id!),
        });
        const firmOrgIds = userOrgs
          .filter((o) => o.type === "accounting_firm")
          .map((o) => o.id);

        if (firmOrgIds.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not an accounting firm user",
          });
        }

        const engagement = await db.query.clientEngagements.findFirst({
          where: and(
            eq(clientEngagements.clientEntityId, input.clientEntityId),
            inArray(clientEngagements.firmOrgId, firmOrgIds),
            eq(clientEngagements.status, "active"),
          ),
        });

        if (!engagement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active engagement not found",
          });
        }

        await refreshClientSnapshot(engagement.firmOrgId, input.clientEntityId);

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to refresh snapshot");
      }
    }),

  // ── Engagement History ───────────────────────────────────────────
  // Historical record of all engagements (active + ended).

  listEngagementHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userOrgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!),
      });
      const firmOrg = userOrgs.find((o) => o.type === "accounting_firm");
      if (!firmOrg) return [];

      return db.query.clientEngagements.findMany({
        where: eq(clientEngagements.firmOrgId, firmOrg.id),
        with: {
          clientEntity: {
            columns: { id: true, name: true, currency: true },
          },
        },
        orderBy: [desc(clientEngagements.addedAt)],
        limit: input?.limit ?? 50,
      });
    }),
});
