import crypto from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "../schema/organization";
import {
  chartOfAccounts,
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
} from "../schema/accounting";
import {
  suppliers,
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
} from "../schema/ap-ar";
import {
  customers,
  salesInvoices,
  salesInvoiceLines,
  paymentsAp,
  paymentsAr,
} from "../schema/ap-ar";
import {
  employees,
  employeeContracts,
  payrollDeductionTypes,
  payrollRuns,
  payrollLineItems,
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
  reconciliationItems,
} from "../schema/treasury";
import {
  cashAccounts,
  imprestFloats,
  imprestReceipts,
  pettyCashLedger,
} from "../schema/cash";
import {
  mobileMoneyAccounts,
  mobileMoneyTransactions,
} from "../schema/mobile-money";
import {
  documents,
  documentLinks,
  auditLog,
  agentActivity,
  currencies,
  exchangeRates,
} from "../schema/documents";
import {
  modelRegistry,
  modelAssignments,
  modelCostTracking,
} from "../schema/models";
import {
  conversations,
  chatMessages,
  notifications,
  reportRequests,
  agentRoutingLogs,
  closeSessions,
} from "../schema";
import {
  findOrCreateUser,
  findOrCreateOrg,
  resetEntity,
  grantAccess,
  setLastUsedEntity,
  shouldRunDirect,
} from "./seed-lib";
import { seedPermissions } from "./permissions";
import { seedAgents } from "./agents";
import { seedGoldenEvals } from "./golden-evals";

// Resolved inside seedYc() — never random, re-runs reuse the live account.
let USER_ID = "";
let ORG_ID = "";
let ENTITY_ID = "";

