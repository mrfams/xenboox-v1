/**
 * Quick Invoice Seed — adds fresh AR invoices for manual QA
 * Covers Kerr Jula Trading Co. org (6 entities), uses existing customers + COA.
 * Idempotent via deterministic UUIDs + onConflictDoNothing.
 * Run: node --env-file=.env --import tsx packages/db/seed/seed-invoices-demo.ts
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { organizations, entities } from "../schema/organization";
import { chartOfAccounts } from "../schema/accounting";
import { customers, salesInvoices, salesInvoiceLines } from "../schema/ap-ar";

function eSeed(entityId: string, type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${entityId}-${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
function amt(entityId: string, base: number, idx: number, variance = 0.25): number {
  const h = crypto.createHash("sha256").update(`${entityId}-${idx}`).digest();
  const r = h.readUInt16BE(0) / 65535;
  const factor = 1 - variance / 2 + r * variance;
  return Math.round(base * factor);
}
function scaled(currency: string, gmdBase: number, entityId: string, idx: number): number {
  if (currency === "XOF") return amt(entityId, gmdBase * 8.5, idx);
  if (currency === "USD") return amt(entityId, Math.round(gmdBase / 70), idx);
  return amt(entityId, gmdBase, idx);
}
function d(y: number, m: number, day: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function main() {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.name, "Kerr Jula Trading Co.") });
  if (!org) throw new Error("Org not found");
  const ents = await db.query.entities.findMany({ where: eq(entities.organizationId, org.id) });
  console.log(`Seeding invoices for ${ents.length} entities under ${org.name}`);

  for (const ent of ents) {
    const coaRows = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.entityId, ent.id) });
    const coaByCode = new Map(coaRows.map((r) => [r.code, r.id]));
    // prefer revenue accounts
    const revenueAcct = coaByCode.get("4010") ?? coaByCode.get("4020") ?? coaRows.find((r) => r.type === "revenue")?.id ?? coaRows[0]?.id;
    if (!revenueAcct) {
      console.log(`  skip ${ent.name}: no COA`);
      continue;
    }
    const custs = await db.query.customers.findMany({ where: eq(customers.entityId, ent.id) });
    if (custs.length === 0) {
      console.log(`  skip ${ent.name}: no customers`);
      continue;
    }

    const statuses: Array<"pending" | "paid" | "overdue" | "partial"> = ["pending", "paid", "overdue", "partial"];
    let inserted = 0;
    for (let k = 0; k < 12; k++) {
      const id = eSeed(ent.id, `seed-invoices-quick-${k}`, 1);
      const status = statuses[k % 4]!;
      const baseAmt = [120000, 85000, 200000, 60000, 150000, 95000][k % 6]!;
      const total = scaled(ent.currency, baseAmt, ent.id, 500 + k);
      const balance = status === "paid" ? 0 : status === "partial" ? Math.round(total * 0.45) : total;
      const invDate = d(2026, 8 + Math.floor(k / 6), 3 + (k % 6) * 4); // Aug/Sep spread
      const dueDate = d(2026, 9, 10 + (k % 6) * 3);
      const num = `INV-QK-${ent.id.slice(0, 4).toUpperCase()}-${String(k + 1).padStart(2, "0")}`;

      // lines: split into 1-2 lines for realism
      const lines = k % 3 === 0 ? [
        { desc: "Consulting services", qty: "1", unitPrice: String(total), amount: String(total) },
      ] : [
        { desc: "Product A", qty: "2", unitPrice: String(Math.round(total * 0.6)), amount: String(Math.round(total * 0.6 * 2) > total ? total : Math.round(total * 0.6 * 2)) },
      ];
      // fix amount to sum correctly — if 1 line, amount=total; if 2 lines, compute second to match total
      let finalLines: typeof lines;
      if (lines.length === 1) finalLines = lines;
      else {
        const firstAmt = Math.round(total * 0.6);
        const secondAmt = total - firstAmt * 2; // but we set qty 2 for first, so adjust
        // simplify: 2 lines with qty 1 each
        finalLines = [
          { desc: "Product A", qty: "1", unitPrice: String(Math.round(total * 0.55)), amount: String(Math.round(total * 0.55)) },
          { desc: "Service B", qty: "1", unitPrice: String(total - Math.round(total * 0.55)), amount: String(total - Math.round(total * 0.55)) },
        ];
      }

      await db.insert(salesInvoices).values({
        id,
        entityId: ent.id,
        customerId: custs[k % custs.length]!.id,
        invoiceNumber: num,
        invoiceDate: invDate,
        dueDate,
        totalAmount: String(total),
        balance: String(balance),
        paidAmount: String(total - balance),
        currency: ent.currency,
        status: status as any,
        notes: `Seed invoice ${k + 1} for QA — ${status}`,
      }).onConflictDoNothing();
      // lines — only insert if invoice was new (check existence by trying, onConflictDoNothing on lines uses PK, so safe to attempt)
      for (let li = 0; li < finalLines.length; li++) {
        const l = finalLines[li]!;
        const lineId = eSeed(id, `line-${li}`, 1);
        await db.insert(salesInvoiceLines).values({
          id: lineId,
          salesInvoiceId: id,
          accountId: revenueAcct,
          description: l.desc,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          amount: l.amount,
        }).onConflictDoNothing();
      }
      inserted++;
    }
    console.log(`  ${ent.name} (${ent.currency}): ${inserted} invoices (INV-QK-*)`);
  }
  console.log("Done.");
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("seed-invoices-demo.ts")) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
export { main as seedInvoicesDemo };
