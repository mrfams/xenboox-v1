/**
 * Seed 6 months of realistic operational data for demo@xenboox.com
 * (Kerr Jula Trading Co., Gambia / GMD).
 *
 * The base `seed()` creates the skeleton (COA, 3 customers, 3 suppliers,
 * handful of invoices, one payroll run, bank accounts, inventory). This
 * module deepens that into a company that looks like it has been running
 * since February 2026 — monthly AR/AP invoices with payments, monthly
 * payroll runs, bank + mobile money activity every month, estimates,
 * expense claims, documents, and monthly journal entries.
 *
 * Idempotent: every row uses a deterministic id (idFromKey) and
 * onConflictDoNothing, so re-running is safe. Runs AFTER seed() in
 * seed-all.ts so the entity (and its fresh child data) already exists.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import { organizations, entities } from "../schema/organization";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "../schema/accounting";
import {
  suppliers,
  customers,
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
} from "../schema/payroll";
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
import { documents } from "../schema/documents";
import { idFromKey, shouldRunDirect } from "./seed-lib";

// ─── Deterministic helpers ──────────────────────────────────────────────────

const A = (code: string) => idFromKey(`acct-${code}`);

// Account ids — MUST mirror packages/db/seed/index.ts so journal lines land
// on the same COA rows the base seed created.
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

const uuid = (type: string, n: number) => idFromKey(`${type}-${n}`);

// ─── Data ──────────────────────────────────────────────────────────────────

/** 8 more customers (base seed creates 3). */
const CUSTOMERS: Array<{
  name: string;
  email: string;
  phone: string;
  terms: string;
  creditLimit: string;
}> = [
  {
    name: "Gambia Food Distributors",
    email: "ap@gambiafood.gm",
    phone: "+2203301111",
    terms: "net30",
    creditLimit: "500000",
  },
  {
    name: "Coastal Fisheries Ltd",
    email: "finance@coastalfish.gm",
    phone: "+2203302222",
    terms: "net30",
    creditLimit: "400000",
  },
  {
    name: "Gambia Ports Authority",
    email: "procurement@gpa.gm",
    phone: "+2203303333",
    terms: "net45",
    creditLimit: "800000",
  },
  {
    name: "Hotel Kairaba Beach",
    email: "purchasing@kairababeach.gm",
    phone: "+2203304444",
    terms: "net30",
    creditLimit: "350000",
  },
  {
    name: "Senegambia Beach Hotel",
    email: "buyer@senegambiahotel.gm",
    phone: "+2203305555",
    terms: "net30",
    creditLimit: "350000",
  },
  {
    name: "Gambia Breweries",
    email: "supply@gambiabrew.gm",
    phone: "+2203306666",
    terms: "net15",
    creditLimit: "600000",
  },
  {
    name: "Ministry of Trade (GOTG)",
    email: "procurement@motie.gm",
    phone: "+2203307777",
    terms: "net60",
    creditLimit: "1200000",
  },
  {
    name: "Fajara Pharmacy",
    email: "orders@fajarapharmacy.gm",
    phone: "+2203308888",
    terms: "net30",
    creditLimit: "200000",
  },
];

/** 7 more suppliers (base seed creates 3). */
const SUPPLIERS: Array<{
  name: string;
  email: string;
  phone: string;
  terms: string;
}> = [
  {
    name: "Touba Import Export",
    email: "sales@toubaimport.sn",
    phone: "+2217711111",
    terms: "net30",
  },
  {
    name: "AgriGambia Produce",
    email: "orders@agrigambia.gm",
    phone: "+2204401111",
    terms: "net15",
  },
  {
    name: "Standard Chartered (Gambia)",
    email: "corp@scb.gm",
    phone: "+2204402222",
    terms: "net30",
  },
  {
    name: "Atlantic Fuels",
    email: "billing@atlanticfuels.gm",
    phone: "+2204403333",
    terms: "net30",
  },
  {
    name: "Banjul Cold Storage",
    email: "info@banjulcold.gm",
    phone: "+2204404444",
    terms: "net30",
  },
  {
    name: "Gambia Telecomm (GAMTEL)",
    email: "billing@gamtel.gm",
    phone: "+2204405555",
    terms: "net30",
  },
  {
    name: "West Coast Logistics",
    email: "freight@wcl.gm",
    phone: "+2204406666",
    terms: "net45",
  },
];

