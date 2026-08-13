import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
  requirePermission,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  mobileMoneyAccounts,
  mobileMoneyTransactions,
  auditLog,
} from "@xenboox/db/schema";
import { TRPCError } from "@trpc/server";

// ─── Mobile Money Router ─────────────────────────────────────────────────────

export const mobileMoneyRouter = router({
  // ── Accounts ──
  listAccounts: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.mobileMoneyAccounts.findMany({
      where: eq(mobileMoneyAccounts.entityId, ctx.entityId!),
      orderBy: [desc(mobileMoneyAccounts.createdAt)],
    });
  }),

  createAccount: rlsMutateProcedure
    .use(requirePermission("mobile_money", "create"))
    .input(
      z.object({
        provider: z.enum(["modempay", "afrimoney", "qmoney", "mpesa", "wave"]),
        phoneNumber: z.string().min(1),
        accountName: z.string().min(1),
        currency: z.string().length(3).default("GMD"),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .insert(mobileMoneyAccounts)
        .values({ ...input, entityId: ctx.entityId! })
        .returning();

      if (account) {
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "mobile_money.createAccount",
          entityType: "mobile_money_account",
          entityIdRef: account.id,
          newValues: {
            provider: input.provider,
            phoneNumber: input.phoneNumber,
            accountName: input.accountName,
            currency: input.currency,
          },
        });
      }
      return account;
    }),

  updateAccount: rlsMutateProcedure
    .use(requirePermission("mobile_money", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        phoneNumber: z.string().min(1).optional(),
        accountName: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(mobileMoneyAccounts)
        .set(data)
        .where(
          and(
            eq(mobileMoneyAccounts.id, id),
            eq(mobileMoneyAccounts.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return updated;
    }),

  // ── Transactions ──
  listTransactions: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.mobileMoneyTransactions.findMany({
      where: eq(mobileMoneyTransactions.entityId, ctx.entityId!),
      orderBy: [desc(mobileMoneyTransactions.createdAt)],
    });
  }),

  createTransaction: rlsMutateProcedure
    .use(requirePermission("mobile_money", "create"))
    .input(
      z.object({
        mobileMoneyAccountId: z.string().uuid(),
        type: z.enum(["collection", "disbursement", "transfer", "refund"]),
        amount: z.string(),
        fee: z.string().optional(),
        counterparty: z.string().optional(),
        counterpartyName: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["pending", "successful", "failed", "reversed", "timeout"])
          .default("pending"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const amount = parseFloat(input.amount);
      const fee = input.fee ? parseFloat(input.fee) : 0;
      const netAmount = (amount - fee).toFixed(2);

      const [tx] = await db
        .insert(mobileMoneyTransactions)
        .values({
          ...input,
          entityId: ctx.entityId!,
          fee: input.fee ?? "0",
          netAmount,
        })
        .returning();
      return tx;
    }),

  updateTransactionStatus: rlsMutateProcedure
    .use(requirePermission("mobile_money", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["successful", "failed", "reversed", "timeout"]),
        failureReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tx = await db.query.mobileMoneyTransactions.findFirst({
        where: and(
          eq(mobileMoneyTransactions.id, input.id),
          eq(mobileMoneyTransactions.entityId, ctx.entityId!),
        ),
      });
      if (!tx) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }
      if (tx.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transaction status is already "${tx.status}" — cannot update`,
        });
      }

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "successful") {
        updateData.completedAt = new Date();
      } else if (input.status === "failed" || input.status === "timeout") {
        updateData.failedAt = new Date();
        updateData.failureReason = input.failureReason;
      } else if (input.status === "reversed") {
        updateData.completedAt = new Date();
      }

      const [updated] = await db
        .update(mobileMoneyTransactions)
        .set(updateData)
        .where(
          and(
            eq(mobileMoneyTransactions.id, input.id),
            eq(mobileMoneyTransactions.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return updated;
    }),

  deleteAccount: rlsMutateProcedure
    .use(requirePermission("mobile_money", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const acct = await db.query.mobileMoneyAccounts.findFirst({
          where: and(
            eq(mobileMoneyAccounts.id, input.id),
            eq(mobileMoneyAccounts.entityId, ctx.entityId!),
          ),
        });
        if (!acct)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Mobile money account not found",
          });
        await db
          .delete(mobileMoneyAccounts)
          .where(eq(mobileMoneyAccounts.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "mobileMoney.deleteAccount",
          entityType: "mobile_money_account",
          entityIdRef: input.id,
          newValues: { accountName: acct.accountName },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete mobile money account");
      }
    }),

  deleteTransaction: rlsMutateProcedure
    .use(requirePermission("mobile_money", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tx = await db.query.mobileMoneyTransactions.findFirst({
          where: and(
            eq(mobileMoneyTransactions.id, input.id),
            eq(mobileMoneyTransactions.entityId, ctx.entityId!),
          ),
        });
        if (!tx)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaction not found",
          });
        await db
          .delete(mobileMoneyTransactions)
          .where(eq(mobileMoneyTransactions.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "mobileMoney.deleteTransaction",
          entityType: "mobile_money_transaction",
          entityIdRef: input.id,
          newValues: { type: tx.type },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete transaction");
      }
    }),
});
