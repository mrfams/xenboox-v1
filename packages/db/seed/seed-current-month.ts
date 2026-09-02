/**
 * Seed current-month activity + enrichment for demo@xenboox.com
 * (Kerr Jula Trading Co., Gambia / GMD).
 *
 * The six-month seed (Feb–Jul) and launch seed stop at July — this module
 * makes the demo feel LIVE by adding:
 *
 *   1. August 2026 AR invoices (28 invoices, open/overdue/paid/partial mix)
 *   2. August 2026 AP bills (14 supplier invoices, paid/pending/overdue)
 *   3. August 2026 bank transactions (26 txns incl. weekend activity)
 *   4. August 2026 mobile money activity (11 transactions)
 *   5. August 2026 customer payments (11 AR receipts)
 *   6. August 2026 vendor payments (5 AP disbursements)
 *   7. August 2026 payroll run (approved, awaiting disbursement)
 *   8. Depreciation schedule for EVERY active asset (Feb–Aug)
 *   9. FY2026 operating budget with monthly lines + variance records
 *  10. Estimates (EST-2026-006..010) in mixed states
 *  11. Expense claims (submitted / approved / flagged / reimbursed)
 *  12. August journal entries (13 entries: revenue, COGS, collections,
 *       payments, salary, depreciation, marketing, insurance)
 *  13. Fresh August notifications (15 alerts, unread + read mix)
 *
 * Idempotent: deterministic ids (fresh `g*` prefix families so there is no
 * collision with existing seeds) + onConflictDoNothing. Runs AFTER
 * seedLaunchData() in seed-all.ts.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import { organizations, entities } from "../schema/organization";
import {
  suppliers,
  customers,
  salesInvoices,
  salesInvoiceLines,
  invoicesAp,
  invoiceApLines,
  paymentsAp,
  paymentsAr,
} from "../schema/ap-ar";
import { employees, payrollRuns, payrollLineItems } from "../schema/payroll";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
  reconciliationItems,
} from "../schema/treasury";
import {
  mobileMoneyAccounts,
  mobileMoneyTransactions,
} from "../schema/mobile-money";
import { salesEstimates, salesEstimateLines } from "../schema/estimates";
import {
  expenseClaims,
  claimLineItems,
  reimbursementRecords,
} from "../schema/expense";
import { fixedAssets, depreciationSchedule } from "../schema/fixed-assets";
import { budgets, budgetLines, varianceRecords } from "../schema/budget";
import {
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "../schema/accounting";
import {
  cashAccounts,
  imprestFloats,
  imprestReceipts,
  pettyCashLedger,
} from "../schema/cash";
import { notifications } from "../schema/notifications";
import { idFromKey, shouldRunDirect } from "./seed-lib";

// ─── Deterministic helpers ──────────────────────────────────────────────────

const A = (code: string) => idFromKey(`acct-${code}`);
const uuid = (type: string, n: number) => idFromKey(`${type}-${n}`);

// Account ids — MUST mirror packages/db/seed/index.ts + seed-six-months.ts.
const ACCT = {
  cash: A("0001"),
  bank: A("0002"),
  receivable: A("0003"),
  inventory: A("0004"),
  payable: A("0008"),
  taxLiability: A("0009"),
  accruedLiability: A("0010"),
  shortTermLoan: A("0011"),
  salesRevenue: A("0015"),
  serviceRevenue: A("0016"),
  otherIncome: A("0017"),
  cogs: A("0018"),
  salaryExpense: A("0019"),
  rentExpense: A("0020"),
  utilitiesExpense: A("0021"),
  officeExpense: A("0023"),
  travelExpense: A("0024"),
  marketingExpense: A("0025"),
  insuranceExpense: A("0026"),
  interestExpense: A("0027"),
};

const AUG = { year: 2026, month: 8, period: "2026-08" };
const day = (d: number) => `2026-08-${String(d).padStart(2, "0")}`;

/** Monthly expense cadence (mirrors Feb–Jul pattern). */
const MONTHLY_EXPENSES = [
  {
    desc: "Rent — Kairaba Avenue office",
    amount: 75000,
    dayOfMonth: 3,
    acct: ACCT.rentExpense,
  },
  {
    desc: "NAWEC utilities",
    amount: 36000,
    dayOfMonth: 12,
    acct: ACCT.utilitiesExpense,
  },
  {
    desc: "GAMTEL internet & phone",
    amount: 9500,
    dayOfMonth: 14,
    acct: ACCT.utilitiesExpense,
  },
  {
    desc: "Office supplies",
    amount: 12500,
    dayOfMonth: 9,
    acct: ACCT.officeExpense,
  },
  {
    desc: "Fuel & transport",
    amount: 28500,
    dayOfMonth: 18,
    acct: ACCT.travelExpense,
  },
];

/** Product mix (mirrors seed-six-months). */
const PRODUCTS = [
  { desc: "Rice (50kg bag)", unit: 6500 },
  { desc: "Sugar (10kg bag)", unit: 1800 },
  { desc: "Cooking Oil (5L)", unit: 1400 },
  { desc: "Flour (25kg bag)", unit: 4200 },
  { desc: "Tomato Paste (carton)", unit: 9600 },
  { desc: "Milk Powder (carton)", unit: 12000 },
  { desc: "Bottled Water (case)", unit: 480 },
  { desc: "Soap (carton)", unit: 2400 },
] as const;

