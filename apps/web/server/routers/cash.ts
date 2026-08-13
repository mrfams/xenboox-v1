import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requirePermission,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  cashAccounts,
  imprestFloats,
  imprestReceipts,
  pettyCashLedger,
} from "@xenboox/db/schema";
import { auditLog } from "@xenboox/db/schema/documents";
import { TRPCError } from "@trpc/server";
import { runCashPipeline } from "@xenboox/agents";

// ─── Cash Router ─────────────────────────────────────────────────────────────

export const cashRouter = router({
  // ── Cash Accounts ──
  listCashAccounts: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.cashAccounts.findMany({
      where: eq(cashAccounts.entityId, ctx.entityId!),
      orderBy: [desc(cashAccounts.createdAt)],
    });
  }),

  createCashAccount: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "create"))
    .input(
      z.object({
        name: z.string().min(1),
        currency: z.string().length(3).default("GMD"),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [cashAccount] = await db
          .insert(cashAccounts)
          .values({ ...input, entityId: ctx.entityId! })
          .returning();
        if (!cashAccount) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create cash account",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "cash_account.create",
          entityType: "cash_account",
          entityIdRef: cashAccount.id,
          newValues: {
            name: input.name,
            currency: input.currency,
            isActive: input.isActive,
          },
        });

        return cashAccount;
      } catch (error) {
        handleMutationError(error, "Failed to create cash account");
      }
    }),

  updateCashAccount: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(cashAccounts)
          .set(data)
          .where(
            and(
              eq(cashAccounts.id, id),
              eq(cashAccounts.entityId, ctx.entityId!),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update cash account");
      }
    }),

  getCashAccountById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.cashAccounts.findFirst({
        where: and(
          eq(cashAccounts.id, input.id),
          eq(cashAccounts.entityId, ctx.entityId!),
        ),
      });
    }),

  // ── Imprest Floats ──
  listImprestFloats: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.imprestFloats.findMany({
      where: eq(imprestFloats.entityId, ctx.entityId!),
      orderBy: [desc(imprestFloats.createdAt)],
    });
  }),

  createImprestFloat: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "create"))
    .input(
      z.object({
        cashAccountId: z.string().uuid(),
        assigneeName: z.string().min(1),
        purpose: z.string().optional(),
        amount: z.string(),
        issuedDate: z.string(),
        settleByDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [float] = await db
          .insert(imprestFloats)
          .values({
            ...input,
            entityId: ctx.entityId!,
            remainingBalance: input.amount,
            status: "active",
          })
          .returning();
        if (!float) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create imprest float",
          });
        }
        return float;
      } catch (error) {
        handleMutationError(error, "Failed to create imprest float");
      }
    }),

  getImprestFloatById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const float = await db.query.imprestFloats.findFirst({
        where: and(
          eq(imprestFloats.id, input.id),
          eq(imprestFloats.entityId, ctx.entityId!),
        ),
      });
      if (!float) return null;

      const receipts = await db.query.imprestReceipts.findMany({
        where: eq(imprestReceipts.imprestFloatId, float.id),
      });

      return { ...float, receipts };
    }),

  updateImprestFloat: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        assigneeName: z.string().min(1).optional(),
        purpose: z.string().optional(),
        settleByDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(imprestFloats)
          .set(data)
          .where(
            and(
              eq(imprestFloats.id, id),
              eq(imprestFloats.entityId, ctx.entityId!),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update imprest float");
      }
    }),

  deleteImprestReceipt: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const receipt = await db.query.imprestReceipts.findFirst({
          where: eq(imprestReceipts.id, input.id),
        });
        if (!receipt)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Receipt not found",
          });

        return db.transaction(async (tx) => {
          const float = await tx.query.imprestFloats.findFirst({
            where: eq(imprestFloats.id, receipt.imprestFloatId),
          });

          await tx
            .delete(imprestReceipts)
            .where(eq(imprestReceipts.id, input.id));

          if (float) {
            const currentBalance = parseFloat(float.remainingBalance);
            const receiptAmount = parseFloat(receipt.amount);
            await tx
              .update(imprestFloats)
              .set({
                remainingBalance: (currentBalance + receiptAmount).toFixed(2),
              })
              .where(eq(imprestFloats.id, receipt.imprestFloatId));
          }

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "cash.deleteImprestReceipt",
            entityType: "imprest_receipt",
            entityIdRef: input.id,
            oldValues: { amount: receipt.amount },
          });

          return { success: true };
        });
      } catch (error) {
        handleMutationError(error, "Failed to delete imprest receipt");
      }
    }),

  addImprestReceipt: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "create"))
    .input(
      z.object({
        imprestFloatId: z.string().uuid(),
        description: z.string().min(1),
        amount: z.string(),
        receiptDate: z.string(),
        documentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { imprestFloatId, amount: amountStr, ...receiptData } = input;
        const amount = parseFloat(amountStr);

        const float = await db.query.imprestFloats.findFirst({
          where: and(
            eq(imprestFloats.id, imprestFloatId),
            eq(imprestFloats.entityId, ctx.entityId!),
          ),
        });
        if (!float) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imprest float not found",
          });
        }

        const currentBalance = parseFloat(float.remainingBalance);
        if (amount > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Receipt amount ${amountStr} exceeds remaining balance ${float.remainingBalance}`,
          });
        }

        return db.transaction(async (tx) => {
          const [receipt] = await tx
            .insert(imprestReceipts)
            .values({
              ...receiptData,
              imprestFloatId,
              amount: amountStr,
            })
            .returning();

          const newBalance = currentBalance - amount;
          await tx
            .update(imprestFloats)
            .set({ remainingBalance: Math.max(newBalance, 0).toFixed(2) })
            .where(eq(imprestFloats.id, imprestFloatId));

          return receipt;
        });
      } catch (error) {
        handleMutationError(error, "Failed to add imprest receipt");
      }
    }),

  settleImprestFloat: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "approve"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await db
          .update(imprestFloats)
          .set({
            status: "settled",
            settledAt: new Date(),
          })
          .where(
            and(
              eq(imprestFloats.id, input.id),
              eq(imprestFloats.entityId, ctx.entityId!),
              eq(imprestFloats.status, "active"),
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imprest float not found or already settled",
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to settle imprest float");
      }
    }),

  getPettyCashEntryById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.pettyCashLedger.findFirst({
        where: and(
          eq(pettyCashLedger.id, input.id),
          eq(pettyCashLedger.entityId, ctx.entityId!),
        ),
      });
    }),

  updatePettyCashEntry: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(1).optional(),
        debit: z.string().optional(),
        credit: z.string().optional(),
        balance: z.string().optional(),
        category: z.string().optional(),
        reference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(pettyCashLedger)
          .set(data)
          .where(
            and(
              eq(pettyCashLedger.id, id),
              eq(pettyCashLedger.entityId, ctx.entityId!),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update petty cash entry");
      }
    }),

  // ── Petty Cash ──
  listPettyCash: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.pettyCashLedger.findMany({
      where: eq(pettyCashLedger.entityId, ctx.entityId!),
      orderBy: [desc(pettyCashLedger.createdAt)],
    });
  }),

  createPettyCashEntry: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "create"))
    .input(
      z.object({
        cashAccountId: z.string().uuid(),
        transactionDate: z.string(),
        description: z.string().min(1),
        debit: z.string().optional(),
        credit: z.string().optional(),
        balance: z.string(),
        category: z.string().optional(),
        reference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [entry] = await db
          .insert(pettyCashLedger)
          .values({
            ...input,
            entityId: ctx.entityId!,
          })
          .returning();
        if (!entry) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create petty cash entry",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "petty_cash.create_entry",
          entityType: "petty_cash_ledger",
          entityIdRef: entry.id,
          newValues: {
            description: input.description,
            debit: input.debit,
            credit: input.credit,
            balance: input.balance,
          },
        });

        return entry;
      } catch (error) {
        handleMutationError(error, "Failed to create petty cash entry");
      }
    }),

  deleteCashAccount: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const account = await db.query.cashAccounts.findFirst({
          where: and(
            eq(cashAccounts.id, input.id),
            eq(cashAccounts.entityId, ctx.entityId!),
          ),
        });
        if (!account)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cash account not found",
          });
        await db.delete(cashAccounts).where(eq(cashAccounts.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "cash.deleteCashAccount",
          entityType: "cash_account",
          entityIdRef: input.id,
          newValues: { name: account.name },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete cash account");
      }
    }),

  deleteImprestFloat: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const float = await db.query.imprestFloats.findFirst({
          where: and(
            eq(imprestFloats.id, input.id),
            eq(imprestFloats.entityId, ctx.entityId!),
          ),
        });
        if (!float)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imprest float not found",
          });
        if (float.status !== "active")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a settled or closed imprest float",
          });
        await db.delete(imprestFloats).where(eq(imprestFloats.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "cash.deleteImprestFloat",
          entityType: "imprest_float",
          entityIdRef: input.id,
          newValues: { amount: float.amount },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete imprest float");
      }
    }),

  deletePettyCashEntry: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entry = await db.query.pettyCashLedger.findFirst({
          where: and(
            eq(pettyCashLedger.id, input.id),
            eq(pettyCashLedger.entityId, ctx.entityId!),
          ),
        });
        if (!entry)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Petty cash entry not found",
          });
        await db
          .delete(pettyCashLedger)
          .where(eq(pettyCashLedger.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "cash.deletePettyCashEntry",
          entityType: "petty_cash",
          entityIdRef: input.id,
          newValues: {
            debit: entry.debit,
            credit: entry.credit,
            balance: entry.balance,
          },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete petty cash entry");
      }
    }),

  // ─── Pipeline 4: Cash & Imprest ────────────────────────────────────────

  runCashPipeline: rlsMutateProcedure
    .use(requirePermission("cash_imprest", "approve"))
    .mutation(async ({ ctx }) => {
      return runCashPipeline(ctx.entityId!);
    }),
});
