/**
 * Inventory Pipeline Seed Data
 *
 * Test data for the Inventory Pipeline development.
 * Creates pipeline run history, goods received notes, stock count sessions
 * with discrepancies (requiring explicit reasons), and stock count records.
 *
 * Run: pnpm db:seed (or call seedInventory() from the main seed file)
 *
 * Uses same patterns as budget/fixed-assets seeds:
 *   - deterministic UUIDs via seedUuid()
 *   - onConflictDoNothing() for idempotent re-runs
 *   - entity-scoped to the demo entity
 */

import crypto from "node:crypto";
import { db } from "../index";
import {
  inventoryPipelineRuns,
  goodsReceivedNotes,
  stockCountSessions,
  stockCountRecords,
} from "../schema/inventory-pipeline";
import { inventoryItems, warehouses } from "../schema/inventory";
import { purchaseOrders } from "../schema/ap-ar";
import { eq } from "drizzle-orm";

// ─── Deterministic UUID helper ──────────────────────────────────────────
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// ─── Pipeline Run Definitions ───────────────────────────────────────────
interface PipelineRunDef {
  period: string;
  status: string;
  totalItems: number;
  itemsScanned: number;
  lowStockCount: number;
  cogsAmount: string;
  discrepancyCount: number;
  confidence: string;
  triggeredBy: string;
  errors: string[];
  warnings: string[];
}

const PIPELINE_RUNS: PipelineRunDef[] = [
  {
    period: "2026-05",
    status: "completed",
    totalItems: 5,
    itemsScanned: 5,
    lowStockCount: 1,
    cogsAmount: "376000",
    discrepancyCount: 0,
    confidence: "0.95",
    triggeredBy: "scheduled",
    errors: [],
    warnings: ["Oil-5L low stock: 80 remaining, reorder at 24"],
  },
  {
    period: "2026-06",
    status: "completed",
    totalItems: 5,
    itemsScanned: 5,
    lowStockCount: 2,
    cogsAmount: "423000",
    discrepancyCount: 1,
    confidence: "0.82",
    triggeredBy: "manual",
    errors: [],
    warnings: [
      "Oil-5L low stock: 65 remaining, reorder at 24",
      "Onion-10KG low stock: 45 remaining, reorder at 18",
      "1 stock count discrepancy found",
    ],
  },
  {
    period: "2026-07",
    status: "reviewing",
    totalItems: 5,
    itemsScanned: 5,
    lowStockCount: 3,
    cogsAmount: "58000",
    discrepancyCount: 2,
    confidence: "0.65",
    triggeredBy: "manual",
    errors: [],
    warnings: [
      "2 stock count discrepancies found",
      "1 discrepancy missing explicit reason",
      "Oil-5L low stock: 42 remaining",
      "Onion-10KG low stock: 30 remaining",
      "Rice-25KG low stock: 112 remaining, reorder at 45",
    ],
  },
];

// ─── Goods Received Note Definitions ────────────────────────────────────
interface GRNDef {
  poRef: string;
  receivedDate: string;
  status: string;
  conditionNotes: string | null;
  carrierInfo: string | null;
  items: Array<{
    sku: string;
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    condition: string;
  }>;
}

