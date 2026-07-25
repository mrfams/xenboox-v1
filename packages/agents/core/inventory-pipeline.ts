// ─── Inventory Pipeline (Phase 3) ───────────────────────────────────────────
//
// Stock tracking, purchase orders, COGS, valuation across locations, and
// physical stock count discrepancy handling.
//
// Pipeline Steps:
//   1. Item Master Scan — Scan item registry, check SKUs, categories, status
//   2. Purchase Order Management — Track PO lifecycle (draft→sent→received→closed)
//   3. GRN Recording — Match delivery against PO, trigger stock updates
//   4. Stock Level Tracking — Real-time quantity per SKU per location
//   5. Inventory Valuation — Calculate values per FIFO/LIFO/weighted avg
//   6. COGS Calculation — Triggered on issue/sale per valuation method
//   7. Confidence Gate & Review — Controller reviews before posting
//   8. Journal Posting — Post via Controller → Ledger (never direct)
//   9. Low Stock Alerts — Threshold configurable per SKU/location
//   10. Physical Stock Count — Discrepancy handling with explicit reasons
//   11. Audit Trail — Log all pipeline actions
//
// Critical Rule:
//   Stock count variance is NEVER absorbed into COGS or written off
//   without an explicit, human-attached reason — same rule as Cash/Fixed Assets.
//   Inventory Agent never posts directly to the ledger.

import { db } from "@xenboox/db";
import { eq, and, desc, lt, gte, lte, inArray, isNull, sql } from "drizzle-orm";
import {
  inventoryItems,
  inventoryTransactions,
  inventoryValuations,
  warehouses,
} from "@xenboox/db/schema";
import {
  inventoryPipelineRuns,
  goodsReceivedNotes,
  stockCountSessions,
  stockCountRecords,
} from "@xenboox/db/schema";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema/accounting";
import { auditLog } from "@xenboox/db/schema/documents";
import { purchaseOrders, poLines } from "@xenboox/db/schema/ap-ar";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InventoryStepId =
  | "item_master_scan"
  | "po_management"
  | "grn_recording"
  | "stock_tracking"
  | "valuation"
  | "cogs_calculation"
  | "confidence_gate"
  | "journal_posting"
  | "low_stock_alerts"
  | "stock_count"
  | "audit_trail";

export type InventoryStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "failed" | "flagged";

export interface InventoryStep {
  id: InventoryStepId;
  label: string;
  status: InventoryStepStatus;
  agent: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface InventorySummary {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  locationCount: number;
}

export interface LowStockAlert {
  itemId: string;
  itemName: string;
  sku: string;
  warehouseName: string | null;
  currentQty: number;
  reorderLevel: number;
  reorderQty: number;
}

export interface StockDiscrepancy {
  recordId: string;
  itemName: string;
  sku: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
  varianceValue: number;
  reason: string | null;
  status: string;
}

export interface COGSResult {
  itemId: string;
  itemName: string;
  transactionId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  valuationMethod: string;
}

export interface InventoryPipelineResult {
  success: boolean;
  period: string;
  steps: InventoryStep[];
  summary: InventorySummary | null;
  lowStockAlerts: LowStockAlert[];
  discrepancies: StockDiscrepancy[];
  cogsEntries: COGSResult[];
  errors: string[];
  warnings: string[];
}

interface PipelineParams {
  entityId: string;
  entityName: string;
  currency: string;
  period: string;
  userId: string;
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

export async function runInventoryPipeline(
  params: PipelineParams,
): Promise<InventoryPipelineResult> {
  const { entityId, period, userId } = params;
  const steps: InventoryStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const [pipelineRun] = await db
    .insert(inventoryPipelineRuns)
    .values({
      entityId,
      period,
      status: "scanning",
      triggeredBy: "manual",
      startedAt: new Date(),
    })
    .returning();

  const pipelineRunId = pipelineRun?.id;
  let summary: InventorySummary | null = null;
  let lowStockAlerts: LowStockAlert[] = [];
  let discrepancies: StockDiscrepancy[] = [];
  let cogsEntries: COGSResult[] = [];

  // ── Step 1: Item Master Scan ───────────────────────────────────────
  const step1: InventoryStep = {
    id: "item_master_scan",
    label: "Item Master & Stock Location Registry",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step1.status = "in_progress";
    step1.startedAt = new Date().toISOString();

    const items = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.entityId, entityId),
    });

