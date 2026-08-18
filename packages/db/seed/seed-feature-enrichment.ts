/**
 * Seed feature-specific enrichment for demo@xenboox.com (Kerr Jula Trading
 * Co., Gambia / GMD) so the newly shipped explore-catalog features surface
 * realistic, differentiated data:
 *
 *   1. vendor-profile   — supplier taxId / is1099 / payment-terms mix,
 *                         including one duplicate taxId pair (high finding)
 *   2. w9-collection    — suppliers.metadata.taxDoc: on-file, expired,
 *                         missing, and not-required states
 *   3. bill-approval    — purchase orders + PO-linked pending bills, a
 *                         duplicate-risk pair, and a small auto-approve bill
 *   4. vendor-payments  — open bills spanning overdue (pay_now), due-soon
 *                         (schedule), and later (hold) windows
 *
 * Idempotent: supplier updates are keyed by the deterministic seed id, new
 * bills/POs use onConflictDoNothing, and re-running is safe. Runs AFTER
 * seedSixMonths() in seed-all.ts so the 6-month history already exists.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import { organizations, entities } from "../schema/organization";
import {
  suppliers,
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
} from "../schema/ap-ar";
import { idFromKey } from "./seed-lib";

// ─── Deterministic helpers (mirror seed-six-months.ts) ─────────────────────
const A = (code: string) => idFromKey(`acct-${code}`);
const uuid = (type: string, n: number) => idFromKey(`${type}-${n}`);

/** Supplier ids: base seed used a1-1..3, six-months seed used a1-4..10. */
const SID = (n: number) => uuid("a1", n);