const GRNS: GRNDef[] = [
  {
    poRef: "PO-2026-002",
    receivedDate: "2026-06-15",
    status: "completed",
    conditionNotes: "All items in good condition. Packaging intact.",
    carrierInfo: "Gambia Ferry Services - Waybill GF-2026-442",
    items: [
      {
        sku: "RICE-25KG",
        itemName: "Rice (25kg bag)",
        orderedQty: 50,
        receivedQty: 50,
        condition: "good",
      },
      {
        sku: "OIL-5L",
        itemName: "Cooking Oil (5L)",
        orderedQty: 30,
        receivedQty: 28,
        condition: "good",
      },
    ],
  },
  {
    poRef: "PO-2026-001",
    receivedDate: "2026-06-20",
    status: "completed",
    conditionNotes: "Partial delivery received. 20 bags of sugar missing.",
    carrierInfo: "Brikama Transport - BT-2026-891",
    items: [
      {
        sku: "SUGAR-10KG",
        itemName: "Sugar (10kg bag)",
        orderedQty: 60,
        receivedQty: 40,
        condition: "good",
      },
    ],
  },
  {
    poRef: "PO-2026-003",
    receivedDate: "2026-07-05",
    status: "draft",
    conditionNotes: null,
    carrierInfo: null,
    items: [
      {
        sku: "RICE-25KG",
        itemName: "Rice (25kg bag)",
        orderedQty: 100,
        receivedQty: 100,
        condition: "pending_inspection",
      },
      {
        sku: "SOAP-CTN",
        itemName: "Soap (carton)",
        orderedQty: 20,
        receivedQty: 18,
        condition: "pending_inspection",
      },
    ],
  },
];

// ─── Stock Count Session Definitions ────────────────────────────────────
interface SessionDef {
  warehouseRef: string;
  sessionDate: string;
  status: string;
  notes: string | null;
}

const SESSIONS: SessionDef[] = [
  {
    warehouseRef: "Main Warehouse",
    sessionDate: "2026-06-30",
    status: "resolved",
    notes: "Monthly stock count — all items verified",
  },
  {
    warehouseRef: "Main Warehouse",
    sessionDate: "2026-07-14",
    status: "in_progress",
    notes: "Mid-month spot check — discrepancies found",
  },
];

// ─── Stock Count Record / Discrepancy Definitions ───────────────────────
interface CountRecordDef {
  sessionIdx: number;
  itemSku: string;
  warehouseRef: string;
  expectedQty: number;
  countedQty: number;
  reason: string | null;
  status: string;
  notes: string | null;
}

const COUNT_RECORDS: CountRecordDef[] = [
  {
    sessionIdx: 0,
    itemSku: "RICE-25KG",
    warehouseRef: "Main Warehouse",
    expectedQty: 150,
    countedQty: 148,
    reason:
      "Two bags found damaged during count — written off per Ousman's approval",
    status: "resolved",
    notes: "Damaged bags disposed of. Residual value zero.",
  },
  {
    sessionIdx: 0,
    itemSku: "OIL-5L",
    warehouseRef: "Main Warehouse",
    expectedQty: 80,
    countedQty: 80,
    reason: null,
    status: "resolved",
    notes: null,
  },
  {
    sessionIdx: 0,
    itemSku: "SUGAR-10KG",
    warehouseRef: "Main Warehouse",
    expectedQty: 200,
    countedQty: 196,
    reason:
      "Four bags short — recorded as shrinkage awaiting manager confirmation",
    status: "resolved",
    notes:
      "Shrinkage within acceptable threshold (2%). Warehouse manager notified.",
  },
  {
    sessionIdx: 0,
    itemSku: "ONION-10KG",
    warehouseRef: "Main Warehouse",
    expectedQty: 60,
    countedQty: 60,
    reason: null,
    status: "resolved",
    notes: null,
  },
  {
    sessionIdx: 0,
    itemSku: "SOAP-CTN",
    warehouseRef: "Main Warehouse",
    expectedQty: 40,
    countedQty: 40,
    reason: null,
    status: "resolved",
    notes: null,
  },
  // ── Mid-month spot check — unresolved discrepancies ──────────────
  {
    sessionIdx: 1,
    itemSku: "RICE-25KG",
    warehouseRef: "Main Warehouse",
    expectedQty: 148,
    countedQty: 135,
    reason: null,
    status: "open",
    notes:
      "13 bags short — investigation in progress. Potential theft or miscount.",
  },
  {
    sessionIdx: 1,
    itemSku: "OIL-5L",
    warehouseRef: "Main Warehouse",
    expectedQty: 65,
    countedQty: 58,
    reason: null,
    status: "open",
    notes:
      "7 bottles missing — no reason recorded yet. Requires human resolution.",
  },
  {
    sessionIdx: 1,
    itemSku: "SUGAR-10KG",
    warehouseRef: "Main Warehouse",
    expectedQty: 196,
    countedQty: 192,
    reason:
      "4 bags reported as damaged in transport — awaiting write-off approval from Finance Director",
    status: "investigating",
    notes: "Damage report filed on 2026-07-12. Awaiting signature.",
  },
];