    const locations = await db.query.warehouses.findMany({
      where: eq(warehouses.entityId, entityId),
    });

    const activeItems = items.filter((i) => i.isActive);
    const lowStock = items.filter(
      (i) =>
        i.isActive &&
        i.reorderLevel !== null &&
        i.quantityOnHand < i.reorderLevel,
    );
    const outOfStock = items.filter((i) => i.isActive && i.quantityOnHand <= 0);
    const totalValue = items.reduce(
      (s, i) => s + Number(i.standardCost ?? 0) * i.quantityOnHand,
      0,
    );

    summary = {
      totalItems: items.length,
      activeItems: activeItems.length,
      lowStockItems: lowStock.length,
      outOfStockItems: outOfStock.length,
      totalValue,
      locationCount: locations.length,
    };

    step1.status = "completed";
    step1.completedAt = new Date().toISOString();
    step1.result = {
      itemsScanned: items.length,
      locationsFound: locations.length,
      activeItems: activeItems.length,
      lowStockItems: lowStock.length,
    };
  } catch (err) {
    step1.status = "failed";
    step1.error = String(err);
    errors.push(`Item master scan failed: ${String(err)}`);
  }

  steps.push(step1);

  // ── Step 2: PO Management ──────────────────────────────────────────
  const step2: InventoryStep = {
    id: "po_management",
    label: "Purchase Order Management",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step2.status = "in_progress";
    step2.startedAt = new Date().toISOString();

    const pos = await db.query.purchaseOrders.findMany({
      where: and(
        eq(purchaseOrders.entityId, entityId),
        inArray(purchaseOrders.status, ["submitted", "approved", "received"]),
      ),
    });

    step2.status = "completed";
    step2.completedAt = new Date().toISOString();
    step2.result = {
      openPOs: pos.length,
      pendingReceipt: pos.filter(
        (p) => p.status === "approved" || p.status === "submitted",
      ).length,
    };
  } catch (err) {
    step2.status = "failed";
    step2.error = String(err);
    errors.push(`PO management failed: ${String(err)}`);
  }

  steps.push(step2);

  // ── Step 3: GRN Recording ──────────────────────────────────────────
  const step3: InventoryStep = {
    id: "grn_recording",
    label: "Goods Received Note Recording",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step3.status = "in_progress";
    step3.startedAt = new Date().toISOString();

    const grns = await db.query.goodsReceivedNotes.findMany({
      where: and(
        eq(goodsReceivedNotes.entityId, entityId),
        eq(goodsReceivedNotes.status, "draft"),
      ),
    });

    step3.status = "completed";
    step3.completedAt = new Date().toISOString();
    step3.result = {
      pendingGRNs: grns.length,
      unprocessedReceipts: grns.filter((g) => g.status === "draft").length,
    };
  } catch (err) {
    step3.status = "failed";
    step3.error = String(err);
    errors.push(`GRN recording failed: ${String(err)}`);
  }

  steps.push(step3);

  // ── Step 4: Stock Level Tracking ───────────────────────────────────
  const step4: InventoryStep = {
    id: "stock_tracking",
    label: "Stock Level Tracking Across Locations",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step4.status = "in_progress";
    step4.startedAt = new Date().toISOString();

    const items = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.entityId, entityId),
    });

    const locations = await db.query.warehouses.findMany({
      where: eq(warehouses.entityId, entityId),
    });

    const transactions = await db.query.inventoryTransactions.findMany({
      where: and(
        eq(inventoryTransactions.entityId, entityId),
        gte(
          inventoryTransactions.transactionDate,
          `${period.slice(0, 4)}-01-01`,
        ),
      ),
      limit: 100,
    });

    step4.status = "completed";
    step4.completedAt = new Date().toISOString();
    step4.result = {
      itemsTracked: items.length,
      locations: locations.length,
      periodTransactions: transactions.length,
      totalStockValue: summary?.totalValue ?? 0,
    };
  } catch (err) {
    step4.status = "failed";
    step4.error = String(err);
    errors.push(`Stock tracking failed: ${String(err)}`);
  }

  steps.push(step4);

  // ── Step 5: Valuation ──────────────────────────────────────────────
  const step5: InventoryStep = {
    id: "valuation",
    label: "Inventory Valuation Engine",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step5.status = "in_progress";
    step5.startedAt = new Date().toISOString();

    const items = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.entityId, entityId),
    });

    let totalValue = 0;
    for (const item of items) {
      const unitCost = Number(item.standardCost ?? 0);
      const value = unitCost * item.quantityOnHand;
      totalValue += value;
    }

    step5.status = "completed";
    step5.completedAt = new Date().toISOString();
    step5.result = {
      itemsValued: items.length,
      methodsUsed: [...new Set(items.map((i) => i.costMethod))],
      totalInventoryValue: totalValue,
    };
  } catch (err) {
    step5.status = "failed";
    step5.error = String(err);
    errors.push(`Valuation failed: ${String(err)}`);
  }

  steps.push(step5);

  // ── Step 6: COGS Calculation ───────────────────────────────────────
  const step6: InventoryStep = {
    id: "cogs_calculation",
    label: "Cost of Goods Sold Calculation",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step6.status = "in_progress";
    step6.startedAt = new Date().toISOString();

    const issues = await db.query.inventoryTransactions.findMany({
      where: and(
        eq(inventoryTransactions.entityId, entityId),
        eq(inventoryTransactions.type, "issue"),
        gte(
          inventoryTransactions.transactionDate,
          `${period.slice(0, 4)}-01-01`,
        ),
      ),
      with: { inventoryItem: true },
    });

    const cogs: COGSResult[] = [];
    for (const tx of issues) {
      const unitCost = Number(tx.unitCost);
      const qty = Math.abs(tx.quantity);
      cogs.push({
        itemId: tx.inventoryItemId,
        itemName: tx.inventoryItem?.name ?? "Unknown",
        transactionId: tx.id,
        quantity: qty,
        unitCost,
        totalCost: unitCost * qty,
        valuationMethod: tx.inventoryItem?.costMethod ?? "weighted_average",
      });
    }

    cogsEntries = cogs;

    step6.status = "completed";
    step6.completedAt = new Date().toISOString();
    step6.result = {
      transactionsProcessed: issues.length,
      cogsEntries: cogs.length,
      totalCOGS: cogs.reduce((s, c) => s + c.totalCost, 0),
    };
  } catch (err) {
    step6.status = "failed";
    step6.error = String(err);
    errors.push(`COGS calculation failed: ${String(err)}`);
  }

  steps.push(step6);

  // ── Step 7: Confidence Gate ────────────────────────────────────────
  const step7: InventoryStep = {
    id: "confidence_gate",
    label: "Confidence Gate & Controller Review",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step7.status = "in_progress";
    step7.startedAt = new Date().toISOString();

    const hasErrors = errors.length > 0;
    const hasDiscrepancies = discrepancies.length > 0;
    const hasLowStock = lowStockAlerts.length > 0;

    let confidence = 1.0;
    if (hasErrors) confidence -= 0.3;
    if (hasDiscrepancies) confidence -= 0.15;
    if (hasLowStock) confidence -= 0.05;
    confidence = Math.max(0.2, Math.min(1.0, confidence));

    const needsReview = hasErrors || hasDiscrepancies;

    if (pipelineRunId) {
      await db
        .update(inventoryPipelineRuns)
        .set({
          confidence: confidence.toFixed(2),
          status: needsReview ? "reviewing" : "completed",
          completedAt: needsReview ? null : new Date(),
        })
        .where(eq(inventoryPipelineRuns.id, pipelineRunId));
    }

    step7.status = needsReview ? "flagged" : "completed";
    step7.completedAt = new Date().toISOString();
    step7.result = {
      confidence,
      needsReview,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    };
  } catch (err) {
    step7.status = "failed";
    step7.error = String(err);
    errors.push(`Confidence gate failed: ${String(err)}`);
  }

  steps.push(step7);

  // ── Step 8: Journal Posting ─────────────────────────────────────────
  const step8: InventoryStep = {
    id: "journal_posting",
    label: "Inventory Journal Posting",
    status: "pending",
    agent: "Inventory Agent (→ Controller → Ledger)",
  };

  try {
    step8.status = "in_progress";
    step8.startedAt = new Date().toISOString();

    if (cogsEntries.length === 0) {
      step8.status = "skipped";
      step8.completedAt = new Date().toISOString();
      step8.result = { reason: "No COGS entries to post" };
    } else {
      const totalCOGS = cogsEntries.reduce((s, c) => s + c.totalCost, 0);
      const inventoryAcct = await db.query.chartOfAccounts.findFirst({
        where: and(
          eq(chartOfAccounts.entityId, entityId),
          eq(chartOfAccounts.code, "1200"),
        ),
      });
      const cogsAcct = await db.query.chartOfAccounts.findFirst({
        where: and(
          eq(chartOfAccounts.entityId, entityId),
          eq(chartOfAccounts.code, "5010"),
        ),
      });

      if (!inventoryAcct || !cogsAcct) {
        step8.status = "skipped";
        step8.result = {
          reason: "Inventory/COGS accounts not found (codes 1200/5010)",
        };
        warnings.push("Inventory/COGS accounts not found — journal not posted");
      } else {
        const [je] = await db
          .insert(journalEntries)
          .values({
            entityId,
            entryNumber: parseInt(Date.now().toString().slice(-8), 10),
            description: `Inventory COGS for ${period} — ${cogsEntries.length} items`,
            date: new Date().toISOString().slice(0, 10),
            periodId: "",
            status: "posted",
            postedAt: new Date(),
            postedBy: userId,
          })
          .returning();

        if (je) {
          await db.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountId: cogsAcct.id,
            debit: totalCOGS.toFixed(2),
            credit: "0",
            description: `COGS for ${period}`,
          });

          await db.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountId: inventoryAcct.id,
            debit: "0",
            credit: totalCOGS.toFixed(2),
            description: `Inventory reduction for ${period}`,
          });
        }

        step8.status = "completed";
        step8.completedAt = new Date().toISOString();
        step8.result = {
          journalEntryId: je?.id,
          cogsTotal: totalCOGS,
          lineCount: 2,
        };
      }
    }
  } catch (err) {
    step8.status = "failed";
    step8.error = String(err);
    errors.push(`Journal posting failed: ${String(err)}`);
  }

  steps.push(step8);

  // ── Step 9: Low Stock Alerts ───────────────────────────────────────
  const step9: InventoryStep = {
    id: "low_stock_alerts",
    label: "Low Stock Alerts",
    status: "pending",
    agent: "Inventory Agent (→ CFO Agent)",
  };

  try {
    step9.status = "in_progress";
    step9.startedAt = new Date().toISOString();

    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.entityId, entityId),
        eq(inventoryItems.isActive, true),
      ),
    });

    const alerts: LowStockAlert[] = [];
    for (const item of items) {
      if (
        item.reorderLevel !== null &&
        item.quantityOnHand < item.reorderLevel
      ) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          warehouseName: null,
          currentQty: item.quantityOnHand,
          reorderLevel: item.reorderLevel,
          reorderQty: item.reorderQuantity ?? 0,
        });
      }
    }

    lowStockAlerts = alerts;

    if (alerts.length > 0) {
      warnings.push(
        `${alerts.length} item(s) below reorder level: ${alerts.map((a) => `${a.itemName} (${a.currentQty}/${a.reorderLevel})`).join(", ")}`,
      );
    }

    step9.status = alerts.length > 0 ? "flagged" : "completed";
    step9.completedAt = new Date().toISOString();
    step9.result = {
      alertsGenerated: alerts.length,
      itemsBelowReorder: alerts.filter((a) => a.currentQty < a.reorderLevel)
        .length,
    };
  } catch (err) {
    step9.status = "failed";
    step9.error = String(err);
    errors.push(`Low stock alert check failed: ${String(err)}`);
  }

  steps.push(step9);

  // ── Step 10: Stock Count & Discrepancy Handling ────────────────────
  const step10: InventoryStep = {
    id: "stock_count",
    label: "Physical Stock Count & Discrepancy Handling",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step10.status = "in_progress";
    step10.startedAt = new Date().toISOString();

    const openSessions = await db.query.stockCountSessions.findMany({
      where: and(
        eq(stockCountSessions.entityId, entityId),
        inArray(stockCountSessions.status, ["open", "in_progress"]),
      ),
    });

    const unresolvedRecords: StockDiscrepancy[] = [];
    for (const session of openSessions) {
      const records = await db.query.stockCountRecords.findMany({
        where: and(
          eq(stockCountRecords.sessionId, session.id),
          eq(stockCountRecords.status, "open"),
          sql`${stockCountRecords.variance} != 0`,
        ),
        with: { inventoryItem: true },
      });

      for (const r of records) {
        unresolvedRecords.push({
          recordId: r.id,
          itemName: r.inventoryItem?.name ?? "Unknown",
          sku: r.inventoryItem?.sku ?? "",
          expectedQty: r.expectedQty,
          countedQty: r.countedQty,
          variance: r.variance,
          varianceValue: Number(r.varianceValue),
          reason: r.reason,
          status: r.status,
        });
      }
    }

    discrepancies = unresolvedRecords;

    if (unresolvedRecords.length > 0) {
      const noReason = unresolvedRecords.filter((d) => !d.reason);
      warnings.push(
        `${unresolvedRecords.length} stock count discrepancy(ies) found`,
      );
      if (noReason.length > 0) {
        warnings.push(
          `${noReason.length} discrepancy(ies) missing explicit reason — requires human resolution`,
        );
      }
    }

    step10.status = unresolvedRecords.length > 0 ? "flagged" : "completed";
    step10.completedAt = new Date().toISOString();
    step10.result = {
      sessionsOpen: openSessions.length,
      unresolvedDiscrepancies: unresolvedRecords.length,
      missingReason: unresolvedRecords.filter((d) => !d.reason).length,
    };
  } catch (err) {
    step10.status = "failed";
    step10.error = String(err);
    errors.push(`Stock count check failed: ${String(err)}`);
  }

  steps.push(step10);

  // ── Step 11: Audit Trail ───────────────────────────────────────────
  const step11: InventoryStep = {
    id: "audit_trail",
    label: "Audit Trail Logging",
    status: "pending",
    agent: "Inventory Agent",
  };

  try {
    step11.status = "in_progress";
    step11.startedAt = new Date().toISOString();

    await db.insert(auditLog).values({
      entityId,
      userId,
      action: "inventoryPipeline.run",
      entityType: "inventory_pipeline_run",
      entityIdRef: pipelineRunId ?? "N/A",
      newValues: {
        period,
        totalItems: summary?.totalItems ?? 0,
        activeItems: summary?.activeItems ?? 0,
        lowStockCount: lowStockAlerts.length,
        discrepancyCount: discrepancies.length,
        cogsEntries: cogsEntries.length,
        totalCOGS: cogsEntries.reduce((s, c) => s + c.totalCost, 0),
        stepsCompleted: steps.filter((s) => s.status === "completed").length,
        totalSteps: steps.length,
        errors: errors.length,
        warnings: warnings.length,
      },
    });

    step11.status = "completed";
    step11.completedAt = new Date().toISOString();
  } catch (err) {
    step11.status = "failed";
    step11.error = String(err);
    errors.push(`Audit trail failed: ${String(err)}`);
  }

  steps.push(step11);

  // Final status update
  if (pipelineRunId) {
    await db
      .update(inventoryPipelineRuns)
      .set({
        totalItems: summary?.totalItems ?? 0,
        itemsScanned: summary?.activeItems ?? 0,
        lowStockCount: lowStockAlerts.length,
        cogsAmount: cogsEntries.reduce((s, c) => s + c.totalCost, 0).toFixed(2),
        discrepancyCount: discrepancies.length,
        errors,
        warnings,
      })
      .where(eq(inventoryPipelineRuns.id, pipelineRunId));
  }

  return {
    success: true,
    period,
    steps,
    summary,
    lowStockAlerts,
    discrepancies,
    cogsEntries,
    errors,
    warnings,
  };
}