/** Monthly product mix for AR invoice lines (realistic trading goods). */
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

/** Monthly sales volume per customer (units of the product they buy). */
const MONTHLY_SALES: Array<{
  customerIdx: number;
  productIdx: number;
  qty: number;
}> = [
  { customerIdx: 0, productIdx: 0, qty: 30 },
  { customerIdx: 0, productIdx: 2, qty: 60 },
  { customerIdx: 1, productIdx: 5, qty: 12 },
  { customerIdx: 2, productIdx: 0, qty: 45 },
  { customerIdx: 3, productIdx: 6, qty: 200 },
  { customerIdx: 4, productIdx: 7, qty: 150 },
  { customerIdx: 5, productIdx: 1, qty: 120 },
  { customerIdx: 6, productIdx: 0, qty: 80 },
  { customerIdx: 7, productIdx: 4, qty: 25 },
];

const MONTHS = [
  { label: "Feb", year: 2026, month: 2, period: "2026-02" },
  { label: "Mar", year: 2026, month: 3, period: "2026-03" },
  { label: "Apr", year: 2026, month: 4, period: "2026-04" },
  { label: "May", year: 2026, month: 5, period: "2026-05" },
  { label: "Jun", year: 2026, month: 6, period: "2026-06" },
  { label: "Jul", year: 2026, month: 7, period: "2026-07" },
];