// ─── Main Seed Function ──────────────────────────────────────────────────

export async function seedInventory(entityId: string): Promise<void> {
  console.log("Seeding inventory pipeline test data...");

  // Resolve actual IDs from the seeded data (assumes main seed has been run)
  const [warehouseRow] = await db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.entityId, entityId))
    .limit(10);

  const itemRows = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.entityId, entityId))
    .limit(10);

  const poRows = await db
    .select({ id: purchaseOrders.id, poNumber: purchaseOrders.poNumber })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.entityId, entityId))
    .limit(10);

  // Build lookup maps
  const whMap = new Map<string, string>();
  whMap.set(
    warehouseRow?.name ?? "Main Warehouse",
    warehouseRow?.id ?? seedUuid("wh", 1),
  );
  if (!warehouseRow) {
    // If no warehouses exist, use a deterministic fallback
    whMap.set("Main Warehouse", seedUuid("wh", 1));
    whMap.set("Brikama Store", seedUuid("wh", 2));
  }

  const itemBySku = new Map<string, { id: string; name: string }>();
  for (const row of itemRows) {
    itemBySku.set(row.sku, { id: row.id, name: row.name });
  }
  // Fallback deterministic IDs for items that may not exist
  const FALLBACK_SKUS: Record<string, { id: string; name: string }> = {
    "RICE-25KG": { id: seedUuid("a8", 1), name: "Rice (25kg bag)" },
    "OIL-5L": { id: seedUuid("a8", 2), name: "Cooking Oil (5L)" },
    "SUGAR-10KG": { id: seedUuid("a8", 3), name: "Sugar (10kg bag)" },
    "ONION-10KG": { id: seedUuid("a8", 4), name: "Onions (10kg)" },
    "SOAP-CTN": { id: seedUuid("a8", 5), name: "Soap (carton)" },
  };

  const poByRef = new Map<string, string>();
  for (const row of poRows) {
    poByRef.set(row.poNumber, row.id);
  }

  const getItemId = (sku: string) =>
    itemBySku.get(sku)?.id ?? FALLBACK_SKUS[sku]?.id ?? seedUuid("inv-item", 1);
  const getItemName = (sku: string) =>
    itemBySku.get(sku)?.name ?? FALLBACK_SKUS[sku]?.name ?? "Unknown Item";
  const getWarehouseId = (name: string) =>
    whMap.get(name) ?? whMap.get("Main Warehouse") ?? seedUuid("wh", 1);
  const getPoId = (ref: string) => poByRef.get(ref) ?? seedUuid("po", 1);

  // ── 1. Pipeline Runs ─────────────────────────────────────────────────
  console.log(`  Creating ${PIPELINE_RUNS.length} pipeline runs...`);

  for (let i = 0; i < PIPELINE_RUNS.length; i++) {
    const r = PIPELINE_RUNS[i];
    await db
      .insert(inventoryPipelineRuns)
      .values({
        id: seedUuid("inv-pipeline-run", i + 1),
        entityId,
        period: r.period,
        status: r.status,
        totalItems: r.totalItems,
        itemsScanned: r.itemsScanned,
        lowStockCount: r.lowStockCount,
        cogsAmount: r.cogsAmount,
        discrepancyCount: r.discrepancyCount,
        confidence: r.confidence,
        triggeredBy: r.triggeredBy,
        errors: r.errors,
        warnings: r.warnings,
        startedAt: new Date(
          `${r.period.slice(0, 4)}-${r.period.slice(5)}-01T08:00:00Z`,
        ),
        completedAt:
          r.status === "reviewing"
            ? null
            : new Date(
                `${r.period.slice(0, 4)}-${r.period.slice(5)}-15T16:00:00Z`,
              ),
      })
      .onConflictDoNothing();
  }

  // ── 2. Goods Received Notes ─────────────────────────────────────────
  console.log(`  Creating ${GRNS.length} goods received notes...`);

  for (let i = 0; i < GRNS.length; i++) {
    const g = GRNS[i];
    await db
      .insert(goodsReceivedNotes)
      .values({
        id: seedUuid("inv-grn", i + 1),
        entityId,
        poId: getPoId(g.poRef),
        receivedDate: g.receivedDate,
        status: g.status,
        conditionNotes: g.conditionNotes,
        carrierInfo: g.carrierInfo,
        lineItems: g.items.map((item) => ({
          inventoryItemId: getItemId(item.sku),
          sku: item.sku,
          itemName: item.itemName,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          condition: item.condition,
          unitCost: "0",
        })),
        receivedById: "demo@xenboox.com",
        verifiedById: g.status === "completed" ? "demo@xenboox.com" : null,
        verifiedAt: g.status === "completed" ? new Date(g.receivedDate) : null,
      })
      .onConflictDoNothing();
  }

  // ── 3. Stock Count Sessions ─────────────────────────────────────────
  console.log(`  Creating ${SESSIONS.length} stock count sessions...`);

  for (let i = 0; i < SESSIONS.length; i++) {
    const s = SESSIONS[i];
    await db
      .insert(stockCountSessions)
      .values({
        id: seedUuid("inv-session", i + 1),
        entityId,
        warehouseId: getWarehouseId(s.warehouseRef),
        sessionDate: s.sessionDate,
        status: s.status,
        initiatedById: "demo@xenboox.com",
        completedById: s.status === "resolved" ? "demo@xenboox.com" : null,
        completedAt:
          s.status === "resolved"
            ? new Date(`${s.sessionDate}T17:00:00Z`)
            : null,
        notes: s.notes,
      })
      .onConflictDoNothing();
  }

  // ── 4. Stock Count Records (Discrepancies) ─────────────────────────
  console.log(`  Creating ${COUNT_RECORDS.length} stock count records...`);

  for (let i = 0; i < COUNT_RECORDS.length; i++) {
    const r = COUNT_RECORDS[i];
    const itemId = getItemId(r.itemSku);
    const warehouseId = getWarehouseId(r.warehouseRef);
    const sessionId = seedUuid("inv-session", r.sessionIdx + 1);
    const variance = r.countedQty - r.expectedQty;
    const unitCost = 0; // We'll use 0 since we don't know actual unit cost here

    await db
      .insert(stockCountRecords)
      .values({
        id: seedUuid("inv-count-record", i + 1),
        entityId,
        sessionId,
        inventoryItemId: itemId,
        warehouseId,
        expectedQty: r.expectedQty,
        countedQty: r.countedQty,
        variance,
        varianceValue: (variance * unitCost).toFixed(2),
        reason: r.reason,
        status: r.status,
        resolvedById: r.status === "resolved" ? "demo@xenboox.com" : null,
        resolvedAt:
          r.status === "resolved" ? new Date("2026-07-01T10:00:00Z") : null,
        notes: r.notes,
      })
      .onConflictDoNothing();
  }

  console.log("  ✅ Inventory pipeline seed complete!");
  console.log(
    `    ${PIPELINE_RUNS.length} pipeline runs · ${GRNS.length} GRNs · ${SESSIONS.length} sessions · ${COUNT_RECORDS.length} count records`,
  );
}