// Deterministic IDs, namespaced with `yc-` so they can NEVER collide with the
// demo seed's IDs (chart_of_accounts.id, fiscal_periods.id etc. are global
// primary keys — sharing ids across entities would silently skip inserts via
// onConflictDoNothing and cross-contaminate entities).
function seedUuid(type: string, n: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`yc-${type}-${n}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Account IDs (deterministic) — `yc-acct-` namespace keeps them distinct from
// the demo seed's `acct-` accounts so both entities can coexist.
const A = (code: string) => {
  const hash = crypto
    .createHash("sha256")
    .update(`yc-acct-${code}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

const ACCT = {
  cash: A("0001"),
  bank: A("0002"),
  receivable: A("0003"),
  inventory: A("0004"),
  prepaid: A("0005"),
  fixedAsset: A("0006"),
  accumDepreciation: A("0007"),
  payable: A("0008"),
  taxLiability: A("0009"),
  accruedLiability: A("0010"),
  shortTermLoan: A("0011"),
  ownerEquity: A("0012"),
  retainedEarnings: A("0013"),
  currentYearEarnings: A("0014"),
  salesRevenue: A("0015"),
  serviceRevenue: A("0016"),
  otherIncome: A("0017"),
  cogs: A("0018"),
  salaryExpense: A("0019"),
  rentExpense: A("0020"),
  utilitiesExpense: A("0021"),
  depreciation: A("0022"),
  officeExpense: A("0023"),
  travelExpense: A("0024"),
  marketingExpense: A("0025"),
  insuranceExpense: A("0026"),
  interestExpense: A("0027"),
  taxExpense: A("0028"),
};

const coa = [
  {
    id: ACCT.cash,
    code: "1010",
    name: "Cash on Hand",
    type: "asset" as const,
    subtype: "cash" as const,
  },
  {
    id: ACCT.bank,
    code: "1020",
    name: "Bank Account - Chase Business",
    type: "asset" as const,
    subtype: "bank_account" as const,
  },
  {
    id: ACCT.receivable,
    code: "1100",
    name: "Accounts Receivable",
    type: "asset" as const,
    subtype: "accounts_receivable" as const,
  },
  {
    id: ACCT.inventory,
    code: "1200",
    name: "Inventory (Equipment Stock)",
    type: "asset" as const,
    subtype: "inventory" as const,
  },
  {
    id: ACCT.prepaid,
    code: "1300",
    name: "Prepaid Expenses",
    type: "asset" as const,
    subtype: "prepaid" as const,
  },
  {
    id: ACCT.fixedAsset,
    code: "1500",
    name: "Office Equipment",
    type: "asset" as const,
    subtype: "fixed_asset" as const,
  },
  {
    id: ACCT.accumDepreciation,
    code: "1510",
    name: "Accumulated Depreciation",
    type: "asset" as const,
    subtype: "fixed_asset" as const,
  },
  {
    id: ACCT.payable,
    code: "2010",
    name: "Accounts Payable",
    type: "liability" as const,
    subtype: "accounts_payable" as const,
  },
  {
    id: ACCT.taxLiability,
    code: "2100",
    name: "Payroll Tax Payable",
    type: "liability" as const,
    subtype: "tax_liability" as const,
  },
  {
    id: ACCT.accruedLiability,
    code: "2200",
    name: "Accrued Expenses",
    type: "liability" as const,
    subtype: "accrued_liability" as const,
  },
  {
    id: ACCT.shortTermLoan,
    code: "2300",
    name: "Short-Term Loan",
    type: "liability" as const,
    subtype: "current_liability" as const,
  },
  {
    id: ACCT.ownerEquity,
    code: "3010",
    name: "Founder's Equity",
    type: "equity" as const,
    subtype: "owner_equity" as const,
  },
  {
    id: ACCT.retainedEarnings,
    code: "3020",
    name: "Retained Earnings",
    type: "equity" as const,
    subtype: "retained_earnings" as const,
  },
  {
    id: ACCT.currentYearEarnings,
    code: "3030",
    name: "Current Year Earnings",
    type: "equity" as const,
    subtype: "current_year_earnings" as const,
  },
  {
    id: ACCT.salesRevenue,
    code: "4010",
    name: "Product Revenue",
    type: "revenue" as const,
    subtype: "sales_revenue" as const,
  },
  {
    id: ACCT.serviceRevenue,
    code: "4020",
    name: "Subscription Revenue (MRR)",
    type: "revenue" as const,
    subtype: "service_revenue" as const,
  },
  {
    id: ACCT.otherIncome,
    code: "4030",
    name: "Interest & Other Income",
    type: "revenue" as const,
    subtype: "other_income" as const,
  },
  {
    id: ACCT.cogs,
    code: "5010",
    name: "Cost of Revenue (Hosting/Infra)",
    type: "expense" as const,
    subtype: "cost_of_goods_sold" as const,
  },
  {
    id: ACCT.salaryExpense,
    code: "6010",
    name: "Salaries & Wages",
    type: "expense" as const,
    subtype: "payroll_expense" as const,
  },
  {
    id: ACCT.rentExpense,
    code: "6020",
    name: "Office Rent",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.utilitiesExpense,
    code: "6030",
    name: "Utilities & Internet",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.depreciation,
    code: "6040",
    name: "Depreciation Expense",
    type: "expense" as const,
    subtype: "depreciation" as const,
  },
  {
    id: ACCT.officeExpense,
    code: "6050",
    name: "Software & Office Supplies",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.travelExpense,
    code: "6060",
    name: "Travel & Entertainment",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.marketingExpense,
    code: "6070",
    name: "Marketing & Advertising",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.insuranceExpense,
    code: "6080",
    name: "Insurance",
    type: "expense" as const,
    subtype: "operating_expense" as const,
  },
  {
    id: ACCT.interestExpense,
    code: "7010",
    name: "Interest Expense",
    type: "expense" as const,
    subtype: "interest_expense" as const,
  },
  {
    id: ACCT.taxExpense,
    code: "7020",
    name: "Income Tax Expense",
    type: "expense" as const,
    subtype: "tax_expense" as const,
  },
];

// US payroll helpers — realistic 2026 federal withholdings for a TX company
// (no state income tax). Employer FICA = 6.2% SS + 1.45% Medicare.
const SALARIES = [145000, 135000, 95000, 110000];
const MONTHLY_BONUS = 500;

function payrollMath(annual: number) {
  const gross = Math.round(annual / 12) + MONTHLY_BONUS;
  const fit = Math.round(gross * 0.22); // Federal income tax (approx. effective)
  const ss = Math.round(gross * 0.062); // Social Security
  const med = Math.round(gross * 0.0145); // Medicare
  const k401 = Math.round(gross * 0.05); // 401(k) deferral
  const health = 350; // health insurance premium
  const totalDed = fit + ss + med + k401 + health;
  return {
    gross,
    fit,
    ss,
    med,
    k401,
    health,
    totalDed,
    net: gross - totalDed,
    employer: Math.round(gross * 0.0765),
  };
}

function computeRunTotals() {
  let gross = 0;
  let ded = 0;
  let net = 0;
  let employer = 0;
  for (const s of SALARIES) {
    const m = payrollMath(s);
    gross += m.gross;
    ded += m.totalDed;
    net += m.net;
    employer += m.employer;
  }
  return { gross, ded, net, employer };
}

export async function seedYc() {
  console.log(
    "Seeding yc@xenboox.com — Northwind Labs, Inc. (US SaaS, May–Jul 2026)...",
  );

  // ── Bootstrap (idempotent, non-destructive) ────────────────────────────
  console.log("  Bootstrapping account...");
  USER_ID = await findOrCreateUser({
    email: "yc@xenboox.com",
    name: "YC Demo User",
  });
  ORG_ID = await findOrCreateOrg({
    userId: USER_ID,
    name: "Northwind Labs Inc.",
    slug: "northwind-labs",
    plan: "growth",
    settings: { timezone: "America/Chicago", locale: "en-US" },
  });
  ENTITY_ID = await resetEntity({
    orgId: ORG_ID,
    name: "Northwind Labs Inc.",
    currency: "USD",
    country: "US",
    fiscalYearEnd: "12",
    taxId: "84-1234567", // EIN format
    settings: {
      vatRate: 0.0,
      defaultPaymentTerms: "net30",
      taxMode: "us",
      state: "TX",
    },
  });
  await grantAccess({
    userId: USER_ID,
    entityId: ENTITY_ID,
    role: "owner",
    grantedBy: USER_ID,
  });
  await setLastUsedEntity(USER_ID, ENTITY_ID);

  // ── Chart of accounts ──────────────────────────────────────────────────
  console.log("  Creating chart of accounts...");
  for (const acct of coa) {
    await db
      .insert(chartOfAccounts)
      .values({
        id: acct.id,
        entityId: ENTITY_ID,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── Fiscal periods (May, Jun, Jul 2026) ────────────────────────────────
  console.log("  Creating fiscal periods (May, Jun, Jul 2026)...");
  const periodIds: string[] = [];
  const periodMonths = [5, 6, 7];
  for (const month of periodMonths) {
    const pid = seedUuid("pd", month);
    periodIds.push(pid);
    const startDate = `2026-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(2026, month, 0).getDate();
    const endDate = `2026-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const status = month < 7 ? ("closed" as const) : ("open" as const);
    await db
      .insert(fiscalPeriods)
      .values({
        id: pid,
        entityId: ENTITY_ID,
        year: 2026,
        month,
        startDate,
        endDate,
        status,
      })
      .onConflictDoNothing();
  }

  const mayId = periodIds[0];
  const junId = periodIds[1];
  const julId = periodIds[2];

  const runTotals = computeRunTotals();

  // ── Journal entries (May–Jul) — US SaaS, no sales tax on services ──────
  console.log("  Creating journal entries (May-Jul)...");
  const journalData = [
    {
      periodId: mayId,
      num: 1,
      desc: "May opening — Series Seed round deposit",
      date: "2026-05-01",
      lines: [
        { accountId: ACCT.bank, debit: "500000", credit: "0" },
        { accountId: ACCT.ownerEquity, debit: "0", credit: "500000" },
      ],
    },
    {
      periodId: mayId,
      num: 2,
      desc: "May office rent — WeWork Austin",
      date: "2026-05-03",
      lines: [
        { accountId: ACCT.rentExpense, debit: "12000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "12000" },
      ],
    },
    {
      periodId: mayId,
      num: 3,
      desc: "May subscription revenue (MRR)",
      date: "2026-05-15",
      lines: [
        { accountId: ACCT.bank, debit: "45000", credit: "0" },
        { accountId: ACCT.receivable, debit: "28000", credit: "0" },
        { accountId: ACCT.serviceRevenue, debit: "0", credit: "73000" },
      ],
    },
    {
      periodId: mayId,
      num: 4,
      desc: "May cloud hosting — AWS",
      date: "2026-05-15",
      lines: [
        { accountId: ACCT.cogs, debit: "9800", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "9800" },
      ],
    },
    {
      periodId: mayId,
      num: 5,
      desc: "May utilities & internet",
      date: "2026-05-18",
      lines: [
        { accountId: ACCT.utilitiesExpense, debit: "850", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "850" },
      ],
    },
    {
      periodId: mayId,
      num: 6,
      desc: "May payroll (4 employees)",
      date: "2026-05-25",
      lines: [
        {
          accountId: ACCT.salaryExpense,
          debit: String(runTotals.gross),
          credit: "0",
        },
        {
          accountId: ACCT.taxLiability,
          debit: "0",
          credit: String(runTotals.ded),
        },
        { accountId: ACCT.bank, debit: "0", credit: String(runTotals.net) },
      ],
    },
    {
      periodId: mayId,
      num: 7,
      desc: "May marketing — LinkedIn Ads",
      date: "2026-05-20",
      lines: [
        { accountId: ACCT.marketingExpense, debit: "3500", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "3500" },
      ],
    },
    {
      periodId: junId,
      num: 8,
      desc: "June subscription revenue (MRR)",
      date: "2026-06-12",
      lines: [
        { accountId: ACCT.bank, debit: "62000", credit: "0" },
        { accountId: ACCT.receivable, debit: "35000", credit: "0" },
        { accountId: ACCT.serviceRevenue, debit: "0", credit: "97000" },
      ],
    },
    {
      periodId: junId,
      num: 9,
      desc: "June cloud hosting — AWS",
      date: "2026-06-12",
      lines: [
        { accountId: ACCT.cogs, debit: "11200", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "11200" },
      ],
    },
    {
      periodId: junId,
      num: 10,
      desc: "June office rent — WeWork Austin",
      date: "2026-06-01",
      lines: [
        { accountId: ACCT.rentExpense, debit: "12000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "12000" },
      ],
    },
    {
      periodId: junId,
      num: 11,
      desc: "June payroll (4 employees)",
      date: "2026-06-25",
      lines: [
        {
          accountId: ACCT.salaryExpense,
          debit: String(runTotals.gross),
          credit: "0",
        },
        {
          accountId: ACCT.taxLiability,
          debit: "0",
          credit: String(runTotals.ded),
        },
        { accountId: ACCT.bank, debit: "0", credit: String(runTotals.net) },
      ],
    },
    {
      periodId: junId,
      num: 12,
      desc: "June utilities",
      date: "2026-06-15",
      lines: [
        { accountId: ACCT.utilitiesExpense, debit: "920", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "920" },
      ],
    },
    {
      periodId: junId,
      num: 13,
      desc: "June marketing — Google Ads",
      date: "2026-06-20",
      lines: [
        { accountId: ACCT.marketingExpense, debit: "4800", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "4800" },
      ],
    },
    {
      periodId: junId,
      num: 14,
      desc: "June insurance — E&O policy",
      date: "2026-06-10",
      lines: [
        { accountId: ACCT.insuranceExpense, debit: "2400", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "2400" },
      ],
    },
    {
      periodId: julId,
      num: 15,
      desc: "July subscription revenue (MRR)",
      date: "2026-07-14",
      lines: [
        { accountId: ACCT.bank, debit: "75000", credit: "0" },
        { accountId: ACCT.receivable, debit: "42000", credit: "0" },
        { accountId: ACCT.serviceRevenue, debit: "0", credit: "117000" },
      ],
    },
    {
      periodId: julId,
      num: 16,
      desc: "July cloud hosting — AWS",
      date: "2026-07-14",
      lines: [
        { accountId: ACCT.cogs, debit: "12800", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "12800" },
      ],
    },
    {
      periodId: julId,
      num: 17,
      desc: "July office rent — WeWork Austin",
      date: "2026-07-01",
      lines: [
        { accountId: ACCT.rentExpense, debit: "12000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "12000" },
      ],
    },
    {
      periodId: julId,
      num: 18,
      desc: "July payroll (4 employees)",
      date: "2026-07-25",
      lines: [
        {
          accountId: ACCT.salaryExpense,
          debit: String(runTotals.gross),
          credit: "0",
        },
        {
          accountId: ACCT.taxLiability,
          debit: "0",
          credit: String(runTotals.ded),
        },
        { accountId: ACCT.bank, debit: "0", credit: String(runTotals.net) },
      ],
    },
    {
      periodId: julId,
      num: 19,
      desc: "July utilities",
      date: "2026-07-16",
      lines: [
        { accountId: ACCT.utilitiesExpense, debit: "780", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "780" },
      ],
    },
    {
      periodId: julId,
      num: 20,
      desc: "July marketing — social ads",
      date: "2026-07-22",
      lines: [
        { accountId: ACCT.marketingExpense, debit: "6200", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "6200" },
      ],
    },
    {
      periodId: julId,
      num: 21,
      desc: "July SaaS tools (GitHub, Linear, Vercel)",
      date: "2026-07-08",
      lines: [
        { accountId: ACCT.officeExpense, debit: "1500", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "1500" },
      ],
    },
    {
      periodId: julId,
      num: 22,
      desc: "July travel — client visits",
      date: "2026-07-28",
      lines: [
        { accountId: ACCT.travelExpense, debit: "2800", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "2800" },
      ],
    },
  ];

  for (const entry of journalData) {
    const jeId = seedUuid("je", entry.num);
    await db
      .insert(journalEntries)
      .values({
        id: jeId,
        entityId: ENTITY_ID,
        entryNumber: entry.num,
        description: entry.desc,
        date: entry.date,
        periodId: entry.periodId,
        status: "posted",
        postedBy: "yc@xenboox.com",
        postedAt: new Date(entry.date),
        source: "seed",
      })
      .onConflictDoNothing();

    for (const line of entry.lines) {
      await db
        .insert(journalEntryLines)
        .values({
          journalEntryId: jeId,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: entry.desc,
          currency: "USD",
          baseCurrency: "USD",
          baseAmount: line.debit !== "0" ? line.debit : line.credit,
        })
        .onConflictDoNothing();
    }
  }

  // ── Suppliers (US vendors) ──────────────────────────────────────────────
  console.log("  Creating suppliers...");
  const supplierData = [
    {
      name: "TechSupply Co.",
      email: "sales@techsupply.co",
      phone: "+15551234567",
      terms: "net30",
    },
    {
      name: "CloudHost Inc. (AWS Partner)",
      email: "billing@cloudhost.io",
      phone: "+15559876543",
      terms: "net15",
    },
    {
      name: "Office Essentials LLC",
      email: "orders@officeessentials.com",
      phone: "+15555550000",
      terms: "net30",
    },
    {
      name: "LegalEase Partners",
      email: "ap@legalease.law",
      phone: "+15554443333",
      terms: "net45",
    },
  ];

  const supplierIds: string[] = [];
  for (let i = 0; i < supplierData.length; i++) {
    const sid = seedUuid("sup", i + 1);
    supplierIds.push(sid);
    await db
      .insert(suppliers)
      .values({
        id: sid,
        entityId: ENTITY_ID,
        name: supplierData[i].name,
        contactEmail: supplierData[i].email,
        contactPhone: supplierData[i].phone,
        paymentTerms: supplierData[i].terms,
      })
      .onConflictDoNothing();
  }

  // ── Customers (US B2B) ──────────────────────────────────────────────────
  console.log("  Creating customers...");
  const customerData = [
    {
      name: "Acme Startup Labs",
      email: "finance@acmestartup.com",
      phone: "+15556667777",
      terms: "net30",
    },
    {
      name: "BetaStream Corp",
      email: "ap@betastream.io",
      phone: "+15557778888",
      terms: "net15",
    },
    {
      name: "GammaVentures",
      email: "billing@gammaventures.com",
      phone: "+15558889999",
      terms: "net30",
    },
    {
      name: "DeltaScale Inc",
      email: "finance@deltascale.co",
      phone: "+15559990000",
      terms: "net45",
    },
  ];

  const customerIds: string[] = [];
  for (let i = 0; i < customerData.length; i++) {
    const cid = seedUuid("cust", i + 1);
    customerIds.push(cid);
    await db
      .insert(customers)
      .values({
        id: cid,
        entityId: ENTITY_ID,
        name: customerData[i].name,
        contactEmail: customerData[i].email,
        contactPhone: customerData[i].phone,
        paymentTerms: customerData[i].terms,
      })
      .onConflictDoNothing();
  }

  // ── AP invoices ─────────────────────────────────────────────────────────
  console.log("  Creating AP invoices...");
  const apInvoiceData = [
    {
      supplierId: supplierIds[0],
      no: "INV-2026-101",
      date: "2026-05-05",
      amount: "8500",
      status: "paid" as const,
    },
    {
      supplierId: supplierIds[1],
      no: "INV-2026-102",
      date: "2026-05-20",
      amount: "4200",
      status: "paid" as const,
    },
    {
      supplierId: supplierIds[2],
      no: "INV-2026-103",
      date: "2026-06-03",
      amount: "2100",
      status: "paid" as const,
    },
    {
      supplierId: supplierIds[0],
      no: "INV-2026-104",
      date: "2026-06-18",
      amount: "15000",
      status: "partial" as const,
    },
    {
      supplierId: supplierIds[3],
      no: "INV-2026-105",
      date: "2026-06-25",
      amount: "5500",
      status: "pending" as const,
    },
    {
      supplierId: supplierIds[1],
      no: "INV-2026-106",
      date: "2026-07-07",
      amount: "3800",
      status: "paid" as const,
    },
    {
      supplierId: supplierIds[2],
      no: "INV-2026-107",
      date: "2026-07-19",
      amount: "1800",
      status: "pending" as const,
    },
    {
      supplierId: supplierIds[0],
      no: "INV-2026-108",
      date: "2026-07-28",
      amount: "9500",
      status: "pending" as const,
    },
  ];

  const apInvIds: string[] = [];
  for (const inv of apInvoiceData) {
    const invId = seedUuid("api", parseInt(inv.no.slice(-3)));
    apInvIds.push(invId);
    const balance =
      inv.status === "paid"
        ? "0"
        : inv.status === "partial"
          ? String(Math.round(parseFloat(inv.amount) * 0.4))
          : inv.amount;
    await db
      .insert(invoicesAp)
      .values({
        id: invId,
        entityId: ENTITY_ID,
        supplierId: inv.supplierId,
        invoiceNumber: inv.no,
        invoiceDate: inv.date,
        dueDate: `2026-${String(parseInt(inv.date.split("-")[1]) + 1).padStart(2, "0")}-${inv.date.split("-")[2]}`,
        totalAmount: inv.amount,
        balance,
        currency: "USD",
        status: inv.status,
      })
      .onConflictDoNothing();
  }

  for (let i = 0; i < apInvoiceData.length; i++) {
    const inv = apInvoiceData[i];
    await db
      .insert(invoiceApLines)
      .values({
        invoiceApId: apInvIds[i],
        accountId: ACCT.inventory,
        description: `${inv.no} — ${
          inv.amount === "8500" ||
          inv.amount === "15000" ||
          inv.amount === "9500"
            ? "Development laptops & hardware"
            : inv.amount === "4200" || inv.amount === "3800"
              ? "Cloud infrastructure (AWS)"
              : inv.amount === "2100" || inv.amount === "1800"
                ? "Office supplies"
                : "Legal services (SaaS agreements)"
        }`,
        quantity: "1",
        unitPrice: inv.amount,
        amount: inv.amount,
      })
      .onConflictDoNothing();
  }

  // ── AR invoices ─────────────────────────────────────────────────────────
  console.log("  Creating AR invoices...");
  const arInvoiceData = [
    {
      customerId: customerIds[0],
      no: "INV-2026-201",
      date: "2026-05-10",
      amount: "45000",
      status: "paid" as const,
    },
    {
      customerId: customerIds[1],
      no: "INV-2026-202",
      date: "2026-05-25",
      amount: "28000",
      status: "paid" as const,
    },
    {
      customerId: customerIds[2],
      no: "INV-2026-203",
      date: "2026-06-08",
      amount: "62000",
      status: "paid" as const,
    },
    {
      customerId: customerIds[3],
      no: "INV-2026-204",
      date: "2026-06-22",
      amount: "35000",
      status: "partial" as const,
    },
    {
      customerId: customerIds[0],
      no: "INV-2026-205",
      date: "2026-07-05",
      amount: "42000",
      status: "pending" as const,
    },
    {
      customerId: customerIds[1],
      no: "INV-2026-206",
      date: "2026-07-18",
      amount: "40000",
      status: "pending" as const,
    },
    {
      customerId: customerIds[2],
      no: "INV-2026-207",
      date: "2026-07-29",
      amount: "35000",
      status: "pending" as const,
    },
  ];

  const arInvIds: string[] = [];
  for (const inv of arInvoiceData) {
    const invId = seedUuid("ari", parseInt(inv.no.slice(-3)));
    arInvIds.push(invId);
    const balance =
      inv.status === "paid"
        ? "0"
        : inv.status === "partial"
          ? String(Math.round(parseFloat(inv.amount) * 0.35))
          : inv.amount;
    await db
      .insert(salesInvoices)
      .values({
        id: invId,
        entityId: ENTITY_ID,
        customerId: inv.customerId,
        invoiceNumber: inv.no,
        invoiceDate: inv.date,
        dueDate: `2026-${String(parseInt(inv.date.split("-")[1]) + 1).padStart(2, "0")}-${inv.date.split("-")[2]}`,
        totalAmount: inv.amount,
        balance,
        currency: "USD",
        status: inv.status,
      })
      .onConflictDoNothing();
  }

  for (let i = 0; i < arInvoiceData.length; i++) {
    const inv = arInvoiceData[i];
    await db
      .insert(salesInvoiceLines)
      .values({
        salesInvoiceId: arInvIds[i],
        accountId: ACCT.serviceRevenue,
        description: `${inv.no} — SaaS platform subscription (annual, billed monthly)`,
        quantity: "1",
        unitPrice: inv.amount,
        amount: inv.amount,
      })
      .onConflictDoNothing();
  }

  // ── Employees (US) ──────────────────────────────────────────────────────
  console.log("  Creating employees...");
  const employeeData = [
    {
      name: "Alice Chen",
      email: "alice@northwindlabs.com",
      department: "Engineering",
      title: "CTO / Co-founder",
      type: "full_time" as const,
    },
    {
      name: "Bob Martinez",
      email: "bob@northwindlabs.com",
      department: "Engineering",
      title: "Senior Full-Stack Engineer",
      type: "full_time" as const,
    },
    {
      name: "Carol Williams",
      email: "carol@northwindlabs.com",
      department: "Sales",
      title: "Account Executive",
      type: "full_time" as const,
    },
    {
      name: "David Kim",
      email: "david@northwindlabs.com",
      department: "Operations",
      title: "Operations Manager",
      type: "full_time" as const,
    },
  ];

  const employeeIds: string[] = [];
  for (let i = 0; i < employeeData.length; i++) {
    const eid = seedUuid("emp", i + 1);
    employeeIds.push(eid);
    const emp = employeeData[i];
    await db
      .insert(employees)
      .values({
        id: eid,
        entityId: ENTITY_ID,
        employeeNumber: `NL-EMP-${String(i + 1).padStart(3, "0")}`,
        name: emp.name,
        email: emp.email,
        hireDate: "2025-09-01",
        department: emp.department,
        jobTitle: emp.title,
        employmentType: emp.type,
        isActive: true,
      })
      .onConflictDoNothing();

    await db
      .insert(employeeContracts)
      .values({
        entityId: ENTITY_ID,
        employeeId: eid,
        effectiveDate: "2025-09-01",
        basicSalary: String(SALARIES[i]),
        currency: "USD",
        payFrequency: "monthly",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── Payroll deduction types (US) ────────────────────────────────────────
  console.log("  Creating payroll deduction types...");
  const dedTypes = [
    {
      name: "Federal Income Tax (FIT)",
      code: "FIT",
      type: "tax" as const,
      rateType: "percentage",
      rate: "0.22",
      isStatutory: true,
    },
    {
      name: "Social Security (FICA SS)",
      code: "FICA-SS",
      type: "social_security" as const,
      rateType: "percentage",
      rate: "0.062",
      isStatutory: true,
    },
    {
      name: "Medicare (FICA MED)",
      code: "FICA-MED",
      type: "social_security" as const,
      rateType: "percentage",
      rate: "0.0145",
      isStatutory: true,
    },
    {
      name: "Health Insurance (Group)",
      code: "HLTH",
      type: "benefit" as const,
      rateType: "fixed",
      rate: "350",
      isStatutory: false,
    },
    {
      name: "401(k) Deferral",
      code: "401K",
      type: "benefit" as const,
      rateType: "percentage",
      rate: "0.05",
      isStatutory: false,
    },
  ];

  for (let i = 0; i < dedTypes.length; i++) {
    const d = dedTypes[i];
    await db
      .insert(payrollDeductionTypes)
      .values({
        id: seedUuid("ded", i + 1),
        entityId: ENTITY_ID,
        name: d.name,
        code: d.code,
        type: d.type,
        rateType: d.rateType,
        rate: d.rate,
        isStatutory: d.isStatutory,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── Payroll runs (May, Jun paid; Jul approved) ─────────────────────────
  console.log("  Creating payroll runs (May, Jun, Jul)...");
  const payrollRunData = [
    { period: "2026-05", status: "paid" as const },
    { period: "2026-06", status: "paid" as const },
    { period: "2026-07", status: "approved" as const },
  ];

  const runIds: string[] = [];
  for (let r = 0; r < payrollRunData.length; r++) {
    const rid = seedUuid("run", r + 1);
    runIds.push(rid);
    const run = payrollRunData[r];
    await db
      .insert(payrollRuns)
      .values({
        id: rid,
        entityId: ENTITY_ID,
        period: run.period,
        status: run.status,
        employeeCount: 4,
        grossPay: String(runTotals.gross),
        totalDeductions: String(runTotals.ded),
        totalEmployerContributions: String(runTotals.employer),
        netPay: String(runTotals.net),
        processedBy: "yc@xenboox.com",
        approvedBy: run.status === "paid" ? "yc@xenboox.com" : null,
      })
      .onConflictDoNothing();
  }

  for (let r = 0; r < runIds.length; r++) {
    for (let e = 0; e < employeeIds.length; e++) {
      const m = payrollMath(SALARIES[e]);
      await db
        .insert(payrollLineItems)
        .values({
          entityId: ENTITY_ID,
          payrollRunId: runIds[r],
          employeeId: employeeIds[e],
          basicSalary: String(Math.round(SALARIES[e] / 12)),
          allowances: [
            { name: "Monthly Bonus", amount: String(MONTHLY_BONUS) },
          ],
          grossPay: String(m.gross),
          payeTax: String(m.fit),
          socialSecurityEmployee: String(m.ss + m.med),
          socialSecurityEmployer: String(m.employer),
          netPay: String(m.net),
          paymentMethod: "bank_transfer",
        })
        .onConflictDoNothing();
    }
  }

  // ── Fixed assets (US office) ────────────────────────────────────────────
  console.log("  Creating fixed assets...");
  const assetData = [
    {
      name: "MacBook Pro M3 x4",
      class: "equipment",
      location: "Austin HQ",
      cost: "16000",
      life: 36,
    },
    {
      name: "Herman Miller Chairs x4",
      class: "furniture",
      location: "Austin HQ",
      cost: "8000",
      life: 60,
    },
    {
      name: "Standing Desks x6",
      class: "furniture",
      location: "Austin HQ",
      cost: "4800",
      life: 84,
    },
    {
      name: "27in Monitors x10",
      class: "equipment",
      location: "Austin HQ",
      cost: "3500",
      life: 36,
    },
  ];

  for (let i = 0; i < assetData.length; i++) {
    const a = assetData[i];
    const cost = parseFloat(a.cost);
    const salvage = cost * 0.1;
    const monthlyDep = (cost - salvage) / a.life;
    const monthsDep = i === 0 ? 11 : 9;
    const accumDep = monthlyDep * monthsDep;
    const nbv = cost - accumDep;
    await db
      .insert(fixedAssets)
      .values({
        id: seedUuid("fa", i + 1),
        entityId: ENTITY_ID,
        name: a.name,
        assetClass: a.class,
        location: a.location,
        purchaseDate: "2025-08-01",
        cost: a.cost,
        salvageValue: salvage.toFixed(2),
        usefulLifeMonths: a.life,
        depreciationMethod: "straight_line",
        accumulatedDepreciation: Math.min(accumDep, cost - salvage).toFixed(2),
        netBookValue: nbv.toFixed(2),
        status: "active",
        glAccountId: ACCT.fixedAsset,
        accumulatedDepreciationAccountId: ACCT.accumDepreciation,
        responsiblePerson: "David Kim",
        condition: "good",
      })
      .onConflictDoNothing();
  }

  // ── Warehouses & inventory ──────────────────────────────────────────────
  console.log("  Creating warehouses and inventory...");
  const warehouseIds: string[] = [];
  const whNames = ["Austin HQ Storage", "Remote Depot"];
  for (let whi = 0; whi < whNames.length; whi++) {
    const wid = seedUuid("wh", whi + 1);
    warehouseIds.push(wid);
    await db
      .insert(warehouses)
      .values({
        id: wid,
        entityId: ENTITY_ID,
        name: whNames[whi],
        location: "Austin, TX",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const inventoryData = [
    {
      name: "Dell XPS 15 Laptops",
      sku: "LAPTOP-DELL",
      category: "electronics",
      unit: "unit",
      cost: "1500",
      qty: 8,
    },
    {
      name: "Ergonomic Chairs",
      sku: "CHAIR-ERGO",
      category: "furniture",
      unit: "unit",
      cost: "600",
      qty: 12,
    },
    {
      name: "Standing Desks",
      sku: "DESK-STAND",
      category: "furniture",
      unit: "unit",
      cost: "800",
      qty: 6,
    },
    {
      name: "Monitor 27 inch",
      sku: "MON-27",
      category: "electronics",
      unit: "unit",
      cost: "350",
      qty: 10,
    },
    {
      name: "Wireless Keyboards",
      sku: "KEY-WL",
      category: "electronics",
      unit: "unit",
      cost: "120",
      qty: 25,
    },
  ];

  const inventoryItemIds: string[] = [];
  for (let i = 0; i < inventoryData.length; i++) {
    const iid = seedUuid("inv", i + 1);
    inventoryItemIds.push(iid);
    const item = inventoryData[i];
    await db
      .insert(inventoryItems)
      .values({
        id: iid,
        entityId: ENTITY_ID,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unitOfMeasure: item.unit,
        costMethod: "weighted_average",
        standardCost: item.cost,
        reorderLevel: Math.floor(item.qty * 0.25),
        reorderQuantity: Math.floor(item.qty * 0.5),
        quantityOnHand: item.qty,
        glAccountId: ACCT.inventory,
        cogsAccountId: ACCT.cogs,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── Bank accounts ───────────────────────────────────────────────────────
  console.log("  Creating bank accounts...");
  const bankAccountIds: string[] = [];
  const bankAccountData = [
    {
      name: "Chase Business Checking",
      bank: "Chase Bank",
      number: "9876543210",
      type: "checking" as const,
      balance: "486000",
    },
    {
      name: "Chase Business Savings",
      bank: "Chase Bank",
      number: "9876543211",
      type: "savings" as const,
      balance: "120000",
    },
  ];

  for (let i = 0; i < bankAccountData.length; i++) {
    const bid = seedUuid("ba", i + 1);
    bankAccountIds.push(bid);
    const b = bankAccountData[i];
    await db
      .insert(bankAccounts)
      .values({
        id: bid,
        entityId: ENTITY_ID,
        name: b.name,
        bankName: b.bank,
        accountNumber: b.number,
        type: b.type,
        currency: "USD",
        openingBalance: b.balance,
        currentBalance: b.balance,
        isActive: true,
        glAccountId: ACCT.bank,
      })
      .onConflictDoNothing();
  }

  // ── Bank transactions (aligned with the journal entries) ────────────────
  console.log("  Creating bank transactions...");
  const netPay = String(runTotals.net);
  const bankTxData = [
    {
      accountId: bankAccountIds[0],
      date: "2026-05-01",
      type: "deposit" as const,
      amount: "500000",
      desc: "Series Seed round — capital deposit",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-03",
      type: "withdrawal" as const,
      amount: "12000",
      desc: "May office rent — WeWork Austin",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-15",
      type: "deposit" as const,
      amount: "45000",
      desc: "May subscription receipts",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-15",
      type: "withdrawal" as const,
      amount: "9800",
      desc: "AWS cloud hosting",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-18",
      type: "withdrawal" as const,
      amount: "850",
      desc: "May utilities & internet",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-25",
      type: "withdrawal" as const,
      amount: netPay,
      desc: "May payroll (net)",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-05-28",
      type: "withdrawal" as const,
      amount: "3500",
      desc: "LinkedIn Ads — May",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-01",
      type: "withdrawal" as const,
      amount: "12000",
      desc: "June office rent",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-12",
      type: "deposit" as const,
      amount: "62000",
      desc: "June subscription receipts",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-12",
      type: "withdrawal" as const,
      amount: "11200",
      desc: "AWS cloud hosting",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-15",
      type: "withdrawal" as const,
      amount: "920",
      desc: "June utilities",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-20",
      type: "withdrawal" as const,
      amount: "4800",
      desc: "Google Ads — June",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-06-25",
      type: "withdrawal" as const,
      amount: netPay,
      desc: "June payroll (net)",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-01",
      type: "withdrawal" as const,
      amount: "12000",
      desc: "July office rent",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-08",
      type: "withdrawal" as const,
      amount: "1500",
      desc: "SaaS tools (GitHub, Linear, Vercel)",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-14",
      type: "deposit" as const,
      amount: "75000",
      desc: "July subscription receipts",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-14",
      type: "withdrawal" as const,
      amount: "12800",
      desc: "AWS cloud hosting",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-22",
      type: "withdrawal" as const,
      amount: "6200",
      desc: "Social ads — July",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-25",
      type: "withdrawal" as const,
      amount: netPay,
      desc: "July payroll (net)",
    },
    {
      accountId: bankAccountIds[0],
      date: "2026-07-28",
      type: "withdrawal" as const,
      amount: "2800",
      desc: "Travel — client visits",
    },
    {
      accountId: bankAccountIds[1],
      date: "2026-05-10",
      type: "deposit" as const,
      amount: "120000",
      desc: "Transfer to savings (reserve)",
    },
    {
      accountId: bankAccountIds[1],
      date: "2026-07-31",
      type: "interest" as const,
      amount: "450",
      desc: "Savings interest — July",
    },
  ];

  for (let i = 0; i < bankTxData.length; i++) {
    const tx = bankTxData[i];
    await db
      .insert(bankTransactions)
      .values({
        id: seedUuid("btx", i + 1),
        entityId: ENTITY_ID,
        bankAccountId: tx.accountId,
        transactionDate: tx.date,
        type: tx.type,
        amount: tx.amount,
        description: tx.desc,
        isReconciled: i < 16,
        source: "seed",
      })
      .onConflictDoNothing();
  }

  // ── Reconciliation (July) ───────────────────────────────────────────────
  console.log("  Creating reconciliation...");
  const reconId = seedUuid("recon", 1);
  await db
    .insert(reconciliations)
    .values({
      id: reconId,
      entityId: ENTITY_ID,
      bankAccountId: bankAccountIds[0],
      statementDate: "2026-07-31",
      statementBalance: "486000",
      bookBalance: "486000",
      difference: "0",
      status: "closed",
      closedBy: "yc@xenboox.com",
      closedAt: new Date("2026-08-01"),
    })
    .onConflictDoNothing();

  for (let i = 0; i < 16; i++) {
    await db
      .insert(reconciliationItems)
      .values({
        id: seedUuid("ri", i + 1),
        reconciliationId: reconId,
        bankTransactionId: seedUuid("btx", i + 1),
        status: "matched",
        matchedAmount: bankTxData[i].amount,
      })
      .onConflictDoNothing();
  }

  // ── Cash accounts & petty cash ──────────────────────────────────────────
  console.log("  Creating cash accounts and petty cash...");
  const cashAccountIds: string[] = [];
  const cashAccountData = [
    {
      name: "Austin Office Petty Cash",
      balance: "1000",
      glAccountId: ACCT.cash,
    },
  ];

  for (let i = 0; i < cashAccountData.length; i++) {
    const cid = seedUuid("ca", i + 1);
    cashAccountIds.push(cid);
    const c = cashAccountData[i];
    await db
      .insert(cashAccounts)
      .values({
        id: cid,
        entityId: ENTITY_ID,
        name: c.name,
        currency: "USD",
        currentBalance: c.balance,
        glAccountId: c.glAccountId,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const pettyData = [
    {
      date: "2026-05-01",
      type: "receipt" as const,
      amount: "1000",
      desc: "Opening petty cash float",
      balance: "1000",
    },
    {
      date: "2026-05-12",
      type: "expense" as const,
      amount: "85",
      desc: "Team coffee & snacks",
      balance: "915",
    },
    {
      date: "2026-06-04",
      type: "expense" as const,
      amount: "120",
      desc: "Office birthday celebration",
      balance: "795",
    },
    {
      date: "2026-06-20",
      type: "receipt" as const,
      amount: "500",
      desc: "Petty cash top-up",
      balance: "1295",
    },
    {
      date: "2026-07-10",
      type: "expense" as const,
      amount: "240",
      desc: "Printer paper & ink",
      balance: "1055",
    },
    {
      date: "2026-07-24",
      type: "expense" as const,
      amount: "55",
      desc: "Taxi reimbursements",
      balance: "1000",
    },
  ];

  for (let i = 0; i < pettyData.length; i++) {
    const p = pettyData[i];
    await db
      .insert(pettyCashLedger)
      .values({
        id: seedUuid("pcl", i + 1),
        entityId: ENTITY_ID,
        cashAccountId: cashAccountIds[0],
        transactionDate: p.date,
        description: p.desc,
        debit: p.type === "receipt" ? p.amount : "0",
        credit: p.type === "expense" ? p.amount : "0",
        balance: p.balance,
        category: p.type === "expense" ? "office_supplies" : "replenishment",
      })
      .onConflictDoNothing();
  }

  // ── Wise (money movement) ───────────────────────────────────────────────
  console.log("  Creating Wise account and transactions...");
  const mmAccountIds: string[] = [];
  const mmAccountData = [
    {
      provider: "wave" as const,
      name: "Northwind Labs — Wave Business (payments)",
      phone: "+15551234567",
      balance: "12000",
    },
  ];

  for (let i = 0; i < mmAccountData.length; i++) {
    const mid = seedUuid("mma", i + 1);
    mmAccountIds.push(mid);
    const m = mmAccountData[i];
    await db
      .insert(mobileMoneyAccounts)
      .values({
        id: mid,
        entityId: ENTITY_ID,
        provider: m.provider,
        accountName: m.name,
        phoneNumber: m.phone,
        currentBalance: m.balance,
        currency: "USD",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const mmTxData = [
    {
      accountId: mmAccountIds[0],
      type: "collection" as const,
      amount: "28000",
      fee: "140",
      counterparty: "BetaStream Corp",
      desc: "INV-2026-202 payment (ACH via Wise)",
      status: "successful" as const,
    },
    {
      accountId: mmAccountIds[0],
      type: "collection" as const,
      amount: "12250",
      fee: "61",
      counterparty: "DeltaScale Inc",
      desc: "INV-2026-204 partial payment",
      status: "successful" as const,
    },
    {
      accountId: mmAccountIds[0],
      type: "transfer" as const,
      amount: "40000",
      fee: "200",
      counterparty: "Chase Bank",
      desc: "Transfer to Chase checking",
      status: "successful" as const,
    },
  ];

  for (let i = 0; i < mmTxData.length; i++) {
    const tx = mmTxData[i];
    const netAmount = parseFloat(tx.amount) - parseFloat(tx.fee);
    await db
      .insert(mobileMoneyTransactions)
      .values({
        id: seedUuid("mtx", i + 1),
        entityId: ENTITY_ID,
        mobileMoneyAccountId: tx.accountId,
        providerTxId: `WISE${String(i + 1).padStart(6, "0")}`,
        type: tx.type,
        amount: tx.amount,
        fee: tx.fee,
        netAmount: String(netAmount),
        counterparty: tx.counterparty,
        description: tx.desc,
        status: tx.status,
        initiatedAt: new Date("2026-07-10T10:00:00Z"),
        completedAt:
          tx.status === "successful" ? new Date("2026-07-10T10:01:00Z") : null,
      })
      .onConflictDoNothing();
  }

  // ── Purchase orders ─────────────────────────────────────────────────────
  console.log("  Creating purchase orders...");
  const poData = [
    {
      supplierId: supplierIds[0],
      number: "PO-2026-101",
      date: "2026-05-02",
      status: "received" as const,
      amount: "8500",
    },
    {
      supplierId: supplierIds[1],
      number: "PO-2026-102",
      date: "2026-06-02",
      status: "received" as const,
      amount: "4200",
    },
    {
      supplierId: supplierIds[2],
      number: "PO-2026-103",
      date: "2026-06-10",
      status: "received" as const,
      amount: "2100",
    },
    {
      supplierId: supplierIds[0],
      number: "PO-2026-104",
      date: "2026-07-05",
      status: "approved" as const,
      amount: "15000",
    },
  ];

  for (let i = 0; i < poData.length; i++) {
    const pid = seedUuid("po", i + 1);
    const p = poData[i];
    await db
      .insert(purchaseOrders)
      .values({
        id: pid,
        entityId: ENTITY_ID,
        supplierId: p.supplierId,
        poNumber: p.number,
        orderDate: p.date,
        expectedDate: `2026-${String(parseInt(p.date.split("-")[1]) + 1).padStart(2, "0")}-${p.date.split("-")[2]}`,
        status: p.status,
        totalAmount: p.amount,
        currency: "USD",
        approvedBy: "yc@xenboox.com",
      })
      .onConflictDoNothing();

    await db
      .insert(poLines)
      .values({
        purchaseOrderId: pid,
        accountId: ACCT.inventory,
        description: `${p.number} — equipment/supplies`,
        quantity: "1",
        unitPrice: p.amount,
        amount: p.amount,
      })
      .onConflictDoNothing();
  }

  // ── AP payments ─────────────────────────────────────────────────────────
  console.log("  Creating AP payments...");
  const apPaymentData = [
    {
      invoiceIdx: 0,
      amount: "8500",
      method: "bank_transfer" as const,
      date: "2026-05-20",
      ref: "WIRE-2026-0501",
    },
    {
      invoiceIdx: 1,
      amount: "4200",
      method: "bank_transfer" as const,
      date: "2026-06-05",
      ref: "WIRE-2026-0601",
    },
    {
      invoiceIdx: 2,
      amount: "2100",
      method: "card" as const,
      date: "2026-06-15",
      ref: "CARD-2026-0615",
    },
    {
      invoiceIdx: 3,
      amount: "6000",
      method: "bank_transfer" as const,
      date: "2026-07-01",
      ref: "WIRE-2026-0701",
    },
  ];

  for (let i = 0; i < apPaymentData.length; i++) {
    const p = apPaymentData[i];
    await db
      .insert(paymentsAp)
      .values({
        id: seedUuid("apy", i + 1),
        entityId: ENTITY_ID,
        invoiceApId: apInvIds[p.invoiceIdx],
        amount: p.amount,
        paymentDate: p.date,
        method: p.method,
        reference: p.ref,
        notes: `Payment for ${apInvoiceData[p.invoiceIdx].no}`,
      })
      .onConflictDoNothing();
  }

  // ── AR payments ─────────────────────────────────────────────────────────
  console.log("  Creating AR payments...");
  const arPaymentData = [
    {
      invoiceIdx: 0,
      amount: "45000",
      method: "bank_transfer" as const,
      date: "2026-05-20",
      ref: "WIRE-2026-0502",
    },
    {
      invoiceIdx: 1,
      amount: "28000",
      method: "card" as const,
      date: "2026-06-02",
      ref: "CARD-2026-0602",
    },
    {
      invoiceIdx: 2,
      amount: "62000",
      method: "bank_transfer" as const,
      date: "2026-06-18",
      ref: "WIRE-2026-0618",
    },
    {
      invoiceIdx: 3,
      amount: "12250",
      method: "bank_transfer" as const,
      date: "2026-07-10",
      ref: "WIRE-2026-0710",
    },
  ];

  for (let i = 0; i < arPaymentData.length; i++) {
    const p = arPaymentData[i];
    await db
      .insert(paymentsAr)
      .values({
        id: seedUuid("ary", i + 1),
        entityId: ENTITY_ID,
        salesInvoiceId: arInvIds[p.invoiceIdx],
        amount: p.amount,
        paymentDate: p.date,
        method: p.method,
        reference: p.ref,
        notes: `Payment for ${arInvoiceData[p.invoiceIdx].no}`,
      })
      .onConflictDoNothing();
  }

  // ── Inventory transactions ──────────────────────────────────────────────
  console.log("  Creating inventory transactions...");
  const invTxData = [
    {
      itemId: 0,
      wh: 0,
      type: "receipt" as const,
      qty: 8,
      cost: "1500",
      date: "2026-05-02",
      ref: "PO-2026-101 received",
    },
    {
      itemId: 0,
      wh: 0,
      type: "issue" as const,
      qty: -2,
      cost: "1500",
      date: "2026-05-15",
      ref: "Deployed to engineering team",
    },
    {
      itemId: 1,
      wh: 0,
      type: "receipt" as const,
      qty: 12,
      cost: "600",
      date: "2026-05-02",
      ref: "PO-2026-101 received",
    },
    {
      itemId: 2,
      wh: 0,
      type: "receipt" as const,
      qty: 6,
      cost: "800",
      date: "2026-06-02",
      ref: "PO-2026-102 received",
    },
    {
      itemId: 3,
      wh: 0,
      type: "receipt" as const,
      qty: 10,
      cost: "350",
      date: "2026-06-10",
      ref: "PO-2026-103 received",
    },
    {
      itemId: 0,
      wh: 0,
      type: "issue" as const,
      qty: -2,
      cost: "1500",
      date: "2026-06-15",
      ref: "Deployed to sales team",
    },
    {
      itemId: 4,
      wh: 0,
      type: "receipt" as const,
      qty: 25,
      cost: "120",
      date: "2026-06-10",
      ref: "PO-2026-103 received",
    },
    {
      itemId: 1,
      wh: 0,
      type: "issue" as const,
      qty: -4,
      cost: "600",
      date: "2026-07-05",
      ref: "Deployed to new hires",
    },
  ];

  for (let i = 0; i < invTxData.length; i++) {
    const tx = invTxData[i];
    await db
      .insert(inventoryTransactions)
      .values({
        entityId: ENTITY_ID,
        inventoryItemId: inventoryItemIds[tx.itemId],
        warehouseId: warehouseIds[tx.wh],
        type: tx.type,
        quantity: tx.qty,
        unitCost: tx.cost,
        totalCost: String(Math.abs(tx.qty) * parseFloat(tx.cost)),
        transactionDate: tx.date,
        notes: tx.ref,
      })
      .onConflictDoNothing();
  }

  // ── Documents ───────────────────────────────────────────────────────────
  console.log("  Creating documents...");
  const docData = [
    {
      name: "INV-2026-201-Acme.pdf",
      type: "invoice" as const,
      status: "processed" as const,
      size: 245000,
      date: "2026-05-10",
    },
    {
      name: "Bank-Statement-May2026.pdf",
      type: "bank_statement" as const,
      status: "processed" as const,
      size: 480000,
      date: "2026-05-31",
    },
    {
      name: "INV-2026-203-Gamma.pdf",
      type: "invoice" as const,
      status: "processed" as const,
      size: 260000,
      date: "2026-06-08",
    },
    {
      name: "Bank-Statement-Jun2026.pdf",
      type: "bank_statement" as const,
      status: "processed" as const,
      size: 510000,
      date: "2026-06-30",
    },
    {
      name: "INV-2026-205-Acme.pdf",
      type: "invoice" as const,
      status: "processed" as const,
      size: 270000,
      date: "2026-07-05",
    },
    {
      name: "Bank-Statement-Jul2026.pdf",
      type: "bank_statement" as const,
      status: "processed" as const,
      size: 490000,
      date: "2026-07-31",
    },
    {
      name: "Payroll-July-2026.xlsx",
      type: "payroll_report" as const,
      status: "uploaded" as const,
      size: 85000,
      date: "2026-07-25",
    },
    {
      name: "Contract-LegalEase-2026.pdf",
      type: "contract" as const,
      status: "processed" as const,
      size: 520000,
      date: "2026-05-01",
    },
  ];

  for (let i = 0; i < docData.length; i++) {
    const d = docData[i];
    await db
      .insert(documents)
      .values({
        id: seedUuid("doc", i + 1),
        entityId: ENTITY_ID,
        name: d.name,
        type: d.type,
        status: d.status,
        mimeType: d.name.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: d.size,
        r2Key: `${ENTITY_ID}/documents/${d.name}`,
        r2Bucket: "xenboox-uploads",
        uploadedBy: USER_ID,
        tags: [d.type],
      })
      .onConflictDoNothing();
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  console.log("  Creating audit log entries...");
  const auditEntries = [
    {
      date: "2026-05-01",
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted opening balances — Series Seed round",
    },
    {
      date: "2026-05-05",
      action: "invoice_ap.created",
      entityType: "invoice_ap",
      desc: "Created INV-2026-101 — TechSupply",
    },
    {
      date: "2026-05-10",
      action: "invoice_ar.created",
      entityType: "sales_invoice",
      desc: "Created INV-2026-201 for Acme ($45,000)",
    },
    {
      date: "2026-05-15",
      action: "payment.processed",
      entityType: "payment",
      desc: "Received $45,000 from Acme",
    },
    {
      date: "2026-05-20",
      action: "bank.reconciliation",
      entityType: "reconciliation",
      desc: "May bank reconciliation completed",
    },
    {
      date: "2026-06-01",
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted June rent payment",
    },
    {
      date: "2026-06-03",
      action: "invoice_ap.created",
      entityType: "invoice_ap",
      desc: "Created INV-2026-103 — Office Essentials",
    },
    {
      date: "2026-06-08",
      action: "invoice_ar.created",
      entityType: "sales_invoice",
      desc: "Created INV-2026-203 for GammaVentures ($62,000)",
    },
    {
      date: "2026-06-12",
      action: "payment.processed",
      entityType: "payment",
      desc: "Received $62K in June subscription receipts",
    },
    {
      date: "2026-06-18",
      action: "expense.approved",
      entityType: "expense_claim",
      desc: "Approved cloud infrastructure spend",
    },
    {
      date: "2026-06-25",
      action: "payroll.approved",
      entityType: "payroll_run",
      desc: "June payroll approved — 4 employees",
    },
    {
      date: "2026-07-01",
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted July rent and payroll",
    },
    {
      date: "2026-07-05",
      action: "invoice_ar.created",
      entityType: "sales_invoice",
      desc: "Created INV-2026-205 for Acme ($42K)",
    },
    {
      date: "2026-07-14",
      action: "payment.processed",
      entityType: "payment",
      desc: "Received $75K in July subscription receipts",
    },
    {
      date: "2026-07-25",
      action: "payroll.approved",
      entityType: "payroll_run",
      desc: "July payroll approved — 4 employees",
    },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    await db
      .insert(auditLog)
      .values({
        id: seedUuid("audit", i + 1),
        entityId: ENTITY_ID,
        userId: USER_ID,
        action: entry.action,
        entityType: entry.entityType,
        newValues: { description: entry.desc },
        confidence: "0.95",
        ipAddress: "10.0.0.1",
        userAgent: "Xenboox/1.0",
      })
      .onConflictDoNothing();
  }

  // ── Agent activity ──────────────────────────────────────────────────────
  console.log("  Creating agent activity entries...");
  const agentActivities = [
    {
      agent: "cfo",
      action: "Generated executive briefing for Q2",
      entity: "report",
      status: "success" as const,
      confidence: "0.96",
    },
    {
      agent: "ledger",
      action: "Posted 22 journal entries for Q2",
      entity: "journal_entry",
      status: "success" as const,
      confidence: "1.00",
    },
    {
      agent: "ar",
      action: "Sent payment reminders to 2 overdue customers",
      entity: "sales_invoice",
      status: "success" as const,
      confidence: "0.92",
    },
    {
      agent: "ap",
      action: "Processed 8 supplier invoices",
      entity: "ap_invoice",
      status: "success" as const,
      confidence: "0.94",
    },
    {
      agent: "reconciliation",
      action: "Completed July bank reconciliation",
      entity: "reconciliation",
      status: "success" as const,
      confidence: "0.98",
    },
    {
      agent: "payroll_worker",
      action: "Processed July payroll for 4 employees",
      entity: "payroll_run",
      status: "success" as const,
      confidence: "0.97",
    },
    {
      agent: "tax",
      action: "Filed Q2 estimated tax payment",
      entity: "tax_filing",
      status: "success" as const,
      confidence: "0.93",
    },
    {
      agent: "document",
      action: "OCR processed 8 documents",
      entity: "document",
      status: "success" as const,
      confidence: "0.91",
    },
    {
      agent: "analytics",
      action: "Detected 27% MRR growth MoM",
      entity: "analytics",
      status: "success" as const,
      confidence: "0.89",
    },
    {
      agent: "inventory",
      action: "Flagged low stock on keyboards",
      entity: "inventory",
      status: "success" as const,
      confidence: "0.95",
    },
  ];

  for (let i = 0; i < agentActivities.length; i++) {
    const activity = agentActivities[i];
    await db
      .insert(agentActivity)
      .values({
        id: seedUuid("act", i + 1),
        entityId: ENTITY_ID,
        agentName: activity.agent,
        action: activity.action,
        status: activity.status,
        confidence: activity.confidence,
        durationMs: 900 + Math.floor(Math.random() * 600),
      })
      .onConflictDoNothing();
  }

  // ── Currencies & exchange rates ─────────────────────────────────────────
  console.log("  Creating currencies and exchange rates...");
  const currencyData = [
    { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
    { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
    { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
  ];

  for (const curr of currencyData) {
    await db
      .insert(currencies)
      .values({
        code: curr.code,
        name: curr.name,
        symbol: curr.symbol,
        decimalPlaces: curr.decimalPlaces,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const exchangeRateData = [
    { from: "EUR", to: "USD", rate: "1.08", source: "ecb", month: 5 },
    { from: "GBP", to: "USD", rate: "1.27", source: "ecb", month: 5 },
    { from: "EUR", to: "USD", rate: "1.07", source: "ecb", month: 6 },
    { from: "GBP", to: "USD", rate: "1.26", source: "ecb", month: 6 },
    { from: "EUR", to: "USD", rate: "1.09", source: "ecb", month: 7 },
    { from: "GBP", to: "USD", rate: "1.28", source: "ecb", month: 7 },
  ];

  for (let i = 0; i < exchangeRateData.length; i++) {
    const er = exchangeRateData[i];
    await db
      .insert(exchangeRates)
      .values({
        id: seedUuid("er", i + 1),
        fromCurrency: er.from,
        toCurrency: er.to,
        rate: er.rate,
        source: er.source,
        validFrom: new Date(2026, er.month - 1, 1),
      })
      .onConflictDoNothing();
  }

  // ── Conversations ───────────────────────────────────────────────────────
  console.log("  Creating conversations...");
  const conversationData = [
    {
      title: "Q2 Revenue Review",
      date: "2026-07-02",
      messages: [
        { role: "user" as const, content: "How did Q2 revenue look?" },
        {
          role: "assistant" as const,
          content:
            "Q2 revenue totaled $287,000 across 7 invoices. July was your strongest month at $117K MRR, up 21% from June. Acme Startup Labs remains your largest customer at 30% of revenue. Collection rate improved to 92%.",
        },
      ],
    },
    {
      title: "Cash Position Discussion",
      date: "2026-07-05",
      messages: [
        {
          role: "user" as const,
          content: "What is our current cash position?",
        },
        {
          role: "assistant" as const,
          content:
            "You have $486,000 in checking and $120,000 in savings ($606K total). After accounting for $28.8K in pending AP and $117K in pending AR, your net liquid position is ~$694K. You're well capitalized for the next 18+ months.",
        },
      ],
    },
    {
      title: "Payroll Planning",
      date: "2026-07-20",
      messages: [
        { role: "user" as const, content: "Confirm July payroll numbers" },
        {
          role: "assistant" as const,
          content: `July payroll: 4 employees, gross $${runTotals.gross.toLocaleString()}, total deductions $${runTotals.ded.toLocaleString()} (FIT, FICA, 401(k), health), net $${runTotals.net.toLocaleString()}. Employer FICA adds $${runTotals.employer.toLocaleString()}. Ready for approval.`,
        },
      ],
    },
    {
      title: "Tax Obligations",
      date: "2026-07-15",
      messages: [
        {
          role: "user" as const,
          content: "What are our upcoming tax deadlines?",
        },
        {
          role: "assistant" as const,
          content:
            "Q2 estimated federal tax payment of $18,500 is due July 15. Payroll tax deposits (FIT/FICA) for June are due August 1. As a Texas company there is no state income tax. I recommend scheduling the Q2 payment by July 12 to avoid penalties.",
        },
      ],
    },
    {
      title: "Expense Analysis",
      date: "2026-07-10",
      messages: [
        {
          role: "user" as const,
          content: "Show me where we are spending the most",
        },
        {
          role: "assistant" as const,
          content: `Top expense categories for the quarter: Payroll $${(runTotals.gross * 3).toLocaleString()} (78%), Office rent $36,000 (8.5%), Cloud hosting (AWS) $33,800 (8%), Marketing $14,500 (3.4%). Burn rate is ~$90K/month against ~$100K MRR — trending toward breakeven.`,
        },
      ],
    },
  ];

  const userId = USER_ID;
  for (let i = 0; i < conversationData.length; i++) {
    const conv = conversationData[i];
    const convId = seedUuid("conv", i + 1);
    await db
      .insert(conversations)
      .values({
        id: convId,
        entityId: ENTITY_ID,
        userId: userId,
        title: conv.title,
        status: "active",
        lastMessageAt: new Date(conv.date),
        messageCount: conv.messages.length,
      })
      .onConflictDoNothing();

    for (let m = 0; m < conv.messages.length; m++) {
      const msg = conv.messages[m];
      const msgId = seedUuid("msg", i * 10 + m + 1);
      await db
        .insert(chatMessages)
        .values({
          id: msgId,
          conversationId: convId,
          role: msg.role,
          content: msg.content,
          status: "completed",
          confidence: msg.role === "assistant" ? 0.94 : null,
          agentModel: msg.role === "assistant" ? "claude-sonnet-4-6" : null,
          tokenCount: msg.content.length,
          latencyMs:
            msg.role === "assistant"
              ? 1200 + Math.floor(Math.random() * 800)
              : null,
        })
        .onConflictDoNothing();
    }
  }

  // ── Notifications ───────────────────────────────────────────────────────
  console.log("  Creating notifications...");
  const notificationsData = [
    {
      title: "Invoice Overdue",
      body: "INV-2026-105 from LegalEase Partners is 5 days overdue ($5,500)",
      type: "overdue_invoice",
      priority: "high",
      read: false,
    },
    {
      title: "Payroll Approved",
      body: "July payroll has been approved and is ready for payment",
      type: "payroll_processed",
      priority: "medium",
      read: true,
    },
    {
      title: "Tax Deadline Approaching",
      body: "Q2 estimated tax payment due in 3 days",
      type: "system_alert",
      priority: "high",
      read: false,
    },
    {
      title: "Reconciliation Complete",
      body: "July bank reconciliation completed with zero difference",
      type: "recon_discrepancy",
      priority: "low",
      read: true,
    },
    {
      title: "Revenue Milestone",
      body: "Monthly revenue exceeded $100K for the first time in July",
      type: "report_ready",
      priority: "medium",
      read: true,
    },
    {
      title: "Invoice Sent",
      body: "INV-2026-205 sent to Acme Startup Labs — $42,000",
      type: "invoice_sent",
      priority: "medium",
      read: true,
    },
  ];

  for (let i = 0; i < notificationsData.length; i++) {
    const notif = notificationsData[i];
    await db
      .insert(notifications)
      .values({
        userId: userId,
        entityId: ENTITY_ID,
        title: notif.title,
        body: notif.body,
        type: notif.type,
        priority: notif.priority,
        read: notif.read,
        status: notif.read ? "read" : "pending",
      })
      .onConflictDoNothing();
  }

  // ── Report requests ─────────────────────────────────────────────────────
  console.log("  Creating report requests...");
  const reportData = [
    {
      type: "profit_and_loss" as const,
      status: "completed" as const,
      period: "2026-05",
    },
    {
      type: "balance_sheet" as const,
      status: "completed" as const,
      period: "2026-05",
    },
    {
      type: "cash_flow" as const,
      status: "completed" as const,
      period: "2026-05",
    },
    {
      type: "profit_and_loss" as const,
      status: "completed" as const,
      period: "2026-06",
    },
    {
      type: "balance_sheet" as const,
      status: "completed" as const,
      period: "2026-06",
    },
    {
      type: "cash_flow" as const,
      status: "completed" as const,
      period: "2026-06",
    },
    {
      type: "profit_and_loss" as const,
      status: "completed" as const,
      period: "2026-07",
    },
    {
      type: "balance_sheet" as const,
      status: "completed" as const,
      period: "2026-07",
    },
  ];

  for (let i = 0; i < reportData.length; i++) {
    const report = reportData[i];
    const periodRow = periodIds.find(
      (_, idx) => periodMonths[idx] === parseInt(report.period.split("-")[1]),
    );
    await db
      .insert(reportRequests)
      .values({
        id: seedUuid("rpt", i + 1),
        entityId: ENTITY_ID,
        statementType: report.type,
        status: report.status,
        requestedByUserId: userId,
        periodId: periodRow!,
        metadata: { period: report.period },
      })
      .onConflictDoNothing();
  }

  // ── Agent routing logs ──────────────────────────────────────────────────
  console.log("  Creating agent routing logs...");
  const routingLogs = [
    {
      date: "2026-05-03",
      intent: "invoice_classification",
      summary: "Classified INV-2026-101 — TechSupply",
      decision: "auto",
      confidence: "0.940",
    },
    {
      date: "2026-05-10",
      intent: "payment_collection",
      summary: "Sent payment reminder to Acme",
      decision: "auto",
      confidence: "0.890",
    },
    {
      date: "2026-05-20",
      intent: "bank_reconciliation",
      summary: "Matched 8 bank transactions to journal entries",
      decision: "auto",
      confidence: "0.960",
    },
    {
      date: "2026-06-01",
      intent: "payroll_calculation",
      summary: "Calculated May payroll — 4 employees (US tax withholdings)",
      decision: "auto",
      confidence: "0.980",
    },
    {
      date: "2026-06-12",
      intent: "invoice_created",
      summary: "Created INV-2026-203 for GammaVentures",
      decision: "auto",
      confidence: "0.950",
    },
    {
      date: "2026-06-18",
      intent: "expense_approval",
      summary: "AWS infrastructure spend flagged for approval",
      decision: "escalated",
      confidence: "0.720",
    },
    {
      date: "2026-06-25",
      intent: "payroll_approval",
      summary: "June payroll ready for approval",
      decision: "escalated",
      confidence: "0.850",
    },
    {
      date: "2026-07-01",
      intent: "close.started",
      summary: "July close checklist initiated",
      decision: "auto",
      confidence: "0.930",
    },
    {
      date: "2026-07-14",
      intent: "collection_prediction",
      summary: "Predicted 92% collection rate for July AR",
      decision: "auto",
      confidence: "0.870",
    },
    {
      date: "2026-07-20",
      intent: "expense_anomaly",
      summary: "Travel expense $2.8K exceeds monthly average",
      decision: "escalated",
      confidence: "0.650",
    },
  ];

  for (let i = 0; i < routingLogs.length; i++) {
    const log = routingLogs[i];
    await db
      .insert(agentRoutingLogs)
      .values({
        id: seedUuid("route", i + 1),
        entityId: ENTITY_ID,
        userId: userId,
        intentType: log.intent,
        inputSummary: log.summary,
        confidence: log.confidence,
        thresholdUsed: "0.700",
        decision: log.decision,
        agentsInvolved: ["cfo", "ledger"],
        durationMs: String(800 + Math.floor(Math.random() * 1200)),
      })
      .onConflictDoNothing();
  }

  // ── Close sessions ──────────────────────────────────────────────────────
  console.log("  Creating close sessions...");
  const closeSessionsData = [
    {
      year: 2026,
      month: 5,
      label: "2026-05",
      status: "locked" as const,
      closedAt: new Date("2026-06-05"),
    },
    {
      year: 2026,
      month: 6,
      label: "2026-06",
      status: "locked" as const,
      closedAt: new Date("2026-07-04"),
    },
    {
      year: 2026,
      month: 7,
      label: "2026-07",
      status: "in_progress" as const,
      closedAt: null,
    },
  ];

  for (let i = 0; i < closeSessionsData.length; i++) {
    const cs = closeSessionsData[i];
    const periodRow = periodIds.find(
      (_, idx) => periodMonths[idx] === cs.month,
    );
    if (!periodRow) continue;
    await db
      .insert(closeSessions)
      .values({
        id: seedUuid("close", i + 1),
        entityId: ENTITY_ID,
        fiscalPeriodId: periodRow,
        periodLabel: cs.label,
        status: cs.status,
        triggeredByUserId: userId,
        closedAt: cs.closedAt,
      })
      .onConflictDoNothing();
  }

  // ── Platform-level seeds (idempotent, run once) ─────────────────────────
  await seedAgents();
  await seedGoldenEvals();
  await seedPermissions();

  console.log("\n========================================");
  console.log("YC seed complete!");
  console.log(`  User: yc@xenboox.com (verified)`);
  console.log(`  Password: demo1234`);
  console.log(`  Company: Northwind Labs Inc. (US, USD)`);
  console.log(`  Entity: ${ENTITY_ID}`);
  console.log(`  Periods: May, Jun, Jul 2026`);
  console.log(`  Journal Entries: ${journalData.length}`);
  console.log(`  Suppliers: ${supplierData.length}`);
  console.log(`  Customers: ${customerData.length}`);
  console.log(`  AP Invoices: ${apInvoiceData.length}`);
  console.log(`  AR Invoices: ${arInvoiceData.length}`);
  console.log(`  Employees: ${employeeData.length}`);
  console.log(
    `  Payroll Runs: ${payrollRunData.length} (gross $${runTotals.gross.toLocaleString()}/mo)`,
  );
  console.log(`  Bank Accounts: ${bankAccountData.length}`);
  console.log(`  Bank Transactions: ${bankTxData.length}`);
  console.log(`  Fixed Assets: ${assetData.length}`);
  console.log(`  Inventory Items: ${inventoryData.length}`);
  console.log(`  Documents: ${docData.length}`);
  console.log("========================================");
}

if (shouldRunDirect()) {
  seedYc()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("YC seed failed:", err);
      process.exit(1);
    });
}