const day = (m: { year: number; month: number }, d: number) =>
  `${m.year}-${String(m.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Monthly operating expenses for the company (bank withdrawals). */
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

// ─── Seed ──────────────────────────────────────────────────────────────────

export async function seedSixMonths() {
  console.log("Seeding 6-month operational history (demo entity)...");

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

  // ── 1. Extra customers ──────────────────────────────────────────────────
  const customerIds: string[] = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const cid = uuid("a2", i + 4); // continue base-seed sequence (base used a2-1..3)
    customerIds.push(cid);
    const c = CUSTOMERS[i];
    await db
      .insert(customers)
      .values({
        id: cid,
        entityId,
        name: c.name,
        contactEmail: c.email,
        contactPhone: c.phone,
        paymentTerms: c.terms,
        creditLimit: c.creditLimit,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`  Customers: +${customerIds.length}`);

  // ── 2. Extra suppliers ──────────────────────────────────────────────────
  const supplierIds: string[] = [];
  for (let i = 0; i < SUPPLIERS.length; i++) {
    const sid = uuid("a1", i + 4); // continue base-seed sequence (base used a1-1..3)
    supplierIds.push(sid);
    const s = SUPPLIERS[i];
    await db
      .insert(suppliers)
      .values({
        id: sid,
        entityId,
        name: s.name,
        contactEmail: s.email,
        contactPhone: s.phone,
        paymentTerms: s.terms,
      })
      .onConflictDoNothing();
  }
  console.log(`  Suppliers: +${supplierIds.length}`);

  // ── 3. Monthly AR invoices (Feb–Jul) ────────────────────────────────────
  let arSeq = 4; // base seed created SI-2026-001..003 in June
  let arCount = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    // Customer invoice dates vary within the month; 6-9 invoices per month.
    for (let k = 0; k < MONTHLY_SALES.length; k++) {
      const sale = MONTHLY_SALES[k];
      const product = PRODUCTS[sale.productIdx];
      const amount = product.unit * sale.qty;
      const invDate = day(mon, 4 + ((k * 3) % 20));
      const invoiceNumber = `SI-2026-${String(arSeq).padStart(3, "0")}`;
      const cid = customerIds[sale.customerIdx];
      // Status: past months mostly paid, current month mixed.
      let status: "paid" | "pending" | "overdue";
      let paidAmount = "0";
      let dueDate = day(mon, Math.min(28, 4 + ((k * 3) % 20) + 30));
      if (m < MONTHS.length - 1) {
        status = "paid";
        paidAmount = String(amount);
        dueDate = day(mon, 20 + ((k * 3) % 8));
      } else {
        status = k % 3 === 0 ? "paid" : k % 3 === 1 ? "pending" : "overdue";
        paidAmount = status === "paid" ? String(amount) : "0";
        dueDate = day(mon, 20 + ((k * 3) % 8));
      }

      const invId = uuid("a4", arSeq);
      await db
        .insert(salesInvoices)
        .values({
          id: invId,
          entityId,
          customerId: cid,
          invoiceNumber,
          invoiceDate: invDate,
          dueDate,
          status,
          totalAmount: String(amount),
          paidAmount,
          balance: String(amount - parseFloat(paidAmount)),
          currency: "GMD",
          sentAt: new Date(`${invDate}T09:00:00Z`),
          notes:
            status === "overdue"
              ? "Overdue — follow up with collections agent"
              : null,
        })
        .onConflictDoNothing();

      await db
        .insert(salesInvoiceLines)
        .values({
          salesInvoiceId: invId,
          accountId: ACCT.salesRevenue,
          description: `${product.desc} x ${sale.qty}`,
          quantity: String(sale.qty),
          unitPrice: String(product.unit),
          amount: String(amount),
        })
        .onConflictDoNothing();

      arCount++;
      arSeq++;
    }
  }
  console.log(`  AR invoices: +${arCount}`);

  // ── 4. AR payments for paid invoices ────────────────────────────────────
  let arPaySeq = 1;
  let arPayCount = 0;
  const paidAr = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      totalAmount: salesInvoices.totalAmount,
    })
    .from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.status, "paid"),
      ),
    );
  for (const inv of paidAr) {
    // Derive the payment date from the invoice sequence (n maps to a month
    // via the 9-invoices-per-month cadence): payments land ~2 weeks after
    // the invoice is raised.
    const n = parseInt((inv.invoiceNumber ?? "").replace("SI-2026-", ""), 10);
    const monthIdx = Number.isNaN(n) ? 0 : Math.min(5, Math.floor((n - 4) / 9));
    const mon = MONTHS[Math.max(0, monthIdx)];
    const payDate = day(mon, 22);
    await db
      .insert(paymentsAr)
      .values({
        id: uuid("b8", arPaySeq),
        entityId,
        salesInvoiceId: inv.id,
        amount: inv.totalAmount,
        paymentDate: payDate,
        method: "bank_transfer",
        reference: `PMT-${inv.invoiceNumber}`,
        confirmedAt: new Date(`${payDate}T10:00:00Z`),
        notes: "Auto-confirmed payment",
      })
      .onConflictDoNothing();
    arPaySeq++;
    arPayCount++;
  }
  console.log(`  AR payments: +${arPayCount}`);

  // ── 5. Monthly AP invoices + PO-less bills ──────────────────────────────
  const apData = [
    { supplierIdx: 0, productIdx: 0, qty: 50, dayOfMonth: 6 },
    { supplierIdx: 1, productIdx: 1, qty: 80, dayOfMonth: 8 },
    { supplierIdx: 2, productIdx: 4, qty: 30, dayOfMonth: 11 },
    { supplierIdx: 3, productIdx: 6, qty: 300, dayOfMonth: 15 },
    { supplierIdx: 4, productIdx: 5, qty: 20, dayOfMonth: 17 },
    { supplierIdx: 5, productIdx: 7, qty: 100, dayOfMonth: 21 },
  ];
  let apSeq = 4; // base seed created INV-2026-001..003
  let apCount = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    for (const ap of apData) {
      const product = PRODUCTS[ap.productIdx];
      const amount = product.unit * ap.qty;
      const invoiceNumber = `INV-2026-${String(apSeq).padStart(3, "0")}`;
      const invDate = day(mon, ap.dayOfMonth);
      const dueDate = day(mon, Math.min(28, ap.dayOfMonth + 30));
      let status: "paid" | "pending";
      let paidAmount = "0";
      if (m < MONTHS.length - 1) {
        status = "paid";
        paidAmount = String(amount);
      } else {
        status = apSeq % 2 === 0 ? "paid" : "pending";
        paidAmount = status === "paid" ? String(amount) : "0";
      }
      const invId = uuid("a3", apSeq);
      await db
        .insert(invoicesAp)
        .values({
          id: invId,
          entityId,
          supplierId: supplierIds[ap.supplierIdx],
          invoiceNumber,
          invoiceDate: invDate,
          dueDate,
          status,
          totalAmount: String(amount),
          paidAmount,
          balance: String(amount - parseFloat(paidAmount)),
          currency: "GMD",
          receivedDate: invDate,
          notes: "Supplier bill — goods received",
        })
        .onConflictDoNothing();

      await db
        .insert(invoiceApLines)
        .values({
          invoiceApId: invId,
          accountId: ACCT.inventory,
          description: `${product.desc} — restock`,
          quantity: String(ap.qty),
          unitPrice: String(product.unit),
          amount: String(amount),
        })
        .onConflictDoNothing();
      apSeq++;
      apCount++;
    }
  }
  console.log(`  AP invoices: +${apCount}`);

  // ── 6. AP payments for paid bills ───────────────────────────────────────
  let apPaySeq = 1;
  let apPayCount = 0;
  const paidAp = await db
    .select({ id: invoicesAp.id, totalAmount: invoicesAp.totalAmount })
    .from(invoicesAp)
    .where(
      and(eq(invoicesAp.entityId, entityId), eq(invoicesAp.status, "paid")),
    );
  for (const inv of paidAp) {
    await db
      .insert(paymentsAp)
      .values({
        id: uuid("b9", apPaySeq),
        entityId,
        invoiceApId: inv.id,
        amount: inv.totalAmount,
        paymentDate: "2026-07-25",
        method: "bank_transfer",
        reference: `AP-PMT-${apPaySeq}`,
        confirmedAt: new Date("2026-07-25T10:00:00Z"),
        notes: "Supplier payment",
      })
      .onConflictDoNothing();
    apPaySeq++;
    apPayCount++;
  }
  console.log(`  AP payments: +${apPayCount}`);

  // ── 7. Monthly bank transactions ────────────────────────────────────────
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
  let btSeq = 100;
  let btCount = 0;
  if (bankAccountId) {
    for (let m = 0; m < MONTHS.length; m++) {
      const mon = MONTHS[m];
      // Deposits: customer collections land mid-month.
      for (let d = 0; d < 3; d++) {
        const depAmt = 120000 + d * 45000;
        await db
          .insert(bankTransactions)
          .values({
            id: uuid("b0", btSeq),
            entityId,
            bankAccountId,
            transactionDate: day(mon, 8 + d * 5),
            type: "deposit",
            amount: String(depAmt),
            description: `Customer collections — batch ${d + 1}`,
            reference: `COLL-${mon.period}-${d + 1}`,
            isReconciled: m < MONTHS.length - 1,
            source: "bank_feed",
          })
          .onConflictDoNothing();
        btSeq++;
        btCount++;
      }
      // Monthly operating expenses.
      for (const exp of MONTHLY_EXPENSES) {
        await db
          .insert(bankTransactions)
          .values({
            id: uuid("b0", btSeq),
            entityId,
            bankAccountId,
            transactionDate: day(mon, exp.dayOfMonth),
            type: "withdrawal",
            amount: String(exp.amount),
            description: exp.desc,
            reference: `${exp.desc.slice(0, 12).toUpperCase().replace(/\s/g, "-")}-${mon.label}`,
            isReconciled: m < MONTHS.length - 1,
            source: "bank_feed",
          })
          .onConflictDoNothing();
        btSeq++;
        btCount++;
      }
      // Payroll disbursement at month end.
      await db
        .insert(bankTransactions)
        .values({
          id: uuid("b0", btSeq),
          entityId,
          bankAccountId,
          transactionDate: day(mon, 28),
          type: "withdrawal",
          amount: String(175000 + (mon.month === 7 ? 3000 : 0)),
          description: `Payroll disbursement ${mon.period}`,
          reference: `PAYROLL-${mon.period}`,
          isReconciled: m < MONTHS.length - 1,
          source: "payroll",
        })
        .onConflictDoNothing();
      btSeq++;
      btCount++;
      // Bank fee.
      await db
        .insert(bankTransactions)
        .values({
          id: uuid("b0", btSeq),
          entityId,
          bankAccountId,
          transactionDate: day(mon, 1),
          type: "fee",
          amount: "2500",
          description: "Monthly account maintenance fee",
          isReconciled: m < MONTHS.length - 1,
          source: "bank_feed",
        })
        .onConflictDoNothing();
      btSeq++;
      btCount++;
    }
  }
  console.log(`  Bank transactions: +${btCount}`);

  // ── 8. Monthly mobile money activity ────────────────────────────────────
  const mm = await db
    .select({ id: mobileMoneyAccounts.id })
    .from(mobileMoneyAccounts)
    .where(eq(mobileMoneyAccounts.entityId, entityId))
    .limit(1);
  const mmAccountId = mm[0]?.id;
  let mmSeq = 50;
  let mmCount = 0;
  if (mmAccountId) {
    for (let m = 0; m < MONTHS.length; m++) {
      const mon = MONTHS[m];
      // 2 inbound collections + 1 outbound transfer per month.
      const inbound = [
        { amt: 45000, from: "Fajara Pharmacy" },
        { amt: 38000, from: "Hotel Kairaba Beach" },
      ];
      for (const inc of inbound) {
        await db
          .insert(mobileMoneyTransactions)
          .values({
            id: uuid("c1", mmSeq),
            entityId,
            mobileMoneyAccountId: mmAccountId,
            providerTxId: `WAVE-${mon.period}-${mmSeq}`,
            type: "collection",
            amount: String(inc.amt),
            fee: "0",
            netAmount: String(inc.amt),
            counterpartyName: inc.from,
            description: `Mobile money collection — ${inc.from}`,
            status: "successful",
            initiatedAt: new Date(`${day(mon, 10)}T12:00:00Z`),
            completedAt: new Date(`${day(mon, 10)}T12:05:00Z`),
          })
          .onConflictDoNothing();
        mmSeq++;
        mmCount++;
      }
      await db
        .insert(mobileMoneyTransactions)
        .values({
          id: uuid("c1", mmSeq),
          entityId,
          mobileMoneyAccountId: mmAccountId,
          providerTxId: `WAVE-${mon.period}-${mmSeq}`,
          type: "transfer",
          amount: "25000",
          fee: "100",
          netAmount: "25100",
          counterpartyName: "Main Operating Account",
          description: "Transfer to bank — petty cash top-up",
          status: "successful",
          initiatedAt: new Date(`${day(mon, 20)}T09:00:00Z`),
          completedAt: new Date(`${day(mon, 20)}T09:05:00Z`),
        })
        .onConflictDoNothing();
      mmSeq++;
      mmCount++;
    }
  }
  console.log(`  Mobile money txs: +${mmCount}`);

  // ── 9. Monthly payroll runs (Feb–Jul) ───────────────────────────────────
  const empRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.entityId, entityId))
    .limit(10);
  const empIds = empRows.map((e) => e.id);
  let prSeq = 20;
  let prCount = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    const status =
      m < MONTHS.length - 1 ? ("paid" as const) : ("approved" as const);
    const runId = uuid("b3", prSeq);
    await db
      .insert(payrollRuns)
      .values({
        id: runId,
        entityId,
        period: mon.period,
        status,
        employeeCount: empIds.length,
        grossPay: String(empIds.length * 40000 + 5000),
        totalDeductions: String(empIds.length * 6500),
        totalEmployerContributions: String(empIds.length * 4000),
        netPay: String(empIds.length * 33500 + 5000),
        processedBy: "demo@xenboox.com",
        approvedBy: status === "paid" ? "demo@xenboox.com" : null,
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
          id: uuid("b4", prSeq * 10 + e),
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
    prSeq++;
    prCount++;
  }
  console.log(`  Payroll runs: +${prCount}`);

  // ── 10. Estimates + conversion (May–Jul) ────────────────────────────────
  const estData = [
    {
      customerIdx: 0,
      productIdx: 0,
      qty: 20,
      date: "2026-05-10",
      status: "accepted" as const,
    },
    {
      customerIdx: 2,
      productIdx: 6,
      qty: 250,
      date: "2026-06-05",
      status: "accepted" as const,
    },
    {
      customerIdx: 4,
      productIdx: 5,
      qty: 15,
      date: "2026-06-22",
      status: "sent" as const,
    },
    {
      customerIdx: 6,
      productIdx: 0,
      qty: 60,
      date: "2026-07-08",
      status: "sent" as const,
    },
    {
      customerIdx: 7,
      productIdx: 4,
      qty: 18,
      date: "2026-07-19",
      status: "draft" as const,
    },
  ];
  let estSeq = 1;
  let estCount = 0;
  for (const est of estData) {
    const product = PRODUCTS[est.productIdx];
    const amount = product.unit * est.qty;
    const estId = uuid("d1", estSeq);
    const estNumber = `EST-2026-${String(estSeq).padStart(3, "0")}`;
    await db
      .insert(salesEstimates)
      .values({
        id: estId,
        entityId,
        customerId: customerIds[est.customerIdx],
        estimateNumber: estNumber,
        estimateDate: est.date,
        expiryDate: `2026-08-30`,
        status: est.status,
        totalAmount: String(amount),
        currency: "GMD",
        notes: "Quotation — trading goods",
        terms: "Net 30 from invoice date",
        sentAt:
          est.status === "draft" ? null : new Date(`${est.date}T10:00:00Z`),
        acceptedAt:
          est.status === "accepted" ? new Date(`${est.date}T14:00:00Z`) : null,
      })
      .onConflictDoNothing();
    await db
      .insert(salesEstimateLines)
      .values({
        salesEstimateId: estId,
        accountId: ACCT.salesRevenue,
        description: `${product.desc} x ${est.qty}`,
        quantity: String(est.qty),
        unitPrice: String(product.unit),
        amount: String(amount),
      })
      .onConflictDoNothing();
    estSeq++;
    estCount++;
  }
  console.log(`  Estimates: +${estCount}`);

  // ── 11. Expense claims (Jul) ────────────────────────────────────────────
  const claimData = [
    {
      claimant: "Fatoumata Jawara",
      dept: "Sales",
      category: "Travel",
      desc: "Client visits — Brikama & Serrekunda",
      amount: 18500,
      status: "approved" as const,
    },
    {
      claimant: "Ismaila Ceesay",
      dept: "Operations",
      category: "Fuel",
      desc: "Delivery truck fuel — West Coast route",
      amount: 24000,
      status: "approved" as const,
    },
    {
      claimant: "Awa Bah",
      dept: "Admin",
      category: "Office",
      desc: "Stationery restock",
      amount: 6200,
      status: "submitted" as const,
    },
    {
      claimant: "Bubacarr Jobe",
      dept: "IT",
      category: "Equipment",
      desc: "UPS battery replacement",
      amount: 9800,
      status: "flagged" as const,
      flag: "Receipt amount exceeds per-line policy limit",
    },
  ];
  let clSeq = 1;
  for (const cl of claimData) {
    const claimId = uuid("d2", clSeq);
    const claimNumber = `EXP-2026-${String(clSeq).padStart(3, "0")}`;
    await db
      .insert(expenseClaims)
      .values({
        id: claimId,
        entityId,
        claimNumber,
        claimantId: `emp-${clSeq}`,
        claimantName: cl.claimant,
        department: cl.dept,
        category: cl.category,
        description: cl.desc,
        totalAmount: String(cl.amount),
        currency: "GMD",
        status: cl.status,
        source: "mobile",
        period: "2026-07",
        submittedAt: new Date("2026-07-18T09:00:00Z"),
        flaggedReason: "flag" in cl ? cl.flag : null,
        approvedAt:
          cl.status === "approved" ? new Date("2026-07-19T10:00:00Z") : null,
      })
      .onConflictDoNothing();
    await db
      .insert(claimLineItems)
      .values({
        id: uuid("d3", clSeq),
        entityId,
        claimId,
        lineNumber: 1,
        category: cl.category,
        description: cl.desc,
        amount: String(cl.amount),
        taxAmount: "0",
        isFlagged: cl.status === "flagged",
        flagReason: cl.status === "flagged" ? cl.flag : null,
      })
      .onConflictDoNothing();
    if (cl.status === "approved") {
      await db
        .insert(reimbursementRecords)
        .values({
          id: uuid("d4", clSeq),
          entityId,
          claimId,
          amount: String(cl.amount),
          currency: "GMD",
          paymentMethod: "bank_transfer",
          paidDate: new Date("2026-07-21T11:00:00Z"),
          paymentRef: `REIMB-${claimNumber}`,
          status: "paid",
        })
        .onConflictDoNothing();
    }
    clSeq++;
  }
  console.log(`  Expense claims: +${claimData.length}`);

  // ── 12. Documents (receipts, statements, contracts) ─────────────────────
  const docData = [
    { name: "Trust Bank Statement — July 2026", type: "bank_statement" },
    { name: "NAWEC invoice — July 2026", type: "invoice" },
    { name: "Supplier agreement — Touba Import Export", type: "contract" },
    { name: "SI-2026-018 delivery receipt", type: "receipt" },
    { name: "GAMTEL invoice — Q3", type: "invoice" },
    { name: "Vehicle insurance policy — Hilux", type: "supporting" },
  ];
  let docSeq = 1;
  for (const doc of docData) {
    await db
      .insert(documents)
      .values({
        id: uuid("d5", docSeq),
        entityId,
        name: doc.name,
        type: doc.type as
          | "invoice"
          | "receipt"
          | "contract"
          | "bank_statement"
          | "supporting",
        sizeBytes: 120000 + docSeq * 4000,
        mimeType: "application/pdf",
        r2Key: `demo/${docSeq}.pdf`,
        r2Bucket: "xenboox-demo-documents",
        status: "synced",
        uploadedBy: userId,
      })
      .onConflictDoNothing();
    docSeq++;
  }
  console.log(`  Documents: +${docData.length}`);

  // ── 13. Monthly journal entries (revenue recognition + operating) ───────
  const fiscalPeriods = await import("../schema/accounting");
  const periods = await db
    .select({
      id: fiscalPeriods.fiscalPeriods.id,
      year: fiscalPeriods.fiscalPeriods.year,
      month: fiscalPeriods.fiscalPeriods.month,
    })
    .from(fiscalPeriods.fiscalPeriods)
    .where(eq(fiscalPeriods.fiscalPeriods.entityId, entityId));
  const periodByMonth = new Map(periods.map((p) => [p.month, p.id]));

  let jeSeq = 100;
  let jeCount = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    const periodId = periodByMonth.get(mon.month);
    if (!periodId) continue;

    // Revenue recognition entry (monthly sales rollup).
    const salesTotal = 900000 + m * 45000;
    const vat = Math.round(salesTotal * 0.15);
    const netSales = salesTotal - vat;
    const entries: Array<{
      desc: string;
      date: string;
      lines: Array<[string, string, string]>;
    }> = [
      {
        desc: `${mon.label} sales revenue recognition`,
        date: day(mon, 28),
        lines: [
          [ACCT.receivable, String(salesTotal), "0"],
          [ACCT.salesRevenue, "0", String(netSales)],
          [ACCT.taxLiability, "0", String(vat)],
        ],
      },
      {
        desc: `${mon.label} cost of goods sold`,
        date: day(mon, 28),
        lines: [
          [ACCT.cogs, String(Math.round(salesTotal * 0.58)), "0"],
          [ACCT.inventory, "0", String(Math.round(salesTotal * 0.58))],
        ],
      },
      {
        desc: `${mon.label} operating expenses accrual`,
        date: day(mon, 28),
        lines: [
          [ACCT.rentExpense, "75000", "0"],
          [ACCT.utilitiesExpense, "45500", "0"],
          [ACCT.officeExpense, "12500", "0"],
          [ACCT.travelExpense, "28500", "0"],
          [ACCT.accruedLiability, "0", "161500"],
        ],
      },
      {
        desc: `${mon.label} salary expense`,
        date: day(mon, 28),
        lines: [
          [ACCT.salaryExpense, String(empIds.length * 40000 + 5000), "0"],
          [ACCT.bank, "0", String(empIds.length * 33500 + 5000)],
          [ACCT.taxLiability, "0", String(empIds.length * 6500)],
        ],
      },
    ];

    for (const e of entries) {
      const jeId = uuid("f0", jeSeq);
      await db
        .insert(journalEntries)
        .values({
          id: jeId,
          entityId,
          entryNumber: jeSeq,
          description: e.desc,
          date: e.date,
          periodId,
          status: "posted",
          postedBy: "demo@xenboox.com",
          postedAt: new Date(`${e.date}T17:00:00Z`),
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
      jeSeq++;
      jeCount++;
    }
  }
  console.log(`  Journal entries: +${jeCount}`);

  console.log("  6-month seed complete.");
  return {
    customers: customerIds.length,
    suppliers: supplierIds.length,
    arCount,
    apCount,
    btCount,
    mmCount,
    prCount,
    estCount,
    jeCount,
  };
}

if (shouldRunDirect()) {
  seedSixMonths()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-six-months failed:", err);
      process.exit(1);
    });
}
