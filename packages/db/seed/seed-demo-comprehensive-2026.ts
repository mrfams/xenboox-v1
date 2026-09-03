/**
 * Comprehensive Demo Seed — Jan 1 → Sep 3 2026
 * For demo@xenboox.com / Kerr Jula Trading Co. (6 existing entities)
 *
 * Discovers live entities under org 'Kerr Jula Trading Co.' and fills
 * Jan-Sep with realistic, varied data per entity. Plaid for Brooklyn Goods LLC (US),
 * bank-statement PDF for the 5 GM/SN entities. Every pipeline covered.
 *
 * Idempotent — deterministic UUIDs + onConflictDoNothing. Re-runnable.
 * Run: node --env-file=.env.local --import tsx packages/db/seed/seed-demo-comprehensive-2026.ts
 */

import crypto from "node:crypto";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../index";
import { organizations, entities } from "../schema/organization";
import { users } from "../schema/auth";
import {
  chartOfAccounts,
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
} from "../schema/accounting";
import {
  suppliers,
  customers,
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
  salesInvoices,
  salesInvoiceLines,
  paymentsAp,
  paymentsAr,
} from "../schema/ap-ar";
import {
  employees,
  employeeContracts,
  payrollRuns,
  payrollLineItems,
  payslips,
  staffLoans,
} from "../schema/payroll";
import { fixedAssets } from "../schema/fixed-assets";
import {
  warehouses,
  inventoryItems,
  inventoryTransactions,
} from "../schema/inventory";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
} from "../schema/treasury";
import { bankConnections } from "../schema/integrations";
import { cashAccounts, imprestFloats, imprestReceipts } from "../schema/cash";
import {
  mobileMoneyAccounts,
  mobileMoneyTransactions,
} from "../schema/mobile-money";
import { documents } from "../schema/documents";
import { budgets, budgetLines } from "../schema/budget";

// ─── Helpers ────────────────────────────────────────────────────────────────

function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function eSeed(entityId: string, type: string, n: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${entityId}-${type}-${n}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function d(y: number, m: number, day: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDay(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

// Deterministic amount jitter per entity+month+index
function amt(
  entityId: string,
  base: number,
  month: number,
  idx: number,
  variance = 0.25,
): number {
  const h = crypto
    .createHash("sha256")
    .update(`${entityId}-${month}-${idx}`)
    .digest();
  const r = h.readUInt16BE(0) / 65535; // 0-1
  const factor = 1 - variance / 2 + r * variance;
  return Math.round(base * factor);
}

// Scale by currency
function scaled(
  currency: string,
  gmdBase: number,
  entityId: string,
  month: number,
  idx: number,
): number {
  if (currency === "XOF") return amt(entityId, gmdBase * 8.5, month, idx); // XOF approx 8.5x GMD
  if (currency === "USD")
    return amt(entityId, Math.round(gmdBase / 70), month, idx); // USD ~ GMD/70
  return amt(entityId, gmdBase, month, idx);
}

// COA codes reused
const ACCT = {
  cash: (eid: string) => eSeed(eid, "acct-cash", 1),
  bank: (eid: string) => eSeed(eid, "acct-bank", 1),
  receivable: (eid: string) => eSeed(eid, "acct-recv", 1),
  inventory: (eid: string) => eSeed(eid, "acct-inv", 1),
  fixedAsset: (eid: string) => eSeed(eid, "acct-fa", 1),
  accumDepr: (eid: string) => eSeed(eid, "acct-ad", 1),
  payable: (eid: string) => eSeed(eid, "acct-pay", 1),
  vatPayable: (eid: string) => eSeed(eid, "acct-vat", 1),
  salaryPayable: (eid: string) => eSeed(eid, "acct-salpay", 1),
  salesRev: (eid: string) => eSeed(eid, "acct-sales", 1),
  serviceRev: (eid: string) => eSeed(eid, "acct-svc", 1),
  cogs: (eid: string) => eSeed(eid, "acct-cogs", 1),
  salaryExp: (eid: string) => eSeed(eid, "acct-salexp", 1),
  rentExp: (eid: string) => eSeed(eid, "acct-rent", 1),
  utilities: (eid: string) => eSeed(eid, "acct-util", 1),
  opex: (eid: string) => eSeed(eid, "acct-opex", 1),
  ownerEquity: (eid: string) => eSeed(eid, "acct-eq", 1),
};

// ─── Main ───────────────────────────────────────────────────────────────────

export async function seedDemoComprehensive2026() {
  console.log("═".repeat(70));
  console.log("XENBOOX — COMPREHENSIVE DEMO SEED  Jan 1 → Sep 3 2026");
  console.log(
    "  demo@xenboox.com / Kerr Jula Trading Co. (6 entities, discover-mode)",
  );
  console.log("  NY → Plaid | Gambia+Senegal → PDF");
  console.log("═".repeat(70));

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.name, "Kerr Jula Trading Co."),
  });
  if (!org) throw new Error("Org 'Kerr Jula Trading Co.' not found");
  console.log(`\nOrg: ${org.name} (${org.id})`);

  const allEntities = await db.query.entities.findMany({
    where: eq(entities.organizationId, org.id),
  });
  console.log(`Found ${allEntities.length} entities:`);
  for (const e of allEntities) {
    const rail = e.country === "US" ? "Plaid" : "PDF";
    console.log(
      `  • ${e.name} | ${e.currency} | ${e.country} | ${e.type} | ${rail} | ${e.id}`,
    );
  }

  const demoUser = await db.query.users.findFirst({
    where: eq(users.email, "demo@xenboox.com"),
  });
  const demoUserId = demoUser?.id ?? "demo@xenboox.com";
  console.log(`\nDemo user: ${demoUserId}`);

  // Ensure COA + fiscal periods for each entity first
  for (const ent of allEntities) {
    await ensureCoa(ent);
    await ensureFiscalPeriods(ent);
  }

  // Per-entity comprehensive fill
  for (const ent of allEntities) {
    const isPlaid = ent.country === "US";
    console.log(
      `\n┌─ ${ent.name} (${ent.currency}/${ent.country}) ${isPlaid ? "[Plaid]" : "[PDF]"} ─`,
    );
    await seedForEntity(ent, demoUserId, isPlaid);
    console.log(`└─ done ${ent.name}`);
  }

  console.log("\n" + "═".repeat(70));
  console.log("SEED COMPLETE — Jan→Sep 3 2026 for 6 entities");
  console.log("═".repeat(70));
}

