import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import {
  consolidationRuns,
  eliminationEntries,
  minorityInterestRecords,
  entityRelationships,
  intercompanyTags,
} from "@xenboox/db/schema";
import { entities } from "@xenboox/db/schema/organization";
import { salesInvoices, invoicesAp } from "@xenboox/db/schema/ap-ar";
import { bankAccounts } from "@xenboox/db/schema/treasury";
import { journalEntries } from "@xenboox/db/schema/accounting";
import {
  runConsolidationPipeline,
  getConsolidationStatus,
  approveConsolidationRun,
  createEntityRelationship,
  listEntityRelationships,
} from "@xenboox/agents";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
} from "@/lib/trpc/server";

export const consolidationRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityCtx = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });

      if (!entityCtx) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entity not found",
        });
      }

      try {
        const result = await runConsolidationPipeline({
          entityId: ctx.entityId!,
          organizationId: entityCtx.organizationId,
          period: input.period,
          userId: ctx.session!.user!.id!,
        });

        return {
          success: result.success,
          period: result.period,
          subsidiaries: result.subsidiaries,
          icTransactions: result.icTransactions.length,
          eliminations: result.eliminations.length,
          translations: result.translations.length,
          minorityInterests: result.minorityInterests.length,
          consolidatedTotals: result.consolidatedTotals,
          integrityCheckPassed: result.integrityCheckPassed,
          stepsCompleted: result.steps.filter((s) =>
            ["completed", "skipped"].includes(s.status),
          ).length,
          totalSteps: result.steps.length,
          stepDetails: result.steps.map((s) => ({
            id: s.id,
            label: s.label,
            status: s.status,
            agent: s.agent,
          })),
          errors: result.errors,
          warnings: result.warnings,
        };
      } catch (error) {
        handleMutationError(error, "Consolidation pipeline failed");
      }
    }),

  // ── Controller Sign-off ─────────────────────────────────────────────

  approveRun: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        runId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the run is in reviewing status before approving
      const run = await db.query.consolidationRuns.findFirst({
        where: and(
          eq(consolidationRuns.id, input.runId),
          eq(consolidationRuns.parentEntityId, ctx.entityId!),
        ),
      });

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Consolidation run not found",
        });
      }

      if (run.status !== "reviewing") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            run.status === "completed"
              ? "This consolidation run has already been approved"
              : `Cannot approve run with status "${run.status}". Run must be in "reviewing" status.`,
        });
      }

      try {
        await approveConsolidationRun({
          runId: input.runId,
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to approve consolidation run");
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: rlsProtectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getConsolidationStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── Pipeline Runs History ───────────────────────────────────────────

  listRuns: rlsProtectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(10) }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.consolidationRuns.findMany({
        where: eq(consolidationRuns.parentEntityId, ctx.entityId!),
        orderBy: [desc(consolidationRuns.createdAt)],
        limit: input?.limit ?? 10,
      });
    }),

  // ── Entity Relationships ────────────────────────────────────────────

  listRelationships: rlsProtectedProcedure.query(async ({ ctx }) => {
    return listEntityRelationships({ entityId: ctx.entityId! });
  }),

  createRelationship: rlsMutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        subsidiaryEntityId: z.string().uuid(),
        ownershipPct: z.number().min(0.01).max(100),
        currency: z.string().length(3).default("GMD"),
        consolidationMethod: z
          .enum(["full", "equity", "proportional"])
          .default("full"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await createEntityRelationship({
          parentEntityId: ctx.entityId!,
          subsidiaryEntityId: input.subsidiaryEntityId,
          ownershipPct: input.ownershipPct,
          currency: input.currency,
          consolidationMethod: input.consolidationMethod,
          notes: input.notes,
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to create entity relationship");
      }
    }),

  // ── Available Subsidiaries (entities within same org not yet linked) ─

  listAvailableSubsidiaries: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityCtx = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
    });
    if (!entityCtx) return [];

    // Get all entities in the same org
    const allEntities = await db.query.entities.findMany({
      where: and(
        eq(entities.organizationId, entityCtx.organizationId),
        eq(entities.isActive, true),
      ),
    });

    // Get already-linked subsidiaries
    const existingRels = await db.query.entityRelationships.findMany({
      where: eq(entityRelationships.parentEntityId, ctx.entityId!),
    });
    const linkedIds = new Set(existingRels.map((r) => r.subsidiaryEntityId));
    linkedIds.add(ctx.entityId!); // Exclude self

    return allEntities.filter((e) => !linkedIds.has(e.id));
  }),

  // ── Elimination Entries ─────────────────────────────────────────────

  listEliminations: rlsProtectedProcedure
    .input(
      z
        .object({
          runId: z.string().uuid().optional(),
          type: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.runId
        ? [eq(eliminationEntries.consolidationRunId, input.runId)]
        : [eq(eliminationEntries.entityId, ctx.entityId!)];

      if (input?.type) {
        where.push(eq(eliminationEntries.eliminationType, input.type));
      }

      return db.query.eliminationEntries.findMany({
        where: and(...where),
        orderBy: [desc(eliminationEntries.createdAt)],
        limit: input?.limit ?? 50,
        with: { entity: true, counterparty: true },
      });
    }),

  // ── Minority Interest Records ───────────────────────────────────────

  listMinorityInterests: rlsProtectedProcedure
    .input(
      z
        .object({
          runId: z.string().uuid(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.runId
        ? [eq(minorityInterestRecords.consolidationRunId, input.runId)]
        : [eq(minorityInterestRecords.subsidiaryEntityId, ctx.entityId!)];

      return db.query.minorityInterestRecords.findMany({
        where: and(...where),
        orderBy: [desc(minorityInterestRecords.period)],
        with: {
          subsidiary: { columns: { id: true, name: true, currency: true } },
        },
      });
    }),

  // ── Inter-Company Tags ──────────────────────────────────────────────

  listICTags: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.intercompanyTags.findMany({
        where: and(
          eq(intercompanyTags.entityId, ctx.entityId!),
          isNull(intercompanyTags.reversedAt),
        ),
        orderBy: [desc(intercompanyTags.taggedAt)],
        limit: input?.limit ?? 20,
        with: { counterparty: { columns: { id: true, name: true } } },
      });
    }),

  // ── Consolidated View (side-by-side entity comparison) ───────────────
  // Returns financial data for the parent entity and all subsidiaries side-by-side,
  // plus elimination entries and consolidated totals.

  getConsolidatedView: rlsProtectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const period =
        input?.period ??
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      // Get the current entity (parent)
      const parentEntity = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });
      if (!parentEntity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }

      // Get entity relationships
      const relationships = await db.query.entityRelationships.findMany({
        where: and(
          eq(entityRelationships.parentEntityId, ctx.entityId!),
          eq(entityRelationships.status, "active"),
        ),
        with: { subsidiary: true },
      });

      // Build list of all entities to include (parent + subsidiaries)
      const allEntityIds = [
        ctx.entityId!,
        ...relationships.map((r) => r.subsidiaryEntityId),
      ];

      // Fetch financial data for each entity
      const entityFinancials = await Promise.all(
        allEntityIds.map(async (eid) => {
          const entity =
            eid === ctx.entityId!
              ? parentEntity
              : relationships.find((r) => r.subsidiaryEntityId === eid)
                  ?.subsidiary;

          // Get bank accounts balance
          const bankAccs = await db.query.bankAccounts.findMany({
            where: and(
              eq(bankAccounts.entityId, eid),
              eq(bankAccounts.isActive, true),
            ),
          });
          const cashBalance = bankAccs.reduce(
            (s, a) => s + parseFloat(a.currentBalance || "0"),
            0,
          );

          // Get AR revenue (paid invoices for period)
          const arInvoices = await db.query.salesInvoices.findMany({
            where: eq(salesInvoices.entityId, eid),
          });
          const totalRevenue = arInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((s, inv) => s + parseFloat(inv.totalAmount || "0"), 0);
          const outstandingAr = arInvoices
            .filter(
              (inv) => inv.status === "pending" || inv.status === "partial",
            )
            .reduce((s, inv) => s + parseFloat(inv.balance || "0"), 0);

          // Get AP payables
          const apInvoices = await db.query.invoicesAp.findMany({
            where: eq(invoicesAp.entityId, eid),
          });
          const outstandingAp = apInvoices
            .filter(
              (inv) => inv.status === "pending" || inv.status === "partial",
            )
            .reduce((s, inv) => s + parseFloat(inv.balance || "0"), 0);

          // Get journal entries for period — cast to access available fields
          const entriesForEntity = await db.query.journalEntries.findMany({
            where: and(
              eq(journalEntries.entityId, eid),
              eq(journalEntries.status, "posted"),
            ),
          });
          const typedEntries = entriesForEntity as Array<{
            type?: string | null;
            totalAmount?: string | null;
          }>;
          const totalExpenses = typedEntries
            .filter((je) => je.type === "expense" || je.type === "purchase")
            .reduce((s, je) => s + parseFloat(je.totalAmount || "0"), 0);
          const netIncome = totalRevenue - totalExpenses;

          // Count transactions
          const transactionCount =
            arInvoices.length + apInvoices.length + entriesForEntity.length;

          return {
            entityId: eid,
            entityName: entity?.name ?? "Unknown",
            currency: entity?.currency ?? "GMD",
            country: entity?.country ?? "",
            isParent: eid === ctx.entityId!,
            relationship: relationships.find(
              (r) => r.subsidiaryEntityId === eid,
            )
              ? {
                  ownershipPct: Number(
                    relationships.find((r) => r.subsidiaryEntityId === eid)!
                      .ownershipPct,
                  ),
                  consolidationMethod: relationships.find(
                    (r) => r.subsidiaryEntityId === eid,
                  )!.consolidationMethod,
                }
              : null,
            financials: {
              totalRevenue,
              totalExpenses,
              netIncome,
              totalAssets: cashBalance + outstandingAr,
              totalLiabilities: outstandingAp,
              equity: cashBalance + outstandingAr - outstandingAp,
              cashBalance,
              outstandingAr,
              outstandingAp,
              transactionCount,
            },
          };
        }),
      );

      // Get latest consolidation run
      const latestRun = await db.query.consolidationRuns.findFirst({
        where: and(
          eq(consolidationRuns.parentEntityId, ctx.entityId!),
          eq(consolidationRuns.period, period),
        ),
        orderBy: [desc(consolidationRuns.createdAt)],
      });

      // Get elimination entries for the latest run
      const elims = latestRun
        ? await db.query.eliminationEntries.findMany({
            where: eq(eliminationEntries.consolidationRunId, latestRun.id),
            orderBy: [desc(eliminationEntries.createdAt)],
            limit: 20,
            with: { entity: true, counterparty: true },
          })
        : [];

      // Compute elimination totals by type
      const eliminationsByType = elims.reduce<Record<string, number>>(
        (acc, e) => {
          const type = e.eliminationType;
          acc[type] = (acc[type] ?? 0) + Number(e.amount);
          return acc;
        },
        {},
      );

      // Compute minority interest breakdown
      const minorityRecords = latestRun
        ? await db.query.minorityInterestRecords.findMany({
            where: eq(minorityInterestRecords.consolidationRunId, latestRun.id),
            with: {
              subsidiary: { columns: { id: true, name: true } },
            },
          })
        : [];

      // Compute consolidated totals (sum of all entities minus eliminations)
      const totalRevenueSum = entityFinancials.reduce(
        (s, e) => s + e.financials.totalRevenue,
        0,
      );
      const totalExpensesSum = entityFinancials.reduce(
        (s, e) => s + e.financials.totalExpenses,
        0,
      );
      const totalEliminationAmount = Object.values(eliminationsByType).reduce(
        (s, v) => s + v,
        0,
      );

      return {
        period,
        parentEntity: {
          id: parentEntity.id,
          name: parentEntity.name,
          currency: parentEntity.currency ?? "GMD",
          country: parentEntity.country ?? "",
        },
        entities: entityFinancials,
        eliminations: elims.map((e) => ({
          id: e.id,
          eliminationType: e.eliminationType,
          description: e.description,
          amount: Number(e.amount),
          debitCredit: e.debitCredit,
          entityName: e.entity?.name ?? "Unknown",
          counterpartyName: e.counterparty?.name ?? "Unknown",
        })),
        eliminationsByType,
        totalEliminationAmount,
        minorityInterests: minorityRecords.map((m) => ({
          subsidiaryName: m.subsidiary?.name ?? "Unknown",
          ownershipPct: Number(m.ownershipPct),
          minorityPct: Number(m.minorityPct),
          minorityShareIncome: Number(m.minorityShareIncome),
          minorityShareEquity: Number(m.minorityShareEquity),
        })),
        consolidatedTotals: {
          totalRevenue:
            totalRevenueSum - (eliminationsByType.ic_revenue_expense ?? 0),
          totalExpenses:
            totalExpensesSum - (eliminationsByType.ic_revenue_expense ?? 0),
          totalAssets:
            entityFinancials.reduce((s, e) => s + e.financials.totalAssets, 0) -
            (eliminationsByType.ic_receivable_payable ?? 0),
          totalLiabilities:
            entityFinancials.reduce(
              (s, e) => s + e.financials.totalLiabilities,
              0,
            ) - (eliminationsByType.ic_receivable_payable ?? 0),
          cashBalance: entityFinancials.reduce(
            (s, e) => s + e.financials.cashBalance,
            0,
          ),
          netIncome: entityFinancials.reduce(
            (s, e) => s + e.financials.netIncome,
            0,
          ),
          entityCount: entityFinancials.length,
          subsidiaryCount: relationships.length,
        },
        latestRun: latestRun
          ? {
              id: latestRun.id,
              status: latestRun.status,
              period: latestRun.period,
              eliminationCount: latestRun.eliminationCount,
              minorityInterestCount: latestRun.minorityInterestCount,
              completedAt: latestRun.completedAt,
              integrityCheckPassed: latestRun.integrityCheckPassed,
              confidence: latestRun.confidence
                ? Number(latestRun.confidence)
                : null,
            }
          : null,
      };
    }),
});