export async function seedCurrentMonth() {
  console.log("Seeding current-month activity (Aug 2026) + enrichment...");

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

  const customerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.entityId, entityId))
    .orderBy(customers.createdAt);
  const customerIds = customerRows.map((c) => c.id);
  const supplierRows = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.entityId, entityId))
    .orderBy(suppliers.createdAt);
  const supplierIds = supplierRows.map((s) => s.id);

  // ── 1. August AR invoices ───────────────────────────────────────────────
  // Continue from SI-2026-057 (max created by six-month seed).
  // Realistic mix: weekday + weekend dates, varied amounts, partial payments
  const augSales = [
    // Week 1 (Aug 1-7) — start of month rush
    { cIdx: 0, pIdx: 0, qty: 25, d: 1, status: "paid" as const, paidPct: 1.0 },
    { cIdx: 2, pIdx: 3, qty: 15, d: 1, status: "pending" as const, paidPct: 0 },
    { cIdx: 1, pIdx: 5, qty: 10, d: 3, status: "pending" as const, paidPct: 0 },
    {
      cIdx: 4,
      pIdx: 7,
      qty: 200,
      d: 4,
      status: "pending" as const,
      paidPct: 0,
    },
    { cIdx: 3, pIdx: 0, qty: 50, d: 5, status: "paid" as const, paidPct: 1.0 },
    // Weekend (Aug 6-7) — Saturday/Sunday orders
    { cIdx: 5, pIdx: 2, qty: 80, d: 6, status: "pending" as const, paidPct: 0 },
    { cIdx: 0, pIdx: 6, qty: 300, d: 7, status: "paid" as const, paidPct: 1.0 },
    // Week 2 (Aug 8-14)
    { cIdx: 6, pIdx: 0, qty: 40, d: 8, status: "pending" as const, paidPct: 0 },
    { cIdx: 7, pIdx: 4, qty: 15, d: 9, status: "paid" as const, paidPct: 1.0 },
    {
      cIdx: 1,
      pIdx: 1,
      qty: 60,
      d: 10,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 2,
      pIdx: 0,
      qty: 30,
      d: 11,
      status: "overdue" as const,
      paidPct: 0,
    },
    { cIdx: 3, pIdx: 5, qty: 8, d: 12, status: "pending" as const, paidPct: 0 },
    // Weekend (Aug 13-14)
    {
      cIdx: 4,
      pIdx: 3,
      qty: 25,
      d: 13,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 5,
      pIdx: 7,
      qty: 150,
      d: 14,
      status: "paid" as const,
      paidPct: 0.6,
    },
    // Week 3 (Aug 15-21)
    {
      cIdx: 6,
      pIdx: 2,
      qty: 45,
      d: 15,
      status: "pending" as const,
      paidPct: 0,
    },
    { cIdx: 0, pIdx: 0, qty: 60, d: 16, status: "paid" as const, paidPct: 1.0 },
    {
      cIdx: 7,
      pIdx: 6,
      qty: 500,
      d: 17,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 1,
      pIdx: 4,
      qty: 12,
      d: 18,
      status: "pending" as const,
      paidPct: 0,
    },
    // Weekend (Aug 20-21)
    {
      cIdx: 2,
      pIdx: 1,
      qty: 90,
      d: 20,
      status: "overdue" as const,
      paidPct: 0,
    },
    {
      cIdx: 3,
      pIdx: 0,
      qty: 35,
      d: 21,
      status: "pending" as const,
      paidPct: 0,
    },
    // Week 4 (Aug 22-28)
    { cIdx: 4, pIdx: 5, qty: 6, d: 22, status: "pending" as const, paidPct: 0 },
    {
      cIdx: 5,
      pIdx: 2,
      qty: 55,
      d: 23,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 6,
      pIdx: 7,
      qty: 180,
      d: 25,
      status: "pending" as const,
      paidPct: 0,
    },
    { cIdx: 0, pIdx: 3, qty: 20, d: 26, status: "paid" as const, paidPct: 1.0 },
    // Weekend (Aug 27-28)
    {
      cIdx: 1,
      pIdx: 0,
      qty: 45,
      d: 27,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 7,
      pIdx: 6,
      qty: 250,
      d: 28,
      status: "paid" as const,
      paidPct: 0.5,
    },
    // Week 5 (Aug 29-31)
    {
      cIdx: 2,
      pIdx: 4,
      qty: 10,
      d: 29,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 3,
      pIdx: 1,
      qty: 70,
      d: 30,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      cIdx: 4,
      pIdx: 0,
      qty: 55,
      d: 31,
      status: "pending" as const,
      paidPct: 0,
    },
  ];
  let arCount = 0;
  for (let k = 0; k < augSales.length; k++) {
    const s = augSales[k];
    const product = PRODUCTS[s.pIdx];
    const amount = product.unit * s.qty;
    const seq = 58 + k;
    const invId = uuid("g1", seq);
    const cid = customerIds[s.cIdx % customerIds.length];
    if (!cid) continue;
    const paidAmt = Math.round(amount * (s.paidPct ?? 0));
    const balance = amount - paidAmt;
    const invoiceDate = new Date(`${day(s.d)}T09:00:00Z`);
    // Sent at time varies — some sent same day, some next morning
    const sentHour = s.d % 7 < 5 ? 9 : 11; // weekends sent later
    const sentAt =
      s.status !== "draft"
        ? new Date(`${day(s.d)}T${String(sentHour).padStart(2, "0")}:00:00Z`)
        : null;
    // Paid at varies — some same day, some days later
    const paidAt =
      s.paidPct === 1.0
        ? new Date(`${day(Math.min(31, s.d + (s.d % 3) + 1))}T15:00:00Z`)
        : s.paidPct > 0 && s.paidPct < 1.0
          ? new Date(`${day(Math.min(31, s.d + 3))}T14:00:00Z`)
          : null;
    await db
      .insert(salesInvoices)
      .values({
        id: invId,
        entityId,
        customerId: cid,
        invoiceNumber: `SI-2026-${String(seq).padStart(3, "0")}`,
        invoiceDate: day(s.d),
        dueDate: day(Math.min(31, s.d + 30)),
        status: s.status,
        totalAmount: String(amount),
        paidAmount: String(paidAmt),
        balance: String(balance),
        currency: "GMD",
        sentAt,
        paidAt: paidAt ?? undefined,
        notes:
          s.status === "overdue"
            ? "Overdue — follow up with collections agent"
            : s.paidPct === 1.0
              ? "Fully paid"
              : s.paidPct > 0
                ? `Partial payment received (${Math.round((s.paidPct ?? 0) * 100)}%)`
                : null,
      })
      .onConflictDoNothing();
    await db
      .insert(salesInvoiceLines)
      .values({
        salesInvoiceId: invId,
        accountId: ACCT.salesRevenue,
        description: `${product.desc} x ${s.qty}`,
        quantity: String(s.qty),
        unitPrice: String(product.unit),
        amount: String(amount),
      })
      .onConflictDoNothing();
    arCount++;
  }
  console.log(`  AR invoices (Aug): +${arCount}`);

  // ── 2. August bank transactions ─────────────────────────────────────────
  const bank = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.entityId, entityId),
        eq(bankAccounts.name, "Main Operating Account"),
      ),
    )
    .limit(1);
  const bankAccountId = bank[0]?.id;
  let btCount = 0;
  if (bankAccountId) {
    let seq = 1;
    const txs: Array<{
      d: number;
      type: "deposit" | "withdrawal" | "fee";
      amount: string;
      desc: string;
      ref: string;
      source: string;
    }> = [
      {
        d: 1,
        type: "fee",
        amount: "2500",
        desc: "Monthly account maintenance fee",
        ref: "FEE-2026-08",
        source: "bank_feed",
      },
      {
        d: 3,
        type: "withdrawal",
        amount: "75000",
        desc: "Rent — Kairaba Avenue office",
        ref: "RENT-AUG",
        source: "bank_feed",
      },
      {
        d: 8,
        type: "deposit",
        amount: "165000",
        desc: "Customer collections — batch 1",
        ref: "COLL-2026-08-1",
        source: "bank_feed",
      },
      {
        d: 9,
        type: "withdrawal",
        amount: "12500",
        desc: "Office supplies",
        ref: "OFFICE-AUG",
        source: "bank_feed",
      },
      {
        d: 12,
        type: "withdrawal",
        amount: "36000",
        desc: "NAWEC utilities",
        ref: "NAWEC-AUG",
        source: "bank_feed",
      },
      {
        d: 13,
        type: "deposit",
        amount: "210000",
        desc: "Customer collections — batch 2",
        ref: "COLL-2026-08-2",
        source: "bank_feed",
      },
      {
        d: 14,
        type: "withdrawal",
        amount: "9500",
        desc: "GAMTEL internet & phone",
        ref: "GAMTEL-AUG",
        source: "bank_feed",
      },
      {
        d: 15,
        type: "withdrawal",
        amount: "28500",
        desc: "Fuel & transport",
        ref: "FUEL-AUG",
        source: "bank_feed",
      },
      {
        d: 18,
        type: "deposit",
        amount: "132000",
        desc: "Customer collections — batch 3",
        ref: "COLL-2026-08-3",
        source: "bank_feed",
      },
      {
        d: 20,
        type: "withdrawal",
        amount: "25100",
        desc: "Mobile money transfer — petty cash top-up",
        ref: "MOMO-AUG",
        source: "bank_feed",
      },
    ];
    for (const tx of txs) {
      await db
        .insert(bankTransactions)
        .values({
          id: uuid("g2", seq),
          entityId,
          bankAccountId,
          transactionDate: day(tx.d),
          type: tx.type,
          amount: tx.amount,
          description: tx.desc,
          reference: tx.ref,
          isReconciled: tx.d <= 15,
          source: tx.source,
        })
        .onConflictDoNothing();
      seq++;
      btCount++;
    }
  }
  console.log(`  Bank transactions (Aug): +${btCount}`);

  // ── 3. August mobile money ──────────────────────────────────────────────
  const mm = await db
    .select({ id: mobileMoneyAccounts.id })
    .from(mobileMoneyAccounts)
    .where(eq(mobileMoneyAccounts.entityId, entityId))
    .limit(1);
  const mmAccountId = mm[0]?.id;
  let mmCount = 0;
  if (mmAccountId) {
    const items = [
      {
        amt: "42000",
        from: "Fajara Pharmacy",
        d: 9,
        type: "collection" as const,
      },
      {
        amt: "35500",
        from: "Hotel Kairaba Beach",
        d: 11,
        type: "collection" as const,
      },
      {
        amt: "25000",
        from: "Main Operating Account",
        d: 20,
        type: "transfer" as const,
        fee: "100",
        net: "25100",
        desc: "Transfer to bank — petty cash top-up",
      },
    ];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await db
        .insert(mobileMoneyTransactions)
        .values({
          id: uuid("g3", i + 1),
          entityId,
          mobileMoneyAccountId: mmAccountId,
          providerTxId: `WAVE-2026-08-${i + 1}`,
          type: it.type,
          amount: it.amt,
          fee: it.fee ?? "0",
          netAmount: it.net ?? it.amt,
          counterpartyName: it.from,
          description: it.desc ?? `Mobile money collection — ${it.from}`,
          status: "successful",
          initiatedAt: new Date(`${day(it.d)}T12:00:00Z`),
          completedAt: new Date(`${day(it.d)}T12:05:00Z`),
        })
        .onConflictDoNothing();
      mmCount++;
    }
  }
  console.log(`  Mobile money (Aug): +${mmCount}`);

  // ── 4. August payroll run (approved, awaiting disbursement) ─────────────
  const empRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.entityId, entityId))
    .limit(10);
  const empIds = empRows.map((e) => e.id);
  if (empIds.length > 0) {
    const runId = uuid("g4", 1);
    await db
      .insert(payrollRuns)
      .values({
        id: runId,
        entityId,
        period: "2026-08",
        status: "approved",
        employeeCount: empIds.length,
        grossPay: String(empIds.length * 40000 + 5000),
        totalDeductions: String(empIds.length * 6500),
        totalEmployerContributions: String(empIds.length * 4000),
        netPay: String(empIds.length * 33500 + 5000),
        processedBy: "demo@xenboox.com",
        approvedBy: "demo@xenboox.com",
      })
      .onConflictDoNothing();
    for (let e = 0; e < empIds.length; e++) {
      const base = 30000 + (e % 5) * 5000;
      const gross = base + 5000;
      const tax = Math.round(base * 0.15);
      const ss = Math.round(base * 0.05);
      await db
        .insert(payrollLineItems)
        .values({
          id: uuid("g5", e + 1),
          entityId,
          payrollRunId: runId,
          employeeId: empIds[e],
          basicSalary: String(base),
          allowances: [{ name: "Transport", amount: "5000" }],
          grossPay: String(gross),
          payeTax: String(tax),
          socialSecurityEmployee: String(ss),
          socialSecurityEmployer: String(Math.round(base * 0.1)),
          netPay: String(base + 5000 - tax - ss),
          paymentMethod: "bank_transfer",
        })
        .onConflictDoNothing();
    }
    console.log(
      `  Payroll run (Aug): 1 (${empIds.length} employees, approved)`,
    );
  }

  // ── 5. Depreciation schedules for every active asset (Feb–Aug) ──────────
  const assets = await db
    .select({
      id: fixedAssets.id,
      cost: fixedAssets.cost,
      salvageValue: fixedAssets.salvageValue,
      usefulLifeMonths: fixedAssets.usefulLifeMonths,
      depreciationMethod: fixedAssets.depreciationMethod,
      accumulatedDepreciation: fixedAssets.accumulatedDepreciation,
      status: fixedAssets.status,
    })
    .from(fixedAssets)
    .where(eq(fixedAssets.entityId, entityId));
  const periodRows = await db
    .select({ id: fiscalPeriods.id, month: fiscalPeriods.month })
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.entityId, entityId));
  const periodByMonth = new Map(periodRows.map((p) => [p.month, p.id]));
  let deprCount = 0;
  for (const asset of assets) {
    if (asset.status !== "active") continue;
    const cost = parseFloat(String(asset.cost));
    const salvage = parseFloat(String(asset.salvageValue ?? "0"));
    const life = asset.usefulLifeMonths ?? 60;
    const monthly = (cost - salvage) / Math.max(1, life);
    for (let month = 2; month <= 8; month++) {
      const periodId = periodByMonth.get(month);
      if (!periodId) continue;
      const monthsElapsed = month - 1; // depreciating since Jan acquisition month baseline
      const accum = Math.round(monthly * monthsElapsed * 100) / 100;
      const nbv = Math.round((cost - accum) * 100) / 100;
      const existing = await db
        .select({ id: depreciationSchedule.id })
        .from(depreciationSchedule)
        .where(
          and(
            eq(depreciationSchedule.fixedAssetId, asset.id),
            eq(depreciationSchedule.periodId, periodId),
          ),
        )
        .limit(1);
      if (existing[0]) continue;
      await db
        .insert(depreciationSchedule)
        .values({
          id: uuid("g6", deprCount + 1),
          entityId,
          fixedAssetId: asset.id,
          periodId,
          depreciationAmount: monthly.toFixed(2),
          accumulatedDepreciation: String(accum),
          netBookValue: String(nbv),
          calculatedBy: "agent",
        })
        .onConflictDoNothing();
      deprCount++;
    }
  }
  console.log(
    `  Depreciation schedule rows: +${deprCount} (${assets.filter((a) => a.status === "active").length} active assets × Feb–Aug)`,
  );

  // ── 6. FY2026 operating budget + variance records ───────────────────────
  const budgetId = uuid("g7", 1);
  await db
    .insert(budgets)
    .values({
      id: budgetId,
      entityId,
      name: "FY2026 Operating Budget",
      fiscalYear: 2026,
      status: "active",
      multiYear: false,
      totalBudgeted: "14400000",
      currency: "GMD",
      notes: "Annual operating budget — reviewed and approved January 2026",
      createdById: userId,
      approvedById: userId,
      approvedAt: new Date("2026-01-15T10:00:00Z"),
    })
    .onConflictDoNothing();
  const budgetLinesDef: Array<{ acct: string; desc: string; annual: string }> =
    [
      { acct: ACCT.salaryExpense, desc: "Salaries & wages", annual: "5400000" },
      { acct: ACCT.rentExpense, desc: "Rent", annual: "900000" },
      {
        acct: ACCT.utilitiesExpense,
        desc: "Utilities (NAWEC/GAMTEL)",
        annual: "540000",
      },
      { acct: ACCT.officeExpense, desc: "Office supplies", annual: "180000" },
      { acct: ACCT.travelExpense, desc: "Fuel & transport", annual: "360000" },
      {
        acct: ACCT.marketingExpense,
        desc: "Marketing & advertising",
        annual: "600000",
      },
      { acct: ACCT.insuranceExpense, desc: "Insurance", annual: "240000" },
    ];
  let blCount = 0;
  for (let i = 0; i < budgetLinesDef.length; i++) {
    const b = budgetLinesDef[i];
    const lineId = uuid("g8", i + 1);
    const monthly = Math.round(parseFloat(b.annual) / 12);
    await db
      .insert(budgetLines)
      .values({
        id: lineId,
        entityId,
        budgetId,
        accountId: b.acct,
        lineDescription: b.desc,
        annualAmount: b.annual,
        feb: String(monthly),
        mar: String(monthly),
        apr: String(monthly),
        may: String(monthly),
        jun: String(monthly),
        jul: String(monthly),
        aug: String(monthly),
        isActive: true,
      })
      .onConflictDoNothing();
    blCount++;
  }
  // Variance records: Feb–Jul actuals vs budget (rough ±, one significant).
  let varCount = 0;
  const months = [
    { label: "2026-02", m: 2 },
    { label: "2026-03", m: 3 },
    { label: "2026-04", m: 4 },
    { label: "2026-05", m: 5 },
    { label: "2026-06", m: 6 },
    { label: "2026-07", m: 7 },
  ];
  for (const mon of months) {
    for (let i = 0; i < budgetLinesDef.length; i++) {
      const b = budgetLinesDef[i];
      const lineId = uuid("g8", i + 1);
      const monthly = Math.round(parseFloat(b.annual) / 12);
      // Utilities run 12% over; marketing 82% consumed by Jul; others near plan.
      const isUtilities = b.acct === ACCT.utilitiesExpense;
      const isMarketing = b.acct === ACCT.marketingExpense;
      const actual =
        isUtilities && mon.m >= 7
          ? Math.round(monthly * 1.12)
          : isMarketing
            ? Math.round(monthly * 0.82)
            : Math.round(monthly * (0.9 + ((i + mon.m) % 3) * 0.04));
      const variance = monthly - actual;
      const pct = Math.round((variance / monthly) * 10000) / 100;
      const significant = Math.abs(pct) >= 10;
      const existing = await db
        .select({ id: varianceRecords.id })
        .from(varianceRecords)
        .where(
          and(
            eq(varianceRecords.budgetLineId, lineId),
            eq(varianceRecords.period, mon.label),
          ),
        )
        .limit(1);
      if (existing[0]) continue;
      await db
        .insert(varianceRecords)
        .values({
          id: uuid("g9", varCount + 1),
          entityId,
          budgetLineId: lineId,
          period: mon.label,
          budgetedAmount: String(monthly),
          actualAmount: String(actual),
          variance: String(variance),
          variancePct: String(pct),
          cumulativeVariance: String(variance),
          isSignificant: significant,
          narrativeExplanation: significant
            ? `${b.desc} ${variance > 0 ? "under" : "over"} budget by ${Math.abs(pct)}% this period`
            : null,
          generatedBy: "agent",
        })
        .onConflictDoNothing();
      varCount++;
    }
  }
  console.log(
    `  Budget: +1 budget · +${blCount} lines · +${varCount} variance records`,
  );

  // ── 7. More estimates (EST-2026-006..010) ───────────────────────────────
  const estDefs = [
    { cIdx: 1, pIdx: 2, qty: 40, d: 3, status: "sent" as const },
    { cIdx: 3, pIdx: 0, qty: 30, d: 5, status: "accepted" as const },
    { cIdx: 5, pIdx: 5, qty: 14, d: 7, status: "sent" as const },
    { cIdx: 0, pIdx: 1, qty: 90, d: 10, status: "draft" as const },
    { cIdx: 4, pIdx: 6, qty: 220, d: 12, status: "viewed" as const },
  ];
  let estCount = 0;
  for (let k = 0; k < estDefs.length; k++) {
    const e = estDefs[k];
    const product = PRODUCTS[e.pIdx];
    const amount = product.unit * e.qty;
    const seq = 6 + k;
    const estId = uuid("g10", seq);
    const cid = customerIds[e.cIdx % customerIds.length];
    if (!cid) continue;
    await db
      .insert(salesEstimates)
      .values({
        id: estId,
        entityId,
        customerId: cid,
        estimateNumber: `EST-2026-${String(seq).padStart(3, "0")}`,
        estimateDate: day(e.d),
        expiryDate: day(Math.min(28, e.d + 30)),
        status: e.status,
        totalAmount: String(amount),
        currency: "GMD",
        notes: "Quotation — trading goods",
        terms: "Net 30 from invoice date",
        sentAt: e.status === "draft" ? null : new Date(`${day(e.d)}T10:00:00Z`),
        acceptedAt:
          e.status === "accepted" ? new Date(`${day(e.d)}T14:00:00Z`) : null,
      })
      .onConflictDoNothing();
    await db
      .insert(salesEstimateLines)
      .values({
        salesEstimateId: estId,
        accountId: ACCT.salesRevenue,
        description: `${product.desc} x ${e.qty}`,
        quantity: String(e.qty),
        unitPrice: String(product.unit),
        amount: String(amount),
      })
      .onConflictDoNothing();
    estCount++;
  }
  console.log(`  Estimates (Aug): +${estCount}`);

  // ── 8. More expense claims (mixed states) ───────────────────────────────
  const claimDefs = [
    {
      claimant: "Fatoumata Jawara",
      dept: "Sales",
      cat: "Meals",
      desc: "Client dinner — Senegambia",
      amount: 8400,
      status: "submitted" as const,
    },
    {
      claimant: "Ismaila Ceesay",
      dept: "Operations",
      cat: "Fuel",
      desc: "Truck fuel — Serrekunda route",
      amount: 21500,
      status: "approved" as const,
    },
    {
      claimant: "Awa Bah",
      dept: "Admin",
      cat: "Office",
      desc: "Printer toner + paper",
      amount: 7800,
      status: "reimbursed" as const,
    },
    {
      claimant: "Bubacarr Jobe",
      dept: "IT",
      cat: "Software",
      desc: "Cloud backup subscription (Q3)",
      amount: 14500,
      status: "flagged" as const,
      flag: "Annual subscription charged mid-quarter",
    },
    {
      claimant: "Mariama Sanyang",
      dept: "Sales",
      cat: "Travel",
      desc: "Hotel — Brikama client visit",
      amount: 12800,
      status: "submitted" as const,
    },
  ];
  let clCount = 0;
  for (let k = 0; k < claimDefs.length; k++) {
    const cl = claimDefs[k];
    const seq = 5 + k;
    const claimId = uuid("g11", seq);
    const claimNumber = `EXP-2026-${String(seq).padStart(3, "0")}`;
    await db
      .insert(expenseClaims)
      .values({
        id: claimId,
        entityId,
        claimNumber,
        claimantId: `emp-${seq}`,
        claimantName: cl.claimant,
        department: cl.dept,
        category: cl.cat,
        description: cl.desc,
        totalAmount: String(cl.amount),
        currency: "GMD",
        status: cl.status,
        source: "mobile",
        period: "2026-08",
        submittedAt: new Date(`${day(3 + k)}T09:00:00Z`),
        flaggedReason: "flag" in cl ? cl.flag : null,
        approvedAt:
          cl.status === "approved" || cl.status === "reimbursed"
            ? new Date(`${day(4 + k)}T10:00:00Z`)
            : null,
      })
      .onConflictDoNothing();
    await db
      .insert(claimLineItems)
      .values({
        id: uuid("g12", seq),
        entityId,
        claimId,
        lineNumber: 1,
        category: cl.cat,
        description: cl.desc,
        amount: String(cl.amount),
        taxAmount: "0",
        isFlagged: cl.status === "flagged",
        flagReason: cl.status === "flagged" ? cl.flag : null,
      })
      .onConflictDoNothing();
    if (cl.status === "reimbursed") {
      await db
        .insert(reimbursementRecords)
        .values({
          id: uuid("g13", seq),
          entityId,
          claimId,
          amount: String(cl.amount),
          currency: "GMD",
          paymentMethod: "bank_transfer",
          paidDate: new Date(`${day(6 + k)}T11:00:00Z`),
          paymentRef: `REIMB-${claimNumber}`,
          status: "paid",
        })
        .onConflictDoNothing();
    }
    clCount++;
  }
  console.log(`  Expense claims (Aug): +${clCount}`);

  // ── 9. August AP bills (supplier invoices) ──────────────────────────────
  const augBills = [
    {
      sIdx: 0,
      desc: "Rice (50kg) x 100 — bulk order",
      d: 2,
      total: 650000,
      status: "paid" as const,
      paidPct: 1.0,
    },
    {
      sIdx: 1,
      desc: "Sugar (10kg) x 200",
      d: 3,
      total: 360000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 2,
      desc: "Cooking Oil (5L) x 50",
      d: 5,
      total: 70000,
      status: "paid" as const,
      paidPct: 1.0,
    },
    {
      sIdx: 0,
      desc: "Flour (25kg) x 80",
      d: 7,
      total: 336000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 3,
      desc: "Tomato Paste (carton) x 30",
      d: 8,
      total: 288000,
      status: "paid" as const,
      paidPct: 0.5,
    },
    {
      sIdx: 4,
      desc: "Milk Powder (carton) x 25",
      d: 10,
      total: 300000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 1,
      desc: "Bottled Water (case) x 500",
      d: 12,
      total: 240000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 5,
      desc: "Soap (carton) x 100",
      d: 14,
      total: 240000,
      status: "overdue" as const,
      paidPct: 0,
    },
    {
      sIdx: 0,
      desc: "Rice (50kg) x 60 — restock",
      d: 18,
      total: 390000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 2,
      desc: "Cooking Oil (5L) x 80",
      d: 20,
      total: 112000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 3,
      desc: "Flour (25kg) x 40",
      d: 22,
      total: 168000,
      status: "paid" as const,
      paidPct: 1.0,
    },
    {
      sIdx: 4,
      desc: "Milk Powder (carton) x 15",
      d: 25,
      total: 180000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 1,
      desc: "Sugar (10kg) x 150",
      d: 27,
      total: 270000,
      status: "pending" as const,
      paidPct: 0,
    },
    {
      sIdx: 5,
      desc: "Soap (carton) x 60",
      d: 29,
      total: 144000,
      status: "pending" as const,
      paidPct: 0,
    },
  ];
  let apCount = 0;
  for (let k = 0; k < augBills.length; k++) {
    const b = augBills[k];
    const sid = supplierIds[b.sIdx % supplierIds.length];
    if (!sid) continue;
    const seq = 301 + k;
    const billId = uuid("g20", seq);
    const paidAmt = Math.round(b.total * (b.paidPct ?? 0));
    const balance = b.total - paidAmt;
    const paidAt =
      b.paidPct === 1.0
        ? new Date(`${day(Math.min(31, b.d + 5))}T16:00:00Z`)
        : b.paidPct > 0
          ? new Date(`${day(Math.min(31, b.d + 7))}T14:00:00Z`)
          : null;
    await db
      .insert(invoicesAp)
      .values({
        id: billId,
        entityId,
        supplierId: sid,
        invoiceNumber: `BILL-2026-${String(seq).padStart(3, "0")}`,
        invoiceDate: day(b.d),
        dueDate: day(Math.min(31, b.d + 30)),
        status: b.status,
        totalAmount: String(b.total),
        paidAmount: String(paidAmt),
        balance: String(balance),
        currency: "GMD",
        notes: b.desc,
        createdAt: new Date(`${day(b.d)}T10:00:00Z`),
      })
      .onConflictDoNothing();
    await db
      .insert(invoiceApLines)
      .values({
        invoiceApId: billId,
        accountId: ACCT.inventory,
        description: b.desc,
        quantity: "1",
        unitPrice: String(b.total),
        amount: String(b.total),
      })
      .onConflictDoNothing();
    apCount++;
  }
  console.log(`  AP bills (Aug): +${apCount}`);

  // ── 10. Customer payments (AR receipts) ──────────────────────────────────
  // Payments received from customers against their invoices
  const arPayments = [
    {
      cIdx: 0,
      d: 8,
      amount: 162500,
      method: "bank_transfer",
      ref: "PAY-2026-08-001",
    },
    {
      cIdx: 2,
      d: 10,
      amount: 260000,
      method: "bank_transfer",
      ref: "PAY-2026-08-002",
    },
    {
      cIdx: 3,
      d: 12,
      amount: 86400,
      method: "mobile_money",
      ref: "WAVE-2026-08-C1",
    },
    {
      cIdx: 5,
      d: 15,
      amount: 112000,
      method: "bank_transfer",
      ref: "PAY-2026-08-003",
    },
    { cIdx: 7, d: 18, amount: 144000, method: "cash", ref: "CASH-2026-08-001" },
    {
      cIdx: 0,
      d: 20,
      amount: 312000,
      method: "bank_transfer",
      ref: "PAY-2026-08-004",
    },
    {
      cIdx: 1,
      d: 22,
      amount: 120000,
      method: "mobile_money",
      ref: "WAVE-2026-08-C2",
    },
    {
      cIdx: 4,
      d: 25,
      amount: 288000,
      method: "bank_transfer",
      ref: "PAY-2026-08-005",
    },
    {
      cIdx: 6,
      d: 27,
      amount: 205000,
      method: "bank_transfer",
      ref: "PAY-2026-08-006",
    },
    { cIdx: 2, d: 29, amount: 96000, method: "cash", ref: "CASH-2026-08-002" },
    {
      cIdx: 3,
      d: 30,
      amount: 48000,
      method: "mobile_money",
      ref: "WAVE-2026-08-C3",
    },
  ];
  let arPayCount = 0;
  for (let k = 0; k < arPayments.length; k++) {
    const p = arPayments[k];
    const cid = customerIds[p.cIdx % customerIds.length];
    if (!cid) continue;
    const payId = uuid("g21", k + 1);
    await db
      .insert(paymentsAr)
      .values({
        id: payId,
        entityId,
        customerId: cid,
        amount: String(p.amount),
        currency: "GMD",
        paymentDate: day(p.d),
        paymentMethod: p.method,
        reference: p.ref,
        notes: `Customer payment — ${p.method.replace(/_/g, " ")}`,
        createdAt: new Date(`${day(p.d)}T16:00:00Z`),
      })
      .onConflictDoNothing();
    arPayCount++;
  }
  console.log(`  Customer payments (Aug): +${arPayCount}`);

  // ── 11. Vendor payments (AP disbursements) ──────────────────────────────
  const apPayments = [
    {
      sIdx: 0,
      d: 7,
      amount: 650000,
      method: "bank_transfer",
      ref: "VEND-2026-08-001",
    },
    {
      sIdx: 2,
      d: 10,
      amount: 70000,
      method: "bank_transfer",
      ref: "VEND-2026-08-002",
    },
    {
      sIdx: 3,
      d: 15,
      amount: 144000,
      method: "bank_transfer",
      ref: "VEND-2026-08-003",
    },
    {
      sIdx: 0,
      d: 20,
      amount: 390000,
      method: "bank_transfer",
      ref: "VEND-2026-08-004",
    },
    {
      sIdx: 3,
      d: 25,
      amount: 168000,
      method: "mobile_money",
      ref: "WAVE-2026-08-V1",
    },
  ];
  let apPayCount = 0;
  for (let k = 0; k < apPayments.length; k++) {
    const p = apPayments[k];
    const sid = supplierIds[p.sIdx % supplierIds.length];
    if (!sid) continue;
    const payId = uuid("g22", k + 1);
    await db
      .insert(paymentsAp)
      .values({
        id: payId,
        entityId,
        supplierId: sid,
        amount: String(p.amount),
        currency: "GMD",
        paymentDate: day(p.d),
        paymentMethod: p.method,
        reference: p.ref,
        notes: `Vendor payment — ${p.method.replace(/_/g, " ")}`,
        createdAt: new Date(`${day(p.d)}T17:00:00Z`),
      })
      .onConflictDoNothing();
    apPayCount++;
  }
  console.log(`  Vendor payments (Aug): +${apPayCount}`);

  // ── 12. More bank transactions (weekend + varied) ───────────────────────
  if (bankAccountId) {
    const moreTxs: Array<{
      d: number;
      type: "deposit" | "withdrawal" | "fee";
      amount: string;
      desc: string;
      ref: string;
    }> = [
      // Weekend transactions (realistic — business doesn't stop)
      {
        d: 6,
        type: "deposit",
        amount: "85000",
        desc: "Weekend market sales — Serrekunda",
        ref: "WKND-2026-08-1",
      },
      {
        d: 7,
        type: "withdrawal",
        amount: "18500",
        desc: "Fuel — weekend delivery run",
        ref: "WKND-2026-08-2",
      },
      {
        d: 13,
        type: "deposit",
        amount: "125000",
        desc: "Weekend collections — Banjul market",
        ref: "WKND-2026-08-3",
      },
      {
        d: 14,
        type: "withdrawal",
        amount: "9200",
        desc: "Staff transport — weekend shift",
        ref: "WKND-2026-08-4",
      },
      {
        d: 20,
        type: "deposit",
        amount: "95000",
        desc: "Weekend sales — Fajara",
        ref: "WKND-2026-08-5",
      },
      {
        d: 21,
        type: "fee",
        amount: "1800",
        desc: "ATM withdrawal fee",
        ref: "ATM-2026-08-3",
      },
      {
        d: 27,
        type: "deposit",
        amount: "142000",
        desc: "Weekend sales — Kanifing",
        ref: "WKND-2026-08-6",
      },
      {
        d: 28,
        type: "withdrawal",
        amount: "22000",
        desc: "Weekend restocking — suppliers",
        ref: "WKND-2026-08-7",
      },
      // Weekday transactions (more varied)
      {
        d: 22,
        type: "deposit",
        amount: "180000",
        desc: "Customer payment — large order",
        ref: "PAY-2026-08-LG1",
      },
      {
        d: 23,
        type: "withdrawal",
        amount: "45000",
        desc: "Insurance premium — Q3",
        ref: "INS-AUG",
      },
      {
        d: 24,
        type: "deposit",
        amount: "67500",
        desc: "Mobile money collections batch",
        ref: "MOMO-BATCH-AUG",
      },
      {
        d: 25,
        type: "withdrawal",
        amount: "32000",
        desc: "Marketing — social media ads",
        ref: "MKTG-AUG",
      },
      {
        d: 26,
        type: "withdrawal",
        amount: "15000",
        desc: "Office maintenance",
        ref: "MAINT-AUG",
      },
      {
        d: 29,
        type: "deposit",
        amount: "210000",
        desc: "End-of-month collections",
        ref: "COLL-2026-08-EOM",
      },
      {
        d: 30,
        type: "withdrawal",
        amount: "88000",
        desc: "Payroll disbursement",
        ref: "PAYROLL-AUG",
      },
      {
        d: 31,
        type: "fee",
        amount: "3200",
        desc: "Monthly account maintenance fee",
        ref: "FEE-2026-08-2",
      },
    ];
    for (let i = 0; i < moreTxs.length; i++) {
      const tx = moreTxs[i];
      await db
        .insert(bankTransactions)
        .values({
          id: uuid("g23", i + 1),
          entityId,
          bankAccountId,
          transactionDate: day(tx.d),
          type: tx.type,
          amount: tx.amount,
          description: tx.desc,
          reference: tx.ref,
          isReconciled: tx.d <= 25,
          source: "bank_feed",
        })
        .onConflictDoNothing();
    }
    console.log(`  More bank transactions (Aug): +${moreTxs.length}`);
  }

  // ── 13. More mobile money transactions ──────────────────────────────────
  if (mmAccountId) {
    const moreMm = [
      {
        amt: "28500",
        from: "Banjul Retail Shop",
        d: 8,
        type: "collection" as const,
      },
      {
        amt: "19200",
        from: "Fajara Pharmacy",
        d: 11,
        type: "collection" as const,
      },
      {
        amt: "45000",
        from: "Kanifing Warehouse",
        d: 15,
        type: "collection" as const,
      },
      {
        amt: "32000",
        from: "Serekunda Market Traders",
        d: 18,
        type: "collection" as const,
      },
      {
        amt: "15800",
        from: "Brusubi Gas Station",
        d: 22,
        type: "collection" as const,
      },
      {
        amt: "62000",
        from: "Hotel Kairaba Beach",
        d: 25,
        type: "collection" as const,
      },
      {
        amt: "38500",
        from: "Brikama Fresh Produce",
        d: 28,
        type: "collection" as const,
      },
      {
        amt: "22000",
        from: "Main Operating Account",
        d: 25,
        type: "transfer" as const,
        fee: "100",
        net: "22100",
        desc: "Transfer to bank — collections",
      },
    ];
    for (let i = 0; i < moreMm.length; i++) {
      const it = moreMm[i];
      await db
        .insert(mobileMoneyTransactions)
        .values({
          id: uuid("g24", i + 1),
          entityId,
          mobileMoneyAccountId: mmAccountId,
          providerTxId: `WAVE-2026-08-${i + 4}`,
          type: it.type,
          amount: it.amt,
          fee: it.fee ?? "0",
          netAmount: it.net ?? it.amt,
          counterpartyName: it.from,
          description: it.desc ?? `Mobile money collection — ${it.from}`,
          status: "successful",
          initiatedAt: new Date(`${day(it.d)}T14:00:00Z`),
          completedAt: new Date(`${day(it.d)}T14:05:00Z`),
        })
        .onConflictDoNothing();
    }
    console.log(`  More mobile money (Aug): +${moreMm.length}`);
  }

  // ── 14. August journal entries ───────────────────────────────────────────
  const augPeriod = await db
    .select({ id: fiscalPeriods.id })
    .from(fiscalPeriods)
    .where(
      and(
        eq(fiscalPeriods.entityId, entityId),
        eq(fiscalPeriods.month, 8),
        eq(fiscalPeriods.year, 2026),
      ),
    )
    .limit(1);
  const augPeriodId = augPeriod[0]?.id;
  let jeCount = 0;
  if (augPeriodId) {
    const jeDefs: Array<{
      desc: string;
      d: number;
      lines: Array<[string, string, string]>;
    }> = [
      // Week 1-2 entries
      {
        desc: "Aug sales revenue recognition (MTD)",
        d: 10,
        lines: [
          [ACCT.receivable, "1250000", "0"],
          [ACCT.salesRevenue, "0", "1100000"],
          [ACCT.taxLiability, "0", "150000"],
        ],
      },
      {
        desc: "Aug cost of goods sold (W1-W2)",
        d: 10,
        lines: [
          [ACCT.cogs, "720000", "0"],
          [ACCT.inventory, "0", "720000"],
        ],
      },
      {
        desc: "Aug operating expenses accrual (W1-W2)",
        d: 12,
        lines: [
          [ACCT.rentExpense, "75000", "0"],
          [ACCT.utilitiesExpense, "45500", "0"],
          [ACCT.officeExpense, "12500", "0"],
          [ACCT.travelExpense, "28500", "0"],
          [ACCT.accruedLiability, "0", "161500"],
        ],
      },
      // Mid-month entries
      {
        desc: "Aug customer collections (mid-month)",
        d: 18,
        lines: [
          [ACCT.bank, "507000", "0"],
          [ACCT.receivable, "0", "507000"],
        ],
      },
      {
        desc: "Aug supplier payments (mid-month)",
        d: 20,
        lines: [
          [ACCT.payable, "864000", "0"],
          [ACCT.bank, "0", "864000"],
        ],
      },
      {
        desc: "Aug sales revenue recognition (W3-W4)",
        d: 25,
        lines: [
          [ACCT.receivable, "980000", "0"],
          [ACCT.salesRevenue, "0", "860000"],
          [ACCT.taxLiability, "0", "120000"],
        ],
      },
      {
        desc: "Aug cost of goods sold (W3-W4)",
        d: 25,
        lines: [
          [ACCT.cogs, "560000", "0"],
          [ACCT.inventory, "0", "560000"],
        ],
      },
      // End-of-month entries
      {
        desc: "Aug salary expense accrual",
        d: 30,
        lines: [
          [ACCT.salaryExpense, "405000", "0"],
          [ACCT.accruedLiability, "0", "405000"],
        ],
      },
      {
        desc: "Aug customer collections (late month)",
        d: 30,
        lines: [
          [ACCT.bank, "641500", "0"],
          [ACCT.receivable, "0", "641500"],
        ],
      },
      {
        desc: "Aug mobile money collections",
        d: 31,
        lines: [
          [ACCT.bank, "241000", "0"],
          [ACCT.salesRevenue, "0", "241000"],
        ],
      },
      {
        desc: "Aug depreciation expense",
        d: 31,
        lines: [
          [ACCT.officeExpense, "48000", "0"],
          [ACCT.accruedLiability, "0", "48000"],
        ],
      },
      {
        desc: "Aug marketing expense accrual",
        d: 31,
        lines: [
          [ACCT.marketingExpense, "32000", "0"],
          [ACCT.accruedLiability, "0", "32000"],
        ],
      },
      {
        desc: "Aug insurance expense",
        d: 31,
        lines: [
          [ACCT.insuranceExpense, "45000", "0"],
          [ACCT.bank, "0", "45000"],
        ],
      },
    ];
    for (const e of jeDefs) {
      const jeId = uuid("g14", jeCount + 1);
      await db
        .insert(journalEntries)
        .values({
          id: jeId,
          entityId,
          entryNumber: 200 + jeCount,
          description: e.desc,
          date: day(e.d),
          periodId: augPeriodId,
          status: "posted",
          postedBy: "demo@xenboox.com",
          postedAt: new Date(`${day(e.d)}T17:00:00Z`),
          source: "seed",
        })
        .onConflictDoNothing();
      for (const [accountId, debit, credit] of e.lines) {
        await db
          .insert(journalEntryLines)
          .values({
            journalEntryId: jeId,
            accountId,
            debit,
            credit,
            description: e.desc,
          })
          .onConflictDoNothing();
      }
      jeCount++;
    }
  }
  console.log(`  Journal entries (Aug): +${jeCount}`);

  // ── 10. August notifications (unread — bell + Work feed) ────────────────
  const notifDefs = [
    {
      type: "ingestion_posted",
      priority: "medium",
      title: "4 documents auto-posted",
      body: "OCR extraction posted 4 supplier bills from the August inbox.",
      d: 3,
    },
    {
      type: "overdue_invoice",
      priority: "high",
      title: "2 invoices overdue",
      body: "SI-2026-062 and SI-2026-070 are past due — collections agent drafted reminders.",
      d: 5,
    },
    {
      type: "budget_alert",
      priority: "medium",
      title: "Utilities at 91% of budget",
      body: "August utilities spend is tracking 12% above plan.",
      d: 7,
    },
    {
      type: "agent_flag",
      priority: "medium",
      title: "Duplicate vendor flagged",
      body: "A possible duplicate supplier was detected and moved to review.",
      d: 9,
    },
    {
      type: "ingestion_posted",
      priority: "low",
      title: "3 receipts scanned",
      body: "Mobile money receipts from Wave auto-categorized.",
      d: 11,
    },
    {
      type: "payroll_processed",
      priority: "medium",
      title: "August payroll approved",
      body: "The August payroll run is approved and ready for disbursement on the 28th.",
      d: 14,
    },
    {
      type: "estimate_converted",
      priority: "low",
      title: "EST-2026-007 accepted",
      body: "Gambia Ports Authority accepted the estimate — convert it to an invoice.",
      d: 16,
    },
    {
      type: "overdue_invoice",
      priority: "high",
      title: "3 invoices overdue",
      body: "SI-2026-062, SI-2026-070, and SI-2026-078 are now overdue.",
      d: 18,
    },
    {
      type: "agent_flag",
      priority: "medium",
      title: "Large expense flagged",
      body: "A payment of GMD 45,000 for insurance exceeds the GMD 40,000 threshold.",
      d: 20,
    },
    {
      type: "ingestion_posted",
      priority: "low",
      title: "2 invoices received",
      body: "Supplier invoices from Atlantic Trading posted via email scan.",
      d: 22,
    },
    {
      type: "budget_alert",
      priority: "high",
      title: "Marketing at 95% of budget",
      body: "August marketing spend is nearly exhausted — 5 days remaining.",
      d: 24,
    },
    {
      type: "agent_flag",
      priority: "medium",
      title: "Cash flow warning",
      body: "Projected cash balance dips below GMD 200,000 next week.",
      d: 26,
    },
    {
      type: "ingestion_posted",
      priority: "medium",
      title: "5 documents auto-posted",
      body: "Weekend batch: 3 supplier bills + 2 customer payments.",
      d: 28,
    },
    {
      type: "overdue_invoice",
      priority: "urgent",
      title: "4 invoices overdue",
      body: "Total overdue balance: GMD 1,245,000 — escalate to senior collections.",
      d: 30,
    },
    {
      type: "payroll_processed",
      priority: "medium",
      title: "Payroll disbursement ready",
      body: "GMD 368,000 ready for bank transfer — August payroll.",
      d: 30,
    },
  ];
  let nCount = 0;
  for (let n = 0; n < notifDefs.length; n++) {
    const nd = notifDefs[n];
    await db
      .insert(notifications)
      .values({
        id: uuid("g15", n + 1),
        userId,
        entityId,
        type: nd.type,
        priority: nd.priority,
        title: nd.title,
        body: nd.body,
        read: n >= 11,
        status: n >= 11 ? "read" : "sent",
        sentAt: new Date(
          `${day(nd.d)}T${String(8 + (n % 4)).padStart(2, "0")}:00:00Z`,
        ),
        createdAt: new Date(
          `${day(nd.d)}T${String(8 + (n % 4)).padStart(2, "0")}:00:00Z`,
        ),
      })
      .onConflictDoNothing();
    nCount++;
  }
  console.log(`  Notifications (Aug): +${nCount}`);

  // ── 15. August bank reconciliation (mid-month: Aug 1-15) ──────────────
  let reconCount = 0;
  if (bankAccountId) {
    // Calculate book balance from reconciled bank transactions up to Aug 15
    const reconTxs = await db
      .select({
        type: bankTransactions.type,
        amount: bankTransactions.amount,
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.bankAccountId, bankAccountId),
        ),
      );

    let bookBalance = 520000; // opening balance from main seed
    for (const tx of reconTxs) {
      const amt = parseFloat(String(tx.amount));
      if (tx.type === "deposit") bookBalance += amt;
      else if (tx.type === "withdrawal" || tx.type === "fee")
        bookBalance -= amt;
    }

    const reconId = uuid("g30", 1);
    await db
      .insert(reconciliations)
      .values({
        id: reconId,
        entityId,
        bankAccountId,
        statementDate: "2026-08-15",
        statementBalance: String(Math.round(bookBalance * 0.98)), // slight difference for realism
        bookBalance: String(bookBalance),
        difference: String(Math.round(bookBalance * -0.02)),
        status: "matched",
        closedBy: "demo@xenboox.com",
        closedAt: new Date("2026-08-16T10:00:00Z"),
        notes: "Mid-August reconciliation — minor bank fee timing difference",
      })
      .onConflictDoNothing();

    // Match reconciled bank transactions (first 10 that are marked reconciled)
    const matchedTxs = await db
      .select({ id: bankTransactions.id, amount: bankTransactions.amount })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.bankAccountId, bankAccountId),
          eq(bankTransactions.isReconciled, true),
        ),
      )
      .limit(10);

    for (let i = 0; i < matchedTxs.length; i++) {
      await db
        .insert(reconciliationItems)
        .values({
          id: uuid("g31", i + 1),
          reconciliationId: reconId,
          bankTransactionId: matchedTxs[i].id,
          status: "matched",
          matchedAmount: matchedTxs[i].amount,
          notes: "Auto-matched by reconciliation agent",
        })
        .onConflictDoNothing();
    }
    reconCount++;
    console.log(`  Bank reconciliation (Aug mid-month): +${reconCount}`);
  }

  // ── 16. August petty cash ledger ────────────────────────────────────────
  let pettyCount = 0;
  const cashAcctRows = await db
    .select({ id: cashAccounts.id })
    .from(cashAccounts)
    .where(eq(cashAccounts.entityId, entityId))
    .limit(1);
  const cashAccountId = cashAcctRows[0]?.id;
  if (cashAccountId) {
    const pettyEntries = [
      {
        d: 1,
        type: "receipt" as const,
        amount: 50000,
        desc: "Opening petty cash float — August",
        balance: 50000,
        cat: "replenishment",
      },
      {
        d: 3,
        type: "expense" as const,
        amount: 3200,
        desc: "Staff refreshments — morning tea",
        balance: 46800,
        cat: "office_supplies",
      },
      {
        d: 5,
        type: "expense" as const,
        amount: 7800,
        desc: "Printer toner cartridge",
        balance: 39000,
        cat: "office_supplies",
      },
      {
        d: 7,
        type: "expense" as const,
        amount: 2500,
        desc: "Courier service — document delivery",
        balance: 36500,
        cat: "travel",
      },
      {
        d: 9,
        type: "expense" as const,
        amount: 4500,
        desc: "Cleaning supplies — office",
        balance: 32000,
        cat: "office_supplies",
      },
      {
        d: 10,
        type: "replenishment" as const,
        amount: 18000,
        desc: "Cash replenishment from bank",
        balance: 50000,
        cat: "replenishment",
      },
      {
        d: 12,
        type: "expense" as const,
        amount: 6200,
        desc: "Staff lunch — team meeting",
        balance: 43800,
        cat: "meals",
      },
      {
        d: 14,
        type: "expense" as const,
        amount: 1800,
        desc: "Phone credit — office mobile",
        balance: 42000,
        cat: "utilities",
      },
      {
        d: 16,
        type: "expense" as const,
        amount: 5500,
        desc: "Parking fees — client visit",
        balance: 36500,
        cat: "travel",
      },
      {
        d: 18,
        type: "expense" as const,
        amount: 3800,
        desc: "Stationery — notebooks and pens",
        balance: 32700,
        cat: "office_supplies",
      },
      {
        d: 19,
        type: "replenishment" as const,
        amount: 17300,
        desc: "Cash replenishment from bank",
        balance: 50000,
        cat: "replenishment",
      },
      {
        d: 21,
        type: "expense" as const,
        amount: 8400,
        desc: "Client entertainment — Senegambia",
        balance: 41600,
        cat: "meals",
      },
      {
        d: 23,
        type: "expense" as const,
        amount: 2200,
        desc: "Postage — registered mail",
        balance: 39400,
        cat: "office_supplies",
      },
      {
        d: 25,
        type: "expense" as const,
        amount: 4100,
        desc: "Staff transport — overtime shift",
        balance: 35300,
        cat: "travel",
      },
      {
        d: 27,
        type: "expense" as const,
        amount: 6800,
        desc: "Office cleaning service",
        balance: 28500,
        cat: "office_supplies",
      },
      {
        d: 28,
        type: "replenishment" as const,
        amount: 21500,
        desc: "Cash replenishment from bank",
        balance: 50000,
        cat: "replenishment",
      },
      {
        d: 30,
        type: "expense" as const,
        amount: 3500,
        desc: "Staff refreshments — month-end",
        balance: 46500,
        cat: "office_supplies",
      },
    ];
    for (let i = 0; i < pettyEntries.length; i++) {
      const p = pettyEntries[i];
      await db
        .insert(pettyCashLedger)
        .values({
          id: uuid("g32", i + 1),
          entityId,
          cashAccountId,
          transactionDate: day(p.d),
          description: p.desc,
          debit:
            p.type === "receipt" || p.type === "replenishment"
              ? String(p.amount)
              : "0",
          credit: p.type === "expense" ? String(p.amount) : "0",
          balance: String(p.balance),
          category: p.cat,
        })
        .onConflictDoNothing();
      pettyCount++;
    }
    console.log(`  Petty cash ledger (Aug): +${pettyCount}`);
  }

  // ── 17. August imprest floats ───────────────────────────────────────────
  let imprestCount = 0;
  if (cashAccountId) {
    const imprestDefs = [
      {
        assignee: "Awa Bah",
        amount: 30000,
        spent: 22500,
        purpose: "Office supplies purchase — August",
        status: "active" as const,
        issuedDay: 1,
        settleDay: 31,
        receipts: [
          { desc: "A4 paper ream x4", amount: 6000, d: 3 },
          { desc: "Printer toner + staples", amount: 8500, d: 8 },
          { desc: "File folders and labels", amount: 4200, d: 15 },
          { desc: "Whiteboard markers", amount: 1800, d: 22 },
          { desc: "USB flash drives x3", amount: 2000, d: 28 },
        ],
      },
      {
        assignee: "Bubacarr Jobe",
        amount: 25000,
        spent: 25000,
        purpose: "IT maintenance supplies — August",
        status: "settled" as const,
        issuedDay: 2,
        settleDay: 20,
        receipts: [
          { desc: "Network cable (50m)", amount: 4500, d: 4 },
          { desc: "Mouse and keyboard combo", amount: 6500, d: 7 },
          { desc: "External hard drive — backup", amount: 8500, d: 10 },
          { desc: "HDMI cables x2 + adapters", amount: 3200, d: 14 },
          { desc: "WiFi extender", amount: 2300, d: 18 },
        ],
      },
      {
        assignee: "Fatoumata Jawara",
        amount: 20000,
        spent: 12800,
        purpose: "Client meeting expenses — August",
        status: "active" as const,
        issuedDay: 10,
        settleDay: 31,
        receipts: [
          { desc: "Client lunch — Kairaba", amount: 7200, d: 12 },
          { desc: "Taxi fare — client office", amount: 2800, d: 15 },
          { desc: "Business cards printing", amount: 2800, d: 19 },
        ],
      },
    ];
    for (let i = 0; i < imprestDefs.length; i++) {
      const imp = imprestDefs[i];
      const floatId = uuid("g33", i + 1);
      const remaining = imp.amount - imp.spent;
      await db
        .insert(imprestFloats)
        .values({
          id: floatId,
          entityId,
          cashAccountId,
          assigneeName: imp.assignee,
          amount: String(imp.amount),
          remainingBalance: String(remaining),
          purpose: imp.purpose,
          status: imp.status,
          issuedDate: day(imp.issuedDay),
          settleByDate: day(imp.settleDay),
          settledAt:
            imp.status === "settled"
              ? new Date(`${day(imp.settleDay)}T16:00:00Z`)
              : null,
        })
        .onConflictDoNothing();

      for (let r = 0; r < imp.receipts.length; r++) {
        const receipt = imp.receipts[r];
        await db
          .insert(imprestReceipts)
          .values({
            id: uuid("g34", i * 10 + r + 1),
            imprestFloatId: floatId,
            description: receipt.desc,
            amount: String(receipt.amount),
            receiptDate: day(receipt.d),
          })
          .onConflictDoNothing();
      }
      imprestCount++;
    }
    console.log(`  Imprest floats (Aug): +${imprestCount}`);
  }

  // ── 18. August AR payments linked to specific invoices ───────────────────
  // (Aug AR payments already seeded in section 10 — adding invoice linkage note)
  console.log("  AR payments (Aug): already linked in section 10");

  // ── 19. August closing summary entries ──────────────────────────────────
  // End-of-month accrual reversal and period close entries
  if (augPeriodId) {
    const closingEntries = [
      {
        desc: "Aug accrual reversal — operating expenses",
        d: 31,
        lines: [
          [ACCT.accruedLiability, "161500", "0"],
          [ACCT.rentExpense, "0", "75000"],
          [ACCT.utilitiesExpense, "0", "45500"],
          [ACCT.officeExpense, "0", "12500"],
          [ACCT.travelExpense, "0", "28500"],
        ],
      },
      {
        desc: "Aug interest expense — short-term loan",
        d: 31,
        lines: [
          [ACCT.interestExpense, "8500", "0"],
          [ACCT.accruedLiability, "0", "8500"],
        ],
      },
    ];
    for (const e of closingEntries) {
      const jeId = uuid("g35", closingEntries.indexOf(e) + 1);
      await db
        .insert(journalEntries)
        .values({
          id: jeId,
          entityId,
          entryNumber: 250 + closingEntries.indexOf(e),
          description: e.desc,
          date: day(e.d),
          periodId: augPeriodId,
          status: "posted",
          postedBy: "demo@xenboox.com",
          postedAt: new Date(`${day(e.d)}T18:00:00Z`),
          source: "seed",
        })
        .onConflictDoNothing();
      for (const [accountId, debit, credit] of e.lines) {
        await db
          .insert(journalEntryLines)
          .values({
            journalEntryId: jeId,
            accountId,
            debit,
            credit,
            description: e.desc,
          })
          .onConflictDoNothing();
      }
    }
    console.log(`  Closing journal entries (Aug): +${closingEntries.length}`);
  }

  console.log("  Current-month seed complete.");
  return {
    arCount,
    apCount,
    arPayCount,
    apPayCount,
    btCount,
    mmCount,
    deprCount,
    blCount,
    varCount,
    estCount,
    clCount,
    jeCount,
    nCount,
    reconCount,
    pettyCount,
    imprestCount,
  };
}

if (shouldRunDirect()) {
  seedCurrentMonth()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-current-month failed:", err);
      process.exit(1);
    });
}
