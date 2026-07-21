import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  inventoryItems,
  inventoryTransactions,
  inventoryValuations,
  warehouses,
  auditLog,
} from "@xenboox/db/schema";
import { userEntityAccess } from "@xenboox/db/schema/organization";
import { sendInventoryAlertEmail } from "@/lib/email";
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment";

// ─── Inventory Router ──────────────────────────────────────────────────────

export const inventoryRouter = router({
  // ── Warehouses ──
  listWarehouses: protectedProcedure.query(({ ctx }) => {
    return db.query.warehouses.findMany({
      where: eq(warehouses.entityId, ctx.entityId!),
    });
  }),

  createWarehouse: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        location: z.string().optional(),
        managerName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [wh] = await db
          .insert(warehouses)
          .values({ ...input, entityId: ctx.entityId!, isActive: true })
          .returning();

        if (!wh) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create warehouse",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "inventory.createWarehouse",
          entityType: "warehouse",
          entityIdRef: wh.id,
          newValues: {
            name: input.name,
            location: input.location,
            managerName: input.managerName,
          },
        });

        return wh;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create warehouse",
        });
      }
    }),

  // ── Inventory Items ──
  listItems: protectedProcedure.query(({ ctx }) => {
    return db.query.inventoryItems.findMany({
      where: eq(inventoryItems.entityId, ctx.entityId!),
      orderBy: [desc(inventoryItems.createdAt)],
    });
  }),

  getItemById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.id, input.id),
          eq(inventoryItems.entityId, ctx.entityId!),
        ),
      });
      if (!item) return null;

      const transactions = await db.query.inventoryTransactions.findMany({
        where: and(
          eq(inventoryTransactions.inventoryItemId, input.id),
          eq(inventoryTransactions.entityId, ctx.entityId!),
        ),
        orderBy: [desc(inventoryTransactions.transactionDate)],
      });

      return { ...item, transactions };
    }),

  createItem: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        sku: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        unitOfMeasure: z.string().default("piece"),
        costMethod: z
          .enum(["fifo", "lifo", "weighted_average"])
          .default("weighted_average"),
        standardCost: z.string().default("0"),
        reorderLevel: z.number().int().default(0),
        reorderQuantity: z.number().int().default(0),
        glAccountId: z.string().uuid().optional(),
        cogsAccountId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [item] = await db
          .insert(inventoryItems)
          .values({
            ...input,
            entityId: ctx.entityId!,
            quantityOnHand: 0,
            isActive: true,
          })
          .returning();

        if (!item) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create inventory item",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "inventory.createItem",
          entityType: "inventory_item",
          entityIdRef: item.id,
          newValues: {
            name: input.name,
            sku: input.sku,
            category: input.category,
            costMethod: input.costMethod,
            standardCost: input.standardCost,
            reorderLevel: input.reorderLevel,
          },
        });

        return item;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create inventory item",
        });
      }
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        standardCost: z.string().optional(),
        reorderLevel: z.number().int().optional(),
        reorderQuantity: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(inventoryItems)
        .set(data)
        .where(
          and(
            eq(inventoryItems.id, id),
            eq(inventoryItems.entityId, ctx.entityId!),
          ),
        )
        .returning();
      return updated;
    }),

  // ── Transactions ──
  listTransactions: protectedProcedure
    .input(z.object({ itemId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.itemId) {
        return db.query.inventoryTransactions.findMany({
          where: and(
            eq(inventoryTransactions.entityId, ctx.entityId!),
            eq(inventoryTransactions.inventoryItemId, input.itemId),
          ),
          orderBy: [desc(inventoryTransactions.transactionDate)],
        });
      }
      return db.query.inventoryTransactions.findMany({
        where: eq(inventoryTransactions.entityId, ctx.entityId!),
        orderBy: [desc(inventoryTransactions.transactionDate)],
      });
    }),

  createTransaction: protectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        inventoryItemId: z.string().uuid(),
        warehouseId: z.string().uuid().optional(),
        type: z.enum(["receipt", "issue", "adjustment", "transfer", "return"]),
        quantity: z.number().int(),
        unitCost: z.string(),
        transactionDate: z.string(),
        referenceType: z.string().optional(),
        referenceId: z.string().uuid().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const unitCost = parseFloat(input.unitCost);
        const totalCost = unitCost * input.quantity;

        // Get entity owner email for notifications
        const ownerAccess = await db.query.userEntityAccess.findFirst({
          where: and(
            eq(userEntityAccess.entityId, ctx.entityId!),
            eq(userEntityAccess.role, "owner"),
          ),
          with: { user: true },
        });
        const recipientEmail =
          ownerAccess?.user?.email ?? ctx.session!.user!.email!;

        return db.transaction(async (tx) => {
          const [txRecord] = await tx
            .insert(inventoryTransactions)
            .values({
              ...input,
              entityId: ctx.entityId!,
              unitCost: input.unitCost,
              totalCost: totalCost.toFixed(2),
            })
            .returning();

          if (txRecord) {
            await tx.insert(auditLog).values({
              entityId: ctx.entityId!,
              userId: ctx.session!.user!.id!,
              action: "inventory.createTransaction",
              entityType: "inventory_transaction",
              entityIdRef: txRecord.id,
              newValues: {
                inventoryItemId: input.inventoryItemId,
                type: input.type,
                quantity: input.quantity,
                unitCost: input.unitCost,
                totalCost: totalCost.toFixed(2),
              },
            });
          }

          const item = await tx.query.inventoryItems.findFirst({
            where: and(
              eq(inventoryItems.id, input.inventoryItemId),
              eq(inventoryItems.entityId, ctx.entityId!),
            ),
          });
          if (item) {
            const currentQty = item.quantityOnHand;
            let newQty = currentQty;
            if (input.type === "receipt" || input.type === "return") {
              newQty = currentQty + input.quantity;
            } else if (input.type === "issue" || input.type === "transfer") {
              newQty = currentQty - input.quantity;
            }
            await tx
              .update(inventoryItems)
              .set({ quantityOnHand: Math.max(newQty, 0) })
              .where(
                and(
                  eq(inventoryItems.id, input.inventoryItemId),
                  eq(inventoryItems.entityId, ctx.entityId!),
                ),
              );

            // Check for low stock alert
            const finalQty = Math.max(newQty, 0);
            if (item.reorderLevel !== null && finalQty < item.reorderLevel) {
              // Get warehouse name if available
              let warehouseName: string | undefined;
              if (input.warehouseId) {
                const warehouse = await tx.query.warehouses.findFirst({
                  where: and(
                    eq(warehouses.id, input.warehouseId),
                    eq(warehouses.entityId, ctx.entityId!),
                  ),
                });
                warehouseName = warehouse?.name ?? undefined;
              }

              // Send low stock alert (non-blocking)
              getEnrichedEntityContext(ctx.entityId!)
                .then((entityCtx) => {
                  sendInventoryAlertEmail(recipientEmail, {
                    itemName: item.name,
                    sku: item.sku,
                    currentQuantity: finalQty,
                    reorderLevel: item.reorderLevel ?? 0,
                    warehouseName,
                    entityName: entityCtx.entityName,
                  }).catch(console.error);
                })
                .catch(console.error);
            }
          }

          return txRecord;
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create inventory transaction",
        });
      }
    }),

  // ── Valuations ──
  listValuations: protectedProcedure
    .input(z.object({ itemId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.itemId) {
        return db.query.inventoryValuations.findMany({
          where: and(
            eq(inventoryValuations.entityId, ctx.entityId!),
            eq(inventoryValuations.inventoryItemId, input.itemId),
          ),
          orderBy: [desc(inventoryValuations.createdAt)],
        });
      }
      return db.query.inventoryValuations.findMany({
        where: eq(inventoryValuations.entityId, ctx.entityId!),
        orderBy: [desc(inventoryValuations.createdAt)],
      });
    }),

  deleteWarehouse: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const wh = await db.query.warehouses.findFirst({
          where: and(
            eq(warehouses.id, input.id),
            eq(warehouses.entityId, ctx.entityId!),
          ),
        });
        if (!wh)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Warehouse not found",
          });
        await db.delete(warehouses).where(eq(warehouses.id, input.id));
        await db
          .insert(auditLog)
          .values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "inventory.deleteWarehouse",
            entityType: "warehouse",
            entityIdRef: input.id,
            newValues: { name: wh.name },
          });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete warehouse",
        });
      }
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const item = await db.query.inventoryItems.findFirst({
          where: and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.entityId, ctx.entityId!),
          ),
        });
        if (!item)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Inventory item not found",
          });
        await db.delete(inventoryItems).where(eq(inventoryItems.id, input.id));
        await db
          .insert(auditLog)
          .values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "inventory.deleteItem",
            entityType: "inventory_item",
            entityIdRef: input.id,
            newValues: { name: item.name },
          });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete inventory item",
        });
      }
    }),

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tx = await db.query.inventoryTransactions.findFirst({
          where: and(
            eq(inventoryTransactions.id, input.id),
            eq(inventoryTransactions.entityId, ctx.entityId!),
          ),
        });
        if (!tx)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaction not found",
          });
        await db
          .delete(inventoryTransactions)
          .where(eq(inventoryTransactions.id, input.id));
        await db
          .insert(auditLog)
          .values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "inventory.deleteTransaction",
            entityType: "inventory_transaction",
            entityIdRef: input.id,
            newValues: { type: tx.type },
          });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete transaction",
        });
      }
    }),
});
