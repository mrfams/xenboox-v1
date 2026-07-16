import { db } from "@xenboox/db"
import { eq, and, sql } from "drizzle-orm"
import { chartOfAccounts } from "@xenboox/db/schema/accounting"
import { inventoryItems, inventoryTransactions, inventoryValuations } from "@xenboox/db/schema/inventory"
import type { InventoryAccount, CogsResult, InventorySummary } from "./state"

// ─── Calculate COGS ────────────────────────────────────────────────────────

export async function calculateCogs(entityId: string): Promise<CogsResult> {
  const items = await db.query.inventoryItems.findMany({
    where: eq(inventoryItems.entityId, entityId),
  })

  const inventoryAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.subtype, "inventory"),
    ),
  })

  const cogsAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.subtype, "cost_of_goods_sold"),
    ),
  })

  const mappedInventory: InventoryAccount[] = inventoryAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    code: a.code,
    subtype: "inventory",
    balance: 0,
  }))

  const mappedCogs: InventoryAccount[] = cogsAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    code: a.code,
    subtype: "cost_of_goods_sold",
    balance: 0,
  }))

  const totalInventoryValue = items.reduce((sum, item) => {
    return sum + item.quantityOnHand * Number(item.standardCost)
  }, 0)

  return {
    inventoryAccounts: mappedInventory,
    cogsAccounts: mappedCogs,
    totalInventoryValue,
    totalCogs: mappedCogs.reduce((sum, a) => sum + a.balance, 0),
  }
}

// ─── Get Inventory Summary ──────────────────────────────────────────────────

export async function getInventorySummary(entityId: string): Promise<InventorySummary> {
  const items = await db.query.inventoryItems.findMany({
    where: eq(inventoryItems.entityId, entityId),
  })

  const activeItems = items.filter((item) => item.isActive)

  const totalValue = items.reduce((sum, item) => {
    return sum + item.quantityOnHand * Number(item.standardCost)
  }, 0)

  return {
    totalValue,
    itemCount: activeItems.length,
    adjustments: items.length - activeItems.length,
  }
}

// ─── Get Inventory Items ────────────────────────────────────────────────────

export async function getInventoryItems(entityId: string) {
  return db.query.inventoryItems.findMany({
    where: eq(inventoryItems.entityId, entityId),
  })
}

// ─── Get Stock Transactions ────────────────────────────────────────────────

export async function getStockTransactions(entityId: string, itemId?: string) {
  if (itemId) {
    return db.query.inventoryTransactions.findMany({
      where: and(
        eq(inventoryTransactions.entityId, entityId),
        eq(inventoryTransactions.inventoryItemId, itemId),
      ),
    })
  }
  return db.query.inventoryTransactions.findMany({
    where: eq(inventoryTransactions.entityId, entityId),
  })
}