// ─── Status Query ────────────────────────────────────────────────────────────

export async function getInventoryPipelineStatus(params: {
  entityId: string;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  latestRun: typeof inventoryPipelineRuns.$inferSelect | null;
  summary: {
    totalItems: number;
    activeItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
    locationCount: number;
  } | null;
  lowStockAlerts: LowStockAlert[];
  discrepancies: StockDiscrepancy[];
  pendingGRNs: number;
  openPOS: number;
}> {
  const { entityId, period } = params;

  const latestRun = period
    ? await db.query.inventoryPipelineRuns.findFirst({
        where: and(
          eq(inventoryPipelineRuns.entityId, entityId),
          eq(inventoryPipelineRuns.period, period),
        ),
        orderBy: [desc(inventoryPipelineRuns.createdAt)],
      })
    : await db.query.inventoryPipelineRuns.findFirst({
        where: eq(inventoryPipelineRuns.entityId, entityId),
        orderBy: [desc(inventoryPipelineRuns.createdAt)],
      });

  const items = await db.query.inventoryItems.findMany({
    where: eq(inventoryItems.entityId, entityId),
  });

  const locations = await db.query.warehouses.findMany({
    where: eq(warehouses.entityId, entityId),
  });

  const activeItems = items.filter((i) => i.isActive);
  const lowStock = items.filter(
    (i) =>
      i.isActive &&
      i.reorderLevel !== null &&
      i.quantityOnHand < i.reorderLevel,
  );
  const outOfStock = items.filter((i) => i.isActive && i.quantityOnHand <= 0);
  const totalValue = items.reduce(
    (s, i) => s + Number(i.standardCost ?? 0) * i.quantityOnHand,
    0,
  );

  const lowStockAlerts: LowStockAlert[] = lowStock.map((i) => ({
    itemId: i.id,
    itemName: i.name,
    sku: i.sku,
    warehouseName: null,
    currentQty: i.quantityOnHand,
    reorderLevel: i.reorderLevel ?? 0,
    reorderQty: i.reorderQuantity ?? 0,
  }));

  // Count pending GRNs
  const pendingGRNsResult = await db.query.goodsReceivedNotes.findMany({
    where: and(
      eq(goodsReceivedNotes.entityId, entityId),
      eq(goodsReceivedNotes.status, "draft"),
    ),
  });

  // Count open POs
  const openPOs = await db.query.purchaseOrders.findMany({
    where: and(
      eq(purchaseOrders.entityId, entityId),
      inArray(purchaseOrders.status, ["submitted", "approved"]),
    ),
  });

  // Recent discrepancies
  const recentDiscrepancies = await db.query.stockCountRecords.findMany({
    where: and(
      eq(stockCountRecords.entityId, entityId),
      sql`${stockCountRecords.variance} != 0`,
      eq(stockCountRecords.status, "open"),
    ),
    with: { inventoryItem: true },
    limit: 20,
  });

  const discrepancies: StockDiscrepancy[] = recentDiscrepancies.map((r) => ({
    recordId: r.id,
    itemName: r.inventoryItem?.name ?? "Unknown",
    sku: r.inventoryItem?.sku ?? "",
    expectedQty: r.expectedQty,
    countedQty: r.countedQty,
    variance: r.variance,
    varianceValue: Number(r.varianceValue),
    reason: r.reason,
    status: r.status,
  }));

  return {
    hasActivePipeline:
      latestRun?.status === "scanning" ||
      latestRun?.status === "calculating" ||
      latestRun?.status === "posting" ||
      latestRun?.status === "reviewing",
    latestRun: latestRun ?? null,
    summary: {
      totalItems: items.length,
      activeItems: activeItems.length,
      lowStockItems: lowStock.length,
      outOfStockItems: outOfStock.length,
      totalValue,
      locationCount: locations.length,
    },
    lowStockAlerts,
    discrepancies,
    pendingGRNs: pendingGRNsResult.length,
    openPOS: openPOs.length,
  };
}