// ─── Ensure COA ─────────────────────────────────────────────────────────────

async function ensureCoa(ent: typeof entities.$inferSelect) {
  const eid = ent.id;
  const existing = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, eid),
  });
  const existingCodes = new Set(existing.map((r) => r.code));
  const coa = [
    {
      id: ACCT.cash(eid),
      code: "1010",
      name: "Cash on Hand",
      type: "asset",
      subtype: "cash",
    },
    {
      id: ACCT.bank(eid),
      code: "1020",
      name: "Bank - Main",
      type: "asset",
      subtype: "bank_account",
    },
    {
      id: ACCT.receivable(eid),
      code: "1100",
      name: "Accounts Receivable",
      type: "asset",
      subtype: "accounts_receivable",
    },
    {
      id: ACCT.inventory(eid),
      code: "1200",
      name: "Inventory",
      type: "asset",
      subtype: "inventory",
    },
    {
      id: ACCT.fixedAsset(eid),
      code: "1500",
      name: "Fixed Assets",
      type: "asset",
      subtype: "fixed_asset",
    },
    {
      id: ACCT.accumDepr(eid),
      code: "1510",
      name: "Accum. Depreciation",
      type: "asset",
      subtype: "fixed_asset",
    },
    {
      id: ACCT.payable(eid),
      code: "2010",
      name: "Accounts Payable",
      type: "liability",
      subtype: "accounts_payable",
    },
    {
      id: ACCT.vatPayable(eid),
      code: "2100",
      name: "VAT Payable",
      type: "liability",
      subtype: "tax_liability",
    },
    {
      id: ACCT.salaryPayable(eid),
      code: "2030",
      name: "Salary Payable",
      type: "liability",
      subtype: "accrued_liability",
    },
    {
      id: ACCT.salesRev(eid),
      code: "4010",
      name: "Sales Revenue",
      type: "revenue",
      subtype: "sales_revenue",
    },
    {
      id: ACCT.serviceRev(eid),
      code: "4020",
      name: "Service Revenue",
      type: "revenue",
      subtype: "service_revenue",
    },
    {
      id: ACCT.cogs(eid),
      code: "5010",
      name: "Cost of Goods Sold",
      type: "expense",
      subtype: "cost_of_goods_sold",
    },
    {
      id: ACCT.salaryExp(eid),
      code: "6010",
      name: "Salaries",
      type: "expense",
      subtype: "payroll_expense",
    },
    {
      id: ACCT.rentExp(eid),
      code: "6020",
      name: "Rent",
      type: "expense",
      subtype: "operating_expense",
    },
    {
      id: ACCT.utilities(eid),
      code: "6030",
      name: "Utilities",
      type: "expense",
      subtype: "operating_expense",
    },
    {
      id: ACCT.opex(eid),
      code: "6050",
      name: "Office Supplies",
      type: "expense",
      subtype: "operating_expense",
    },
    {
      id: ACCT.ownerEquity(eid),
      code: "3010",
      name: "Owner Equity",
      type: "equity",
      subtype: "owner_equity",
    },
  ];
  for (const a of coa) {
    if (existingCodes.has(a.code)) continue;
    await db
      .insert(chartOfAccounts)
      .values({
        id: a.id,
        entityId: eid,
        code: a.code,
        name: a.name,
        type: a.type as any,
        subtype: a.subtype as any,
        isActive: true,
      })
      .onConflictDoNothing();
  }
}