export async function seedFeatureEnrichment() {
  console.log(
    "Seeding feature enrichment (vendor profile / W-9 / PO / payments)...",
  );

  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "demo@xenboox.com"))
    .limit(1);
  const userId = user[0]?.id;
  if (!userId) {
    console.error("  ⚠ demo@xenboox.com not found — run seed() first");
    return;
  }
  const org = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.ownerId, userId))
    .limit(1);
  const orgId = org[0]?.id;
  if (!orgId) return;
  const ent = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        eq(entities.name, "Kerr Jula Trading Co."),
      ),
    )
    .limit(1);
  const entityId = ent[0]?.id;
  if (!entityId) {
    console.error("  ⚠ Kerr Jula Trading Co. entity not found");
    return;
  }

  // ── 1. Supplier enrichment (vendor-profile + w9-collection) ──────────────
  // Realistic mix: two on-file W-9s, one expired, a duplicate taxId pair
  // (Banjul Wholesale Market shares Global Supplies' id), and two vendors
  // with no taxId at all so both finding types stay visible.
  const enrich: Array<{
    id: string;
    taxId?: string;
    is1099?: boolean;
    taxDoc?: { receivedAt?: string; expiresAt?: string; requestedAt?: string };
  }> = [
    {
      id: SID(1),
      taxId: "GRA-TAX-10422",
      is1099: true,
      taxDoc: { receivedAt: "2026-01-10", expiresAt: "2027-01-10" },
    }, // Global Supplies Ltd. — on file
    { id: SID(2), taxId: "GRA-TAX-10422" }, // Banjul Wholesale Market — DUPLICATE taxId
    { id: SID(3), taxId: "SEN-TAX-77812", is1099: true }, // Senegal Import Co. — required, missing form
    {
      id: SID(4),
      taxId: "SEN-TAX-77901",
      is1099: true,
      taxDoc: { receivedAt: "2025-07-01", expiresAt: "2026-07-01" },
    }, // Touba — EXPIRED
    { id: SID(5) }, // AgriGambia Produce — no taxId
    { id: SID(6), taxId: "GRA-TAX-99003" }, // Standard Chartered — not 1099
    { id: SID(7), taxId: "GRA-TAX-99110" }, // Atlantic Fuels — not 1099
    {
      id: SID(8),
      taxId: "GRA-TAX-99111",
      is1099: true,
      taxDoc: { receivedAt: "2026-03-15", expiresAt: "2027-03-15" },
    }, // Banjul Cold Storage — on file
    { id: SID(9), taxId: "GRA-TAX-99112" }, // GAMTEL — not 1099
    { id: SID(10), is1099: true }, // West Coast Logistics — no taxId, 1099-eligible
  ];
  for (const v of enrich) {
    const meta: Record<string, unknown> = {};
    if (v.taxDoc) meta.taxDoc = v.taxDoc;
    const set: Record<string, unknown> = {
      ...(v.taxId ? { taxId: v.taxId } : {}),
      ...(v.is1099 !== undefined ? { is1099: v.is1099 } : {}),
      ...(Object.keys(meta).length ? { metadata: meta } : {}),
    };
    if (Object.keys(set).length === 0) continue; // nothing to enrich
    await db
      .update(suppliers)
      .set(set)
      .where(and(eq(suppliers.id, v.id), eq(suppliers.entityId, entityId)));
  }
  console.log("  Suppliers enriched (tax ids, 1099 flags, W-9 metadata)");

  // ── 2. Purchase orders (bill-approval + vendor-payments) ────────────────
  // NOTE: the base seed() already creates PO-2026-001..003, so this module
  // continues the sequence from PO-2026-004 to avoid the unique
  // (entity, po_number) constraint.
  const poData = [
    {
      po: "PO-2026-004",
      supplier: SID(1),
      desc: "Rice (50kg bag) — restock",
      qty: 50,
      unit: 6500,
      date: "2026-07-08",
    },
    {
      po: "PO-2026-005",
      supplier: SID(4),
      desc: "Sugar (10kg bag) — restock",
      qty: 80,
      unit: 1800,
      date: "2026-07-12",
    },
    {
      po: "PO-2026-006",
      supplier: SID(7),
      desc: "Bottled Water (case) — restock",
      qty: 100,
      unit: 480,
      date: "2026-08-03",
    },
    {
      po: "PO-2026-007",
      supplier: SID(8),
      desc: "Milk Powder (carton) — restock",
      qty: 12,
      unit: 12000,
      date: "2026-08-05",
    },
  ];
  for (const p of poData) {
    const poId = uuid("po", poData.indexOf(p) + 1);
    const total = p.qty * p.unit;
    await db
      .insert(purchaseOrders)
      .values({
        id: poId,
        entityId,
        supplierId: p.supplier,
        poNumber: p.po,
        orderDate: p.date,
        expectedDate: p.date.slice(0, 8) + "28",
        status: "approved",
        totalAmount: String(total),
        currency: "GMD",
        approvedBy: "demo@xenboox.com",
        approvedAt: new Date(`${p.date}T09:00:00Z`),
        notes: "Replenishment order — seeded for approval-routing demo",
      })
      .onConflictDoNothing();
    await db
      .insert(poLines)
      .values({
        id: uuid("pol", poData.indexOf(p) + 1),
        purchaseOrderId: poId,
        accountId: A("0004"),
        description: p.desc,
        quantity: String(p.qty),
        unitPrice: String(p.unit),
        amount: String(total),
      })
      .onConflictDoNothing();
  }

  // Link the July pending bills to their POs where the supplier matches
  // (INV-2026-037 = Atlantic Fuels water bill → PO-2026-006).
  await db
    .update(invoicesAp)
    .set({ purchaseOrderId: uuid("po", 3) })
    .where(
      and(
        eq(invoicesAp.entityId, entityId),
        eq(invoicesAp.invoiceNumber, "INV-2026-037"),
      ),
    );
  console.log("  Purchase orders created + July bills PO-linked");

  // ── 3. New open bills: duplicate-risk pair + auto-approve + later window ─
  const newBills = [
    {
      // Duplicate-risk: same supplier + same amount as INV-2026-035
      // (AgriGambia, 144,000) within 30 days → escalate.
      id: uuid("a3", 40),
      num: "INV-2026-040",
      supplier: SID(5),
      date: "2026-08-02",
      due: "2026-08-17",
      qty: 80,
      unit: 1800,
      desc: "Sugar (10kg bag) — second delivery",
    },
    {
      // Auto-approve candidate: small, PO-linked, under threshold.
      id: uuid("a3", 41),
      num: "INV-2026-041",
      supplier: SID(8),
      po: uuid("po", 4),
      date: "2026-08-06",
      due: "2026-08-26",
      qty: 100,
      unit: 480,
      desc: "Bottled Water (case) — delivery",
    },
    {
      // Hold window: high-value, PO-linked, due next month.
      id: uuid("a3", 42),
      num: "INV-2026-042",
      supplier: SID(4),
      po: uuid("po", 2),
      date: "2026-08-10",
      due: "2026-09-09",
      qty: 30,
      unit: 6500,
      desc: "Rice (50kg bag) — bulk order",
    },
    {
      // High-value without PO: needs review.
      id: uuid("a3", 43),
      num: "INV-2026-043",
      supplier: SID(3),
      date: "2026-08-12",
      due: "2026-09-01",
      qty: 20,
      unit: 9600,
      desc: "Tomato Paste (carton) — import",
    },
  ];
  for (const b of newBills) {
    const amount = b.qty * b.unit;
    await db
      .insert(invoicesAp)
      .values({
        id: b.id,
        entityId,
        supplierId: b.supplier,
        ...(b.po ? { purchaseOrderId: b.po } : {}),
        invoiceNumber: b.num,
        invoiceDate: b.date,
        dueDate: b.due,
        status: "pending",
        totalAmount: String(amount),
        paidAmount: "0",
        balance: String(amount),
        currency: "GMD",
        receivedDate: b.date,
        notes: b.desc,
      })
      .onConflictDoNothing();
    await db
      .insert(invoiceApLines)
      .values({
        id: uuid("apl", 100 + newBills.indexOf(b)),
        invoiceApId: b.id,
        accountId: A("0004"),
        description: b.desc,
        quantity: String(b.qty),
        unitPrice: String(b.unit),
        amount: String(amount),
      })
      .onConflictDoNothing();
  }
  console.log(
    `  Open bills added: +${newBills.length} (dup-risk, PO-linked, hold, high-value)`,
  );
}
