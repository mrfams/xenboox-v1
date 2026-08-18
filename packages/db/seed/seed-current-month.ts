/**
 * Seed current-month activity + enrichment for demo@xenboox.com
 * (Kerr Jula Trading Co., Gambia / GMD).
 *
 * The six-month seed (Feb–Jul) and launch seed stop at July — this module
 * makes the demo feel LIVE by adding:
 *
 *   1. August 2026 AR invoices (open/overdue/paid mix) + lines
 *   2. August 2026 bank transactions (deposits, expenses, payroll, fee)
 *   3. August 2026 mobile money activity
 *   4. August 2026 payroll run (approved, awaiting disbursement)
 *   5. Depreciation schedule for EVERY active asset (Feb–Aug) — the
 *      Fixed Assets page renders the per-asset schedule, and only 5 of 24
 *      assets had one
 *   6. A full FY2026 operating budget with monthly lines + variance records
 *      (budget-vs-actual surfaces on Reports/Expenses)
 *   7. More estimates (EST-2026-006..010) in mixed states so the
 *      estimate-conversion + margin-review flows have material
 *   8. More expense claims (submitted / approved / flagged / reimbursed)
 *   9. August journal entries (revenue recognition, COGS, opex, salary)
 *  10. Fresh August notifications (unread) so the bell + Work feed show
 *      current activity
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
} from "../schema/ap-ar";
import { employees, payrollRuns, payrollLineItems } from "../schema/payroll";
import { bankAccounts, bankTransactions } from "../schema/treasury";
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
  const augSales = [
    { cIdx: 0, pIdx: 0, qty: 25, d: 4, status: "pending" as const },
    { cIdx: 1, pIdx: 5, qty: 10, d: 6, status: "pending" as const },
    { cIdx: 2, pIdx: 0, qty: 40, d: 8, status: "pending" as const },
    { cIdx: 3, pIdx: 6, qty: 180, d: 10, status: "pending" as const },
    { cIdx: 4, pIdx: 7, qty: 120, d: 12, status: "overdue" as const },
    { cIdx: 5, pIdx: 1, qty: 100, d: 14, status: "pending" as const },
    { cIdx: 6, pIdx: 0, qty: 70, d: 15, status: "pending" as const },
    { cIdx: 7, pIdx: 4, qty: 20, d: 16, status: "paid" as const },
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
    const paid = s.status === "paid" ? String(amount) : "0";
    await db
      .insert(salesInvoices)
      .values({
        id: invId,
        entityId,
        customerId: cid,
        invoiceNumber: `SI-2026-${String(seq).padStart(3, "0")}`,
        invoiceDate: day(s.d),
        dueDate: day(Math.min(28, s.d + 30)),
        status: s.status,
        totalAmount: String(amount),
        paidAmount: paid,
        balance: String(amount - parseFloat(paid)),
        currency: "GMD",
        sentAt: new Date(`${day(s.d)}T09:00:00Z`),
        notes:
          s.status === "overdue"
            ? "Overdue — follow up with collections agent"
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

  // ── 9. August journal entries ───────────────────────────────────────────
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
      {
        desc: "Aug sales revenue recognition (MTD)",
        d: 17,
        lines: [
          [ACCT.receivable, "882000", "0"],
          [ACCT.salesRevenue, "0", "750000"],
          [ACCT.taxLiability, "0", "132000"],
        ],
      },
      {
        desc: "Aug cost of goods sold",
        d: 17,
        lines: [
          [ACCT.cogs, "511560", "0"],
          [ACCT.inventory, "0", "511560"],
        ],
      },
      {
        desc: "Aug operating expenses accrual",
        d: 17,
        lines: [
          [ACCT.rentExpense, "75000", "0"],
          [ACCT.utilitiesExpense, "45500", "0"],
          [ACCT.officeExpense, "12500", "0"],
          [ACCT.travelExpense, "28500", "0"],
          [ACCT.accruedLiability, "0", "161500"],
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
    },
    {
      type: "overdue_invoice",
      priority: "high",
      title: "1 invoice overdue",
      body: "SI-2026-062 is past due — the collections agent drafted a reminder.",
    },
    {
      type: "budget_alert",
      priority: "medium",
      title: "Utilities at 91% of budget",
      body: "August utilities spend is tracking 12% above plan.",
    },
    {
      type: "payroll_processed",
      priority: "medium",
      title: "August payroll approved",
      body: "The August payroll run is approved and ready for disbursement on the 28th.",
    },
    {
      type: "agent_flag",
      priority: "medium",
      title: "Duplicate vendor flagged",
      body: "A possible duplicate supplier was detected and moved to review.",
    },
    {
      type: "estimate_converted",
      priority: "low",
      title: "EST-2026-007 accepted",
      body: "Gambia Ports Authority accepted the estimate — convert it to an invoice.",
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
        read: n >= 4,
        status: n >= 4 ? "read" : "sent",
        sentAt: new Date(`${day(16 - n)}T09:00:00Z`),
        createdAt: new Date(`${day(16 - n)}T09:00:00Z`),
      })
      .onConflictDoNothing();
    nCount++;
  }
  console.log(`  Notifications (Aug): +${nCount}`);

  console.log("  Current-month seed complete.");
  return {
    arCount,
    btCount,
    mmCount,
    deprCount,
    blCount,
    varCount,
    estCount,
    clCount,
    jeCount,
    nCount,
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