// ─── Fiscal periods Jan-Sep ────────────────────────────────────────────────

async function ensureFiscalPeriods(ent: typeof entities.$inferSelect) {
  for (let m = 1; m <= 9; m++) {
    const pid = eSeed(ent.id, "period", m);
    await db
      .insert(fiscalPeriods)
      .values({
        id: pid,
        entityId: ent.id,
        year: 2026,
        month: m,
        startDate: d(2026, m, 1),
        endDate: d(2026, m, lastDay(2026, m)),
        status: m <= 6 ? "closed" : m === 9 ? "open" : "open",
      })
      .onConflictDoNothing();
  }
}

// ─── Per-entity seed ───────────────────────────────────────────────────────

async function seedForEntity(
  ent: typeof entities.$inferSelect,
  demoUserId: string,
  isPlaid: boolean,
) {
  const eid = ent.id;
  const cur = ent.currency;
  const vatRate =
    ent.country === "SN" ? 0.18 : ent.country === "US" ? 0.0 : 0.15;
  const salesVat = ent.country === "US" ? 0.0 : vatRate;

  // Dynamic COA + period lookup — uses live IDs (handles pre-seeded entities like Kerr Jula Trading Co. with non-deterministic IDs)
  const coaRows = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, eid),
  });
  const coaByCode = new Map(coaRows.map((r) => [r.code, r.id]));
  const acct = (code: string, fallback: string) =>
    coaByCode.get(code) ?? fallback;
  const periodRows = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, eid),
  });
  const periodByMonth = new Map(periodRows.map((p) => [p.month, p.id]));
  const pidForMonth = (m: number) =>
    periodByMonth.get(m) ?? eSeed(eid, "period", m);

  // Suppliers — 6 per entity, local names
  const supplierNames =
    ent.country === "SN"
      ? [
          "Dakar Trading Co.",
          "Casamance Supplies",
          "Senelec Services",
          "Petrosen Logistics",
          "Baol Market Wholesale",
          "Tivaouane Imports",
        ]
      : ent.country === "US"
        ? [
            "Manhattan Office Supply",
            "Brooklyn Steel Co.",
            "Queens Logistics LLC",
            "Hudson Marketing Inc.",
            "NYC Utilities Co.",
            "Empire Insurance Group",
          ]
        : [
            "Gambia Ports Authority",
            "Trust Bank Services",
            "Banjul Wholesale",
            "Kanifing Suppliers",
            "GHE Enterprise",
            "Serekunda Trade Hub",
          ];
  const supplierIds: string[] = [];
  for (let i = 0; i < supplierNames.length; i++) {
    const sid = eSeed(eid, "sup", i + 1);
    supplierIds.push(sid);
    await db
      .insert(suppliers)
      .values({
        id: sid,
        entityId: eid,
        name: supplierNames[i],
        contactEmail: `sup${i}@example.com`,
        paymentTerms: "net30",
      })
      .onConflictDoNothing();
  }
  console.log(`  suppliers: ${supplierNames.length}`);

  // Customers — 6 per entity
  const customerNames =
    ent.country === "SN"
      ? [
          "Dakar Hotel Group",
          "Saint-Louis Retail",
          "Touba Distribution",
          "Plateau Services",
          "Mbour Fish Export",
          "Kaolack Traders",
        ]
      : ent.country === "US"
        ? [
            "Williamsburg Cafe Collective",
            "DUMBO Creative Studios",
            "LIC Manufacturing",
            "Manhattan Retail Partners",
            "JFK Cargo Services",
            "Bronx Community Org",
          ]
        : [
            "Kaira Clinics",
            "Brikama Market Traders",
            "Serrekunda Hardware",
            "Kololi Beach Resort",
            "Bakau Fish Export",
            "Fajara Consulting",
          ];
  const customerIds: string[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const cid = eSeed(eid, "cus", i + 1);
    customerIds.push(cid);
    await db
      .insert(customers)
      .values({
        id: cid,
        entityId: eid,
        name: customerNames[i],
        contactEmail: `cus${i}@example.com`,
        paymentTerms: "net30",
      })
      .onConflictDoNothing();
  }
  console.log(`  customers: ${customerNames.length}`);

  // Bank accounts — 2 per entity
  const bankNames = isPlaid
    ? ["Chase Checking *4821", "Mercury Treasury *7734"]
    : ent.country === "SN"
      ? ["Ecobank Senegal - Courant", "BOA Senegal - Epargne"]
      : ["Trust Bank - Main", "GTBank - Operating"];
  const bankIds: string[] = [];
  for (let i = 0; i < bankNames.length; i++) {
    const bid = eSeed(eid, "bank", i + 1);
    bankIds.push(bid);
    await db
      .insert(bankAccounts)
      .values({
        id: bid,
        entityId: eid,
        name: bankNames[i],
        bankName: bankNames[i].split(" - ")[0] ?? bankNames[i],
        accountNumber: `00${(i + 1).toString().padStart(8, "0")}`,
        type: "checking",
        currency: cur,
        openingBalance: String(scaled(cur, 500000, eid, 1, i)),
        currentBalance: String(scaled(cur, 520000, eid, 9, i)),
        isActive: true,
        glAccountId: acct("1020", ACCT.bank(eid)),
      })
      .onConflictDoNothing();
  }

  // Bank rails
  if (isPlaid) {
    for (let i = 0; i < bankIds.length; i++) {
      const connId = eSeed(eid, "bconn", i + 1);
      await db
        .insert(bankConnections)
        .values({
          id: connId,
          entityId: eid,
          userId: demoUserId,
          provider: "plaid" as any,
          providerConnectionId: `plaid-item-${eid.slice(0, 8)}-${i}`,
          institutionName: bankNames[i].split(" - ")[0] ?? bankNames[i],
          accountName: bankNames[i],
          currency: cur,
          accessToken: "access-sandbox-mock",
          status: "active",
          lastSyncedAt: new Date(),
        })
        .onConflictDoNothing();
    }
    console.log(`  bank accounts: ${bankIds.length} + Plaid connections`);
  } else {
    // PDF statements: one document per month Jan-Aug
    for (let m = 1; m <= 8; m++) {
      const docId = eSeed(eid, "doc-bank", m);
      await db
        .insert(documents)
        .values({
          id: docId,
          entityId: eid,
          name: `Bank-Statement-${d(2026, m, 1).slice(0, 7)}.pdf`,
          type: "bank_statement",
          status: "processed",
          mimeType: "application/pdf",
          sizeBytes: 420000 + m * 10000,
          r2Key: `${eid}/bank/${m}.pdf`,
          r2Bucket: "xenboox-uploads",
          uploadedBy: demoUserId,
          tags: ["bank_statement"],
        })
        .onConflictDoNothing();
    }
    console.log(`  bank accounts: ${bankIds.length} + 8 PDF statements`);
  }

  // Bank transactions — weekly Jan-Sep (~36 per account)
  let txCount = 0;
  for (let m = 1; m <= 9; m++) {
    const days = m === 9 ? 3 : lastDay(2026, m);
    for (let d1 = 2; d1 <= days; d1 += 7) {
      for (let b = 0; b < bankIds.length; b++) {
        const tid = eSeed(eid, `bt-${m}-${d1}-${b}`, 1);
        const isDeposit = (m + d1 + b) % 3 === 0;
        const amount = scaled(cur, isDeposit ? 120000 : 45000, eid, m, d1 + b);
        await db
          .insert(bankTransactions)
          .values({
            id: tid,
            entityId: eid,
            bankAccountId: bankIds[b],
            transactionDate: d(2026, m, Math.min(d1, days)),
            type: isDeposit ? "deposit" : "withdrawal",
            amount: String(amount),
            description: isDeposit
              ? `Customer collection ${m}/${d1}`
              : `Supplier payment ${m}/${d1}`,
            isReconciled: m <= 7,
            source: isPlaid ? "plaid" : "pdf_upload",
            plaidTransactionId: isPlaid
              ? `plaid-tx-${tid.slice(0, 8)}`
              : (null as any),
          })
          .onConflictDoNothing();
        txCount++;
      }
    }
  }
  console.log(`  bank transactions: ${txCount}`);

  // Journal entries — 4 per month Jan-Sep (~36 per entity, balanced, VAT where applicable)
  let jeCount = 0;
  for (let m = 1; m <= 9; m++) {
    const pid = pidForMonth(m);
    const entries: Array<{
      desc: string;
      day: number;
      lines: Array<{ acct: string; debit: string; credit: string }>;
    }> = [
      {
        desc: `Sales ${d(2026, m, 1).slice(0, 7)} — cash`,
        day: 5,
        lines: (() => {
          const rev = scaled(cur, 320000, eid, m, 10);
          const vat = Math.round(rev * salesVat);
          const total = rev + vat;
          return [
            {
              acct: acct("1020", ACCT.bank(eid)),
              debit: String(total),
              credit: "0",
            },
            {
              acct: acct("4010", ACCT.salesRev(eid)),
              debit: "0",
              credit: String(rev),
            },
            ...(vat > 0
              ? [
                  {
                    acct: acct("2100", ACCT.vatPayable(eid)),
                    debit: "0",
                    credit: String(vat),
                  },
                ]
              : []),
          ];
        })(),
      },
      {
        desc: `Sales ${d(2026, m, 1).slice(0, 7)} — on credit`,
        day: 12,
        lines: (() => {
          const rev = scaled(cur, 180000, eid, m, 11);
          const vat = Math.round(rev * salesVat);
          const total = rev + vat;
          return [
            {
              acct: acct("1100", ACCT.receivable(eid)),
              debit: String(total),
              credit: "0",
            },
            {
              acct: acct("4010", ACCT.salesRev(eid)),
              debit: "0",
              credit: String(rev),
            },
            ...(vat > 0
              ? [
                  {
                    acct: acct("2100", ACCT.vatPayable(eid)),
                    debit: "0",
                    credit: String(vat),
                  },
                ]
              : []),
          ];
        })(),
      },
      {
        desc: `COGS ${d(2026, m, 1).slice(0, 7)}`,
        day: 12,
        lines: [
          {
            acct: acct("5010", ACCT.cogs(eid)),
            debit: String(scaled(cur, 190000, eid, m, 12)),
            credit: "0",
          },
          {
            acct: acct("1200", ACCT.inventory(eid)),
            debit: "0",
            credit: String(scaled(cur, 190000, eid, m, 12)),
          },
        ],
      },
      {
        desc: `Rent + salaries ${d(2026, m, 1).slice(0, 7)}`,
        day: 2,
        lines: [
          {
            acct: acct("6020", ACCT.rentExp(eid)),
            debit: String(scaled(cur, 75000, eid, m, 13)),
            credit: "0",
          },
          {
            acct: acct("6010", ACCT.salaryExp(eid)),
            debit: String(scaled(cur, 180000, eid, m, 14)),
            credit: "0",
          },
          {
            acct: acct("1020", ACCT.bank(eid)),
            debit: "0",
            credit: String(scaled(cur, 255000, eid, m, 15)),
          },
        ],
      },
    ];
    if (m === 9 && ent.currency === "GMD") {
      // Sep 3 cutoff — only first entry for Sep
      entries.splice(1);
    }
    for (let ei = 0; ei < entries.length; ei++) {
      const e = entries[ei];
      const jeId = eSeed(eid, `je-${m}-${ei}`, 1);
      await db
        .insert(journalEntries)
        .values({
          id: jeId,
          entityId: eid,
          entryNumber: m * 10 + ei + 1,
          description: e.desc,
          date: d(2026, m, e.day),
          periodId: pid,
          status: "posted",
          postedBy: demoUserId,
          postedAt: new Date(d(2026, m, e.day)),
          source: "seed",
        })
        .onConflictDoNothing();
      for (let li = 0; li < e.lines.length; li++) {
        const l = e.lines[li];
        await db
          .insert(journalEntryLines)
          .values({
            journalEntryId: jeId,
            accountId: l.acct,
            debit: l.debit,
            credit: l.credit,
            description: e.desc,
          })
          .onConflictDoNothing();
      }
      jeCount++;
    }
  }
  console.log(`  journal entries: ${jeCount}`);

  // AP + AR invoices — 3 per month per side Jan-Aug, 1 in Sep (realistic status mix)
  let apCount = 0,
    arCount = 0;
  for (let m = 1; m <= 9; m++) {
    const invPerMonth = m === 9 ? 1 : 3;
    for (let k = 0; k < invPerMonth; k++) {
      const statuses: Array<"pending" | "paid" | "overdue" | "partial"> = [
        "pending",
        "paid",
        "overdue",
        "partial",
      ];
      const apStatus = statuses[(m + k) % 4]!;
      const apId = eSeed(eid, `ap-${m}-${k}`, 1);
      const apAmt = scaled(cur, 85000, eid, m, k + 20);
      await db
        .insert(invoicesAp)
        .values({
          id: apId,
          entityId: eid,
          supplierId: supplierIds[(m + k) % supplierIds.length]!,
          invoiceNumber: `BILL-${eid.slice(0, 4).toUpperCase()}-${m.toString().padStart(2, "0")}${k + 1}`,
          invoiceDate: d(2026, m, 3 + k * 5),
          dueDate: d(2026, m + (apStatus === "overdue" ? 0 : 1), 10 + k * 3),
          totalAmount: String(apAmt),
          balance: String(
            apStatus === "paid"
              ? 0
              : apStatus === "partial"
                ? Math.round(apAmt * 0.4)
                : apAmt,
          ),
          currency: cur,
          status: apStatus as any,
        })
        .onConflictDoNothing();
      await db
        .insert(invoiceApLines)
        .values({
          invoiceApId: apId,
          accountId: acct("6050", ACCT.opex(eid)),
          description: `Goods/services ${m}/${k + 1}`,
          quantity: "1",
          unitPrice: String(apAmt),
          amount: String(apAmt),
        })
        .onConflictDoNothing();
      if (apStatus === "paid" || apStatus === "partial") {
        await db
          .insert(paymentsAp)
          .values({
            entityId: eid,
            invoiceApId: apId,
            amount: String(
              apStatus === "paid" ? apAmt : Math.round(apAmt * 0.6),
            ),
            paymentDate: d(2026, m, 15 + k),
            method: "bank_transfer",
            reference: `PAY-AP-${m}-${k}`,
          })
          .onConflictDoNothing();
      }
      apCount++;

      const arStatus = statuses[(m + k + 1) % 4]!;
      const arId = eSeed(eid, `ar-${m}-${k}`, 1);
      const arAmt = scaled(cur, 140000, eid, m, k + 30);
      await db
        .insert(salesInvoices)
        .values({
          id: arId,
          entityId: eid,
          customerId: customerIds[(m + k) % customerIds.length]!,
          invoiceNumber: `INV-${eid.slice(0, 4).toUpperCase()}-${m.toString().padStart(2, "0")}${k + 1}`,
          invoiceDate: d(2026, m, 5 + k * 5),
          dueDate: d(2026, m + (arStatus === "overdue" ? 0 : 1), 12 + k * 3),
          totalAmount: String(arAmt),
          balance: String(
            arStatus === "paid"
              ? 0
              : arStatus === "partial"
                ? Math.round(arAmt * 0.5)
                : arAmt,
          ),
          currency: cur,
          status: arStatus as any,
        })
        .onConflictDoNothing();
      await db
        .insert(salesInvoiceLines)
        .values({
          salesInvoiceId: arId,
          accountId: acct("4010", ACCT.salesRev(eid)),
          description: `Sales ${m}/${k + 1}`,
          quantity: "1",
          unitPrice: String(arAmt),
          amount: String(arAmt),
        })
        .onConflictDoNothing();
      if (arStatus === "paid" || arStatus === "partial") {
        await db
          .insert(paymentsAr)
          .values({
            entityId: eid,
            salesInvoiceId: arId,
            amount: String(
              arStatus === "paid" ? arAmt : Math.round(arAmt * 0.5),
            ),
            paymentDate: d(2026, m, 18 + k),
            method: isPlaid ? "bank_transfer" : "mobile_money",
            reference: `PAY-AR-${m}-${k}`,
          })
          .onConflictDoNothing();
      }
      arCount++;
    }
  }
  console.log(`  AP invoices: ${apCount} | AR invoices: ${arCount}`);

  // Payroll — 5 employees per entity, runs Jan-Sep
  const empNames =
    ent.country === "US"
      ? [
          "Alex Rivera",
          "Jordan Chen",
          "Taylor Smith",
          "Morgan Blake",
          "Casey Lee",
        ]
      : ent.country === "SN"
        ? [
            "Moussa Diop",
            "Aissatou Fall",
            "Cheikh Ndiaye",
            "Fatou Sow",
            "Ibrahima Ba",
          ]
        : [
            "Ousman Jatta",
            "Fatoumata Jawara",
            "Ismaila Ceesay",
            "Awa Bah",
            "Bubacarr Jobe",
          ];
  for (let i = 0; i < 5; i++) {
    const eid2 = eSeed(eid, `emp-${i}`, 1);
    await db
      .insert(employees)
      .values({
        id: eid2,
        entityId: eid,
        employeeNumber: `EMP-${eid.slice(0, 4)}-${i + 1}`,
        name: empNames[i]!,
        email: `emp${i}@${eid.slice(0, 4)}.com`,
        hireDate: "2025-01-15",
        department: ["Finance", "Sales", "Ops", "Admin", "IT"][i]!,
        jobTitle: "Staff",
        employmentType: "full_time",
        isActive: true,
      })
      .onConflictDoNothing();
    await db
      .insert(employeeContracts)
      .values({
        entityId: eid,
        employeeId: eid2,
        effectiveDate: "2025-01-15",
        basicSalary: String(
          scaled(cur, [45000, 38000, 35000, 25000, 30000][i]!, eid, 1, i),
        ),
        currency: cur,
        payFrequency: "monthly",
        isActive: true,
      })
      .onConflictDoNothing();
  }
  for (let m = 1; m <= 9; m++) {
    if (m === 9 && new Date().getDate() < 3) break;
    const rid = eSeed(eid, `prun-${m}`, 1);
    const gross = scaled(cur, 173000, eid, m, 40);
    const ded = Math.round(gross * 0.15);
    await db
      .insert(payrollRuns)
      .values({
        id: rid,
        entityId: eid,
        period: d(2026, m, 1).slice(0, 7),
        status: m <= 7 ? "paid" : m === 8 ? "approved" : "draft",
        employeeCount: 5,
        grossPay: String(gross),
        totalDeductions: String(ded),
        totalEmployerContributions: String(Math.round(ded * 0.6)),
        netPay: String(gross - ded),
        processedBy: demoUserId,
      })
      .onConflictDoNothing();
  }
  console.log(`  employees: 5 | payroll runs: 9`);

  // Fixed assets — 3 per entity
  for (let i = 0; i < 3; i++) {
    const aid = eSeed(eid, `asset-${i}`, 1);
    await db
      .insert(fixedAssets)
      .values({
        id: aid,
        entityId: eid,
        name: `Asset ${i + 1} - ${ent.name.slice(0, 10)}`,
        assetClass: "equipment",
        location: "Main",
        purchaseDate: "2025-01-01",
        cost: String(scaled(cur, 400000, eid, 1, i + 50)),
        salvageValue: String(scaled(cur, 40000, eid, 1, i + 51)),
        usefulLifeMonths: 60,
        depreciationMethod: "straight_line",
        accumulatedDepreciation: String(scaled(cur, 12000, eid, 8, i)),
        netBookValue: String(scaled(cur, 380000, eid, 8, i)),
        status: "active",
        glAccountId: acct("1500", ACCT.fixedAsset(eid)),
        accumulatedDepreciationAccountId: acct("1510", ACCT.accumDepr(eid)),
        responsiblePerson: empNames[0]!,
        condition: "good",
      })
      .onConflictDoNothing();
  }

  // Inventory — 3 SKUs per entity (trading) or 2 for services
  const whId = eSeed(eid, "wh", 1);
  await db
    .insert(warehouses)
    .values({
      id: whId,
      entityId: eid,
      name: `Main Warehouse - ${ent.name.slice(0, 10)}`,
      location: ent.country,
      isActive: true,
    })
    .onConflictDoNothing();
  for (let i = 0; i < 3; i++) {
    const iid = eSeed(eid, `sku-${i}`, 1);
    await db
      .insert(inventoryItems)
      .values({
        id: iid,
        entityId: eid,
        name: `SKU ${i + 1}`,
        sku: `SKU-${eid.slice(0, 4)}-${i + 1}`,
        category: "goods",
        unitOfMeasure: "unit",
        costMethod: "weighted_average",
        standardCost: String(scaled(cur, 1200, eid, 1, i + 60)),
        reorderLevel: 20,
        reorderQuantity: 50,
        quantityOnHand: 100 + i * 30,
        glAccountId: acct("1200", ACCT.inventory(eid)),
        cogsAccountId: acct("5010", ACCT.cogs(eid)),
        isActive: true,
      })
      .onConflictDoNothing();
    await db
      .insert(inventoryTransactions)
      .values({
        entityId: eid,
        inventoryItemId: iid,
        warehouseId: whId,
        type: "receipt",
        quantity: 100 + i * 30,
        unitCost: String(scaled(cur, 1200, eid, 1, i)),
        totalCost: String(scaled(cur, 120000, eid, 1, i)),
        transactionDate: d(2026, 1, 10 + i),
        notes: "Opening stock",
      })
      .onConflictDoNothing();
  }

  // Cash + imprest
  const cashId = eSeed(eid, "cash", 1);
  await db
    .insert(cashAccounts)
    .values({
      id: cashId,
      entityId: eid,
      name: `Petty Cash - ${ent.name.slice(0, 10)}`,
      currency: cur,
      currentBalance: String(scaled(cur, 50000, eid, 9, 1)),
      glAccountId: acct("1010", ACCT.cash(eid)),
      isActive: true,
    })
    .onConflictDoNothing();
  for (let k = 0; k < 2; k++) {
    const fid = eSeed(eid, `float-${k}`, 1);
    await db
      .insert(imprestFloats)
      .values({
        id: fid,
        entityId: eid,
        cashAccountId: cashId,
        assigneeName: empNames[k]!,
        amount: String(scaled(cur, 20000, eid, 7, k)),
        remainingBalance: String(scaled(cur, 5000, eid, 8, k)),
        purpose: `Field ops ${k + 1}`,
        status: k === 0 ? "active" : "settled",
        issuedDate: d(2026, 7, 1 + k),
        settleByDate: d(2026, 8, 15),
      })
      .onConflictDoNothing();
  }

  // Mobile money — only for GM/SN (not NY Plaid, but NY still gets one for completeness)
  if (!isPlaid) {
    for (let mm = 0; mm < 1; mm++) {
      const mmId = eSeed(eid, `mm-${mm}`, 1);
      await db
        .insert(mobileMoneyAccounts)
        .values({
          id: mmId,
          entityId: eid,
          provider: ent.country === "SN" ? "wave" : "afrimoney",
          accountName: `MM - ${ent.name.slice(0, 10)}`,
          phoneNumber: `+220${81000000 + mm}`,
          currentBalance: String(scaled(cur, 40000, eid, 9, mm)),
          currency: cur,
          isActive: true,
        })
        .onConflictDoNothing();
      const mmAmt = scaled(cur, 15000, eid, 8, mm);
      const mmFee = scaled(cur, 225, eid, 8, mm);
      await db
        .insert(mobileMoneyTransactions)
        .values({
          entityId: eid,
          mobileMoneyAccountId: mmId,
          type: "collection",
          amount: String(mmAmt),
          fee: String(mmFee),
          netAmount: String(mmAmt - mmFee),
          counterparty: customerNames[0]!,
          description: "MM collection",
          status: "successful",
        })
        .onConflictDoNothing();
    }
  }

  // Budget — one annual + 9 months variance
  const budId = eSeed(eid, "budget", 1);
  await db
    .insert(budgets)
    .values({
      id: budId,
      entityId: eid,
      name: `FY2026 Budget - ${ent.name.slice(0, 10)}`,
      fiscalYear: 2026,
      status: "active",
      currency: cur,
      createdById: demoUserId,
    })
    .onConflictDoNothing();
  for (let li = 0; li < 4; li++) {
    const lid = eSeed(eid, `bl-${li}`, 1);
    const acctCodes = ["4010", "5010", "6010", "6020"];
    const fallbackAccts = [
      ACCT.salesRev(eid),
      ACCT.cogs(eid),
      ACCT.salaryExp(eid),
      ACCT.rentExp(eid),
    ];
    await db
      .insert(budgetLines)
      .values({
        id: lid,
        entityId: eid,
        budgetId: budId,
        accountId: acct(acctCodes[li]!, fallbackAccts[li]!),
        lineDescription: `Budget line ${li + 1}`,
        dimensionType: "department",
        dimensionId: null,
        annualAmount: String(
          scaled(cur, [2400000, 1800000, 2100000, 900000][li]!, eid, 1, li),
        ),
        isActive: true,
        jan: String(scaled(cur, 200000, eid, 1, li)),
        feb: String(scaled(cur, 200000, eid, 2, li)),
        mar: String(scaled(cur, 200000, eid, 3, li)),
        apr: String(scaled(cur, 200000, eid, 4, li)),
        may: String(scaled(cur, 200000, eid, 5, li)),
        jun: String(scaled(cur, 200000, eid, 6, li)),
        jul: String(scaled(cur, 200000, eid, 7, li)),
        aug: String(scaled(cur, 200000, eid, 8, li)),
        sep: String(scaled(cur, 200000, eid, 9, li)),
        oct: "0",
        nov: "0",
        dec: "0",
      })
      .onConflictDoNothing();
  }

  console.log(`  assets:3 inventory:3 cash+imprest:1+2 budget:1`);
}

if (require.main === module) {
  seedDemoComprehensive2026()
    .then(() => {
      console.log("\n✅ Comprehensive seed done");
      process.exit(0);
    })
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    });
}
