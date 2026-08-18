/**
 * Seed multiple demo companies with varying historical data depths.
 *
 * Creates 10 users with realistic companies:
 *   1. Fresh startup — 1 day of data
 *   2. New company — 1 week of data
 *   3. Growing startup — 2 weeks of data
 *   4. Early stage — 3 weeks of data
 *   5. Established — 1 month of data
 *   6. Mid stage — 2 months of data
 *   7. Mature — 3 months of data
 *   8. Growing — 4 months of data
 *   9. Expanding — 5 months of data
 *  10. Full history — 6 months of data
 *
 * Run: cd packages/db && npx tsx seed/seed-multi-users.ts
 */

import { db } from "../index";
import { organizations, entities } from "../schema/organization";
import { users } from "../schema/auth";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  findOrCreateUser,
  findOrCreateOrg,
  resetEntity,
  grantAccess,
  setLastUsedEntity,
  idFromKey,
  DEMO_PASSWORD_HASH,
} from "./seed-lib";
import {
  chartOfAccounts,
  bankAccounts,
  suppliers,
  customers,
  employees,
  inventoryItems,
  bankTransactions,
  invoicesAp,
  salesInvoices,
  journalEntries,
  journalEntryLines,
  payrollRuns,
  documents,
  fiscalPeriods,
} from "../schema";

// ─── Company definitions with varying ages ───────────────────────────────────

interface CompanyDef {
  email: string;
  name: string;
  companyName: string;
  slug: string;
  currency: string;
  country: string;
  ageDays: number;
  plan: "free" | "starter" | "growth" | "pro" | "firm";
}

const COMPANIES: CompanyDef[] = [
  {
    email: "fresh@demo.xenboox.com",
    name: "Fresh Startup",
    companyName: "Fresh Startup Ltd",
    slug: "fresh-startup",
    currency: "GMD",
    country: "GM",
    ageDays: 1,
    plan: "free",
  },
  {
    email: "newco@demo.xenboox.com",
    name: "New Company",
    companyName: "New Co Trading",
    slug: "newco-trading",
    currency: "GMD",
    country: "GM",
    ageDays: 7,
    plan: "starter",
  },
  {
    email: "growing@demo.xenboox.com",
    name: "Growing Startup",
    companyName: "Growing Startup Ltd",
    slug: "growing-startup",
    currency: "GMD",
    country: "GM",
    ageDays: 14,
    plan: "starter",
  },
  {
    email: "early@demo.xenboox.com",
    name: "Early Stage Co",
    companyName: "Early Stage Co",
    slug: "early-stage",
    currency: "GMD",
    country: "GM",
    ageDays: 21,
    plan: "growth",
  },
  {
    email: "established@demo.xenboox.com",
    name: "Established Business",
    companyName: "Established Business Ltd",
    slug: "established-business",
    currency: "GMD",
    country: "GM",
    ageDays: 30,
    plan: "growth",
  },
  {
    email: "midsize@demo.xenboox.com",
    name: "Mid Size Co",
    companyName: "Mid Size Co Ltd",
    slug: "midsize-co",
    currency: "GMD",
    country: "GM",
    ageDays: 60,
    plan: "pro",
  },
  {
    email: "mature@demo.xenboox.com",
    name: "Mature Company",
    companyName: "Mature Company Ltd",
    slug: "mature-company",
    currency: "USD",
    country: "US",
    ageDays: 90,
    plan: "pro",
  },
  {
    email: "expanding@demo.xenboox.com",
    name: "Expanding Co",
    companyName: "Expanding Co Ltd",
    slug: "expanding-co",
    currency: "USD",
    country: "US",
    ageDays: 120,
    plan: "firm",
  },
  {
    email: "scaling@demo.xenboox.com",
    name: "Scaling Up",
    companyName: "Scaling Up Ltd",
    slug: "scaling-up",
    currency: "EUR",
    country: "SN",
    ageDays: 150,
    plan: "firm",
  },
  {
    email: "full@demo.xenboox.com",
    name: "Full History Co",
    companyName: "Full History Co Ltd",
    slug: "full-history",
    currency: "GMD",
    country: "GM",
    ageDays: 180,
    plan: "firm",
  },
];

// ─── Data generators ─────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): string {
  return (Math.random() * (max - min) + min).toFixed(decimals);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// ─── Seed a single company with appropriate historical depth ─────────────────

async function seedCompany(company: CompanyDef): Promise<void> {
  console.log(
    `\n━━━ Seeding ${company.companyName} (${company.ageDays} days) ━━━`,
  );

  // 1. Create user + org + entity
  const userId = await findOrCreateUser({
    email: company.email,
    name: company.name,
  });
  const orgId = await findOrCreateOrg({
    userId,
    name: company.companyName,
    slug: company.slug,
    plan: company.plan,
    settings: {
      timezone:
        company.country === "US"
          ? "America/New_York"
          : company.country === "SN"
            ? "Africa/Dakar"
            : "Africa/Banjul",
      locale: company.country === "US" ? "en-US" : "en-GM",
    },
  });

  const entityId = await resetEntity({
    orgId,
    name: company.companyName,
    currency: company.currency,
    country: company.country,
    fiscalYearEnd: "12",
    taxId:
      company.country === "GM"
        ? "GM" + randomInt(100000, 999999)
        : company.country === "US"
          ? "US" + randomInt(100000, 999999)
          : "SN" + randomInt(100000, 999999),
    settings: {
      vatRate:
        company.country === "GM" ? 0.15 : company.country === "SN" ? 0.18 : 0.0,
      defaultPaymentTerms: "net30",
    },
  });

  await grantAccess({
    userId,
    entityId,
    role: "owner",
    grantedBy: userId,
  });
  await setLastUsedEntity(userId, entityId);

  console.log(`  Created: ${company.companyName} (${company.currency})`);

  // 2. Scale data volume by company age
  const age = company.ageDays;
  const numBankTxs = Math.max(2, Math.floor(age * 0.5));
  const numSuppliers = Math.max(1, Math.floor(age / 7));
  const numCustomers = Math.max(1, Math.floor(age / 7));
  const numInvoices = Math.max(1, Math.floor(age / 3));
  const numJournalEntries = Math.max(2, Math.floor(age / 2));
  const numEmployees = Math.max(1, Math.floor(age / 30));
  const numInventoryItems = Math.max(3, Math.floor(age / 5));
  const numPayrollRuns = Math.max(1, Math.floor(age / 30));

  // 3. Chart of Accounts
  const coaCodes = [
    "1010",
    "1020",
    "1100",
    "1200",
    "1500",
    "2010",
    "2100",
    "3010",
    "3020",
    "4010",
    "4020",
    "5010",
    "6010",
    "6020",
    "6030",
  ];
  const coaNames = [
    "Cash on Hand",
    "Bank Account",
    "Accounts Receivable",
    "Inventory",
    "Office Equipment",
    "Accounts Payable",
    "Tax Payable",
    "Owner's Equity",
    "Retained Earnings",
    "Sales Revenue",
    "Service Revenue",
    "COGS",
    "Salaries",
    "Rent",
    "Utilities",
  ];
  const coaTypes = [
    "asset",
    "asset",
    "asset",
    "asset",
    "asset",
    "liability",
    "liability",
    "equity",
    "equity",
    "revenue",
    "revenue",
    "expense",
    "expense",
    "expense",
    "expense",
  ] as const;
  const coaSubtypes = [
    "cash",
    "bank_account",
    "accounts_receivable",
    "inventory",
    "fixed_asset",
    "accounts_payable",
    "tax_liability",
    "owner_equity",
    "retained_earnings",
    "sales_revenue",
    "service_revenue",
    "cost_of_goods_sold",
    "payroll_expense",
    "operating_expense",
    "operating_expense",
  ] as const;

  for (let i = 0; i < coaCodes.length; i++) {
    await db
      .insert(chartOfAccounts)
      .values({
        id: idFromKey(`coa:${company.slug}:${i}`),
        entityId,
        code: coaCodes[i]!,
        name: coaNames[i]!,
        type: coaTypes[i]!,
        subtype: coaSubtypes[i]!,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`  Chart of accounts: ${coaCodes.length} accounts`);

  // 4. Bank Accounts
  const bankNames = ["Main Operating Account", "Savings Account"];
  const bankBalances = [randomFloat(50000, 500000), randomFloat(10000, 100000)];
  for (let i = 0; i < bankNames.length; i++) {
    await db
      .insert(bankAccounts)
      .values({
        id: idFromKey(`bank:${company.slug}:${i}`),
        entityId,
        name: bankNames[i]!,
        bankName: "Trust Bank",
        accountNumber: String(randomInt(1000000000, 9999999999)),
        type: i === 0 ? "checking" : "savings",
        currency: company.currency,
        openingBalance: bankBalances[i]!,
        currentBalance: bankBalances[i]!,
        isActive: true,
        glAccountId: idFromKey(`coa:${company.slug}:1`),
      })
      .onConflictDoNothing();
  }
  console.log(`  Bank accounts: ${bankNames.length}`);

  // 5. Suppliers
  const supplierNames = [
    "Global Supplies Ltd.",
    "Local Vendor Co.",
    "Office Supplies Inc.",
    "Tech Equipment Ltd.",
    "Transport Services",
  ];
  const numSuppliersActual = Math.min(numSuppliers, supplierNames.length);
  for (let i = 0; i < numSuppliersActual; i++) {
    await db
      .insert(suppliers)
      .values({
        id: idFromKey(`supplier:${company.slug}:${i}`),
        entityId,
        name: supplierNames[i]!,
        contactEmail: `supplier${i + 1}@example.com`,
        contactPhone: `+220${randomInt(1000000, 9999999)}`,
        paymentTerms: "net30",
      })
      .onConflictDoNothing();
  }
  console.log(`  Suppliers: ${numSuppliersActual}`);

  // 6. Customers
  const customerNames = [
    "Customer A Ltd.",
    "Customer B Co.",
    "Customer C Inc.",
    "Customer D Ltd.",
    "Customer E Co.",
  ];
  const numCustomersActual = Math.min(numCustomers, customerNames.length);
  for (let i = 0; i < numCustomersActual; i++) {
    await db
      .insert(customers)
      .values({
        id: idFromKey(`customer:${company.slug}:${i}`),
        entityId,
        name: customerNames[i]!,
        contactEmail: `customer${i + 1}@example.com`,
        contactPhone: `+220${randomInt(1000000, 9999999)}`,
        paymentTerms: "net30",
      })
      .onConflictDoNothing();
  }
  console.log(`  Customers: ${numCustomersActual}`);

  // 7. Employees
  const employeeNames = [
    "John Doe",
    "Jane Smith",
    "Bob Johnson",
    "Alice Brown",
  ];
  const numEmployeesActual = Math.min(numEmployees, employeeNames.length);
  for (let i = 0; i < numEmployeesActual; i++) {
    await db
      .insert(employees)
      .values({
        id: idFromKey(`emp:${company.slug}:${i}`),
        entityId,
        employeeNumber: `EMP-${String(i + 1).padStart(3, "0")}`,
        name: employeeNames[i]!,
        email: `emp${i + 1}@${company.slug}.com`,
        hireDate: dateStr(daysAgo(randomInt(30, age))),
        department: pick(["Finance", "Sales", "Operations", "Admin"]),
        jobTitle: pick(["Manager", "Assistant", "Coordinator", "Specialist"]),
        employmentType: "full_time",
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`  Employees: ${numEmployeesActual}`);

  // 8. Inventory Items
  const itemNames = [
    "Product A",
    "Product B",
    "Product C",
    "Product D",
    "Product E",
  ];
  const numItemsActual = Math.min(numInventoryItems, itemNames.length);
  for (let i = 0; i < numItemsActual; i++) {
    await db
      .insert(inventoryItems)
      .values({
        id: idFromKey(`inv:${company.slug}:${i}`),
        entityId,
        name: itemNames[i]!,
        sku: `SKU-${company.slug.slice(0, 3).toUpperCase()}-${i + 1}`,
        category: "general",
        unitOfMeasure: "unit",
        costMethod: "weighted_average",
        standardCost: randomFloat(100, 1000),
        reorderLevel: randomInt(10, 50),
        reorderQuantity: randomInt(20, 100),
        quantityOnHand: randomInt(0, 200),
        glAccountId: idFromKey(`coa:${company.slug}:3`),
        cogsAccountId: idFromKey(`coa:${company.slug}:11`),
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`  Inventory items: ${numItemsActual}`);

  // 9. Bank Transactions (spread across company lifetime)
  const txTypes: Array<{
    type: "deposit" | "withdrawal" | "fee" | "interest";
    desc: string;
  }> = [
    { type: "deposit", desc: "Customer payment" },
    { type: "deposit", desc: "Sales receipt" },
    { type: "withdrawal", desc: "Supplier payment" },
    { type: "withdrawal", desc: "Office expenses" },
    { type: "fee", desc: "Bank service charge" },
    { type: "interest", desc: "Interest earned" },
  ];

  for (let i = 0; i < numBankTxs; i++) {
    const txDate = daysAgo(randomInt(0, age));
    const tx = pick(txTypes);
    const amount = randomFloat(100, 50000);
    await db
      .insert(bankTransactions)
      .values({
        id: idFromKey(`bktx:${company.slug}:${i}`),
        entityId,
        bankAccountId: idFromKey(`bank:${company.slug}:0`),
        transactionDate: dateStr(txDate),
        type: tx.type,
        amount,
        description: tx.desc,
        isReconciled: Math.random() > 0.3,
        source: "seed",
      })
      .onConflictDoNothing();
  }
  console.log(`  Bank transactions: ${numBankTxs}`);

  // 10. AP Invoices
  for (let i = 0; i < numInvoices; i++) {
    const invDate = daysAgo(randomInt(0, age));
    const amount = randomFloat(1000, 100000);
    await db
      .insert(invoicesAp)
      .values({
        id: idFromKey(`apinv:${company.slug}:${i}`),
        entityId,
        supplierId: idFromKey(
          `supplier:${company.slug}:${i % numSuppliersActual}`,
        ),
        invoiceNumber: `AP-${dateStr(invDate).replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
        invoiceDate: dateStr(invDate),
        dueDate: dateStr(daysAgo(-randomInt(1, 30))),
        totalAmount: amount,
        balance: amount,
        currency: company.currency,
        status: pick(["pending", "paid", "overdue"] as const),
      })
      .onConflictDoNothing();
  }
  console.log(`  AP invoices: ${numInvoices}`);

  // 11. AR Invoices
  for (let i = 0; i < numInvoices; i++) {
    const invDate = daysAgo(randomInt(0, age));
    const amount = randomFloat(1000, 100000);
    await db
      .insert(salesInvoices)
      .values({
        id: idFromKey(`arinv:${company.slug}:${i}`),
        entityId,
        customerId: idFromKey(
          `customer:${company.slug}:${i % numCustomersActual}`,
        ),
        invoiceNumber: `AR-${dateStr(invDate).replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
        invoiceDate: dateStr(invDate),
        dueDate: dateStr(daysAgo(-randomInt(1, 30))),
        totalAmount: amount,
        balance: amount,
        currency: company.currency,
        status: pick(["pending", "paid", "overdue"] as const),
      })
      .onConflictDoNothing();
  }
  console.log(`  AR invoices: ${numInvoices}`);

  // 12. Fiscal Periods (needed for journal entries)
  const now = new Date();
  const currentYear = now.getFullYear();
  const periodIds: string[] = [];
  for (let month = 1; month <= 12; month++) {
    const pid = idFromKey(`period:${company.slug}:${month}`);
    periodIds.push(pid);
    const startDate = `${currentYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, month, 0).getDate();
    const endDate = `${currentYear}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const status = month <= now.getMonth() ? "closed" : "open";

    await db
      .insert(fiscalPeriods)
      .values({
        id: pid,
        entityId,
        year: currentYear,
        month,
        startDate,
        endDate,
        status: status as "open" | "closed" | "locked",
      })
      .onConflictDoNothing();
  }
  console.log(`  Fiscal periods: 12 months`);

  // 13. Journal Entries
  const jeDescriptions = [
    "Sales revenue",
    "Supplier payment",
    "Customer receipt",
    "Salary payment",
    "Rent payment",
    "Utilities",
    "Office expenses",
    "Bank deposit",
    "Tax payment",
    "Inventory purchase",
  ];

  for (let i = 0; i < numJournalEntries; i++) {
    const jeDate = daysAgo(randomInt(0, age));
    const amount = randomFloat(1000, 50000);
    const jeMonth = jeDate.getMonth() + 1;
    const periodId = periodIds[Math.min(jeMonth - 1, periodIds.length - 1)]!;
    await db
      .insert(journalEntries)
      .values({
        id: idFromKey(`je:${company.slug}:${i}`),
        entityId,
        entryNumber: i + 1,
        description: pick(jeDescriptions)!,
        date: dateStr(jeDate),
        periodId,
        status: "posted",
        postedBy: company.email,
        postedAt: jeDate,
        source: "seed",
      })
      .onConflictDoNothing();

    // JE lines
    await db
      .insert(journalEntryLines)
      .values({
        id: idFromKey(`jel:${company.slug}:${i}`),
        journalEntryId: idFromKey(`je:${company.slug}:${i}`),
        accountId: idFromKey(
          `coa:${company.slug}:${randomInt(0, coaCodes.length - 1)}`,
        ),
        debit: amount,
        credit: "0",
        description: pick(jeDescriptions)!,
      })
      .onConflictDoNothing();
    await db
      .insert(journalEntryLines)
      .values({
        id: idFromKey(`jel2:${company.slug}:${i}`),
        journalEntryId: idFromKey(`je:${company.slug}:${i}`),
        accountId: idFromKey(
          `coa:${company.slug}:${randomInt(0, coaCodes.length - 1)}`,
        ),
        debit: "0",
        credit: amount,
        description: pick(jeDescriptions)!,
      })
      .onConflictDoNothing();
  }
  console.log(`  Journal entries: ${numJournalEntries}`);

  // 13. Payroll Runs
  for (let i = 0; i < numPayrollRuns; i++) {
    const periodDate = daysAgo(randomInt(0, age));
    const period = dateStr(periodDate).slice(0, 7);
    const gross = randomFloat(50000, 200000);
    const deductions = randomFloat(5000, 30000);
    await db
      .insert(payrollRuns)
      .values({
        id: idFromKey(`payroll:${company.slug}:${i}`),
        entityId,
        period,
        status: pick(["draft", "approved", "paid"] as const),
        employeeCount: numEmployeesActual,
        grossPay: gross,
        totalDeductions: deductions,
        totalEmployerContributions: randomFloat(5000, 20000),
        netPay: String(parseFloat(gross) - parseFloat(deductions)),
        processedBy: company.email,
        approvedBy: Math.random() > 0.5 ? company.email : null,
      })
      .onConflictDoNothing();
  }
  console.log(`  Payroll runs: ${numPayrollRuns}`);

  // 14. Documents
  const docTypes = [
    "invoice",
    "receipt",
    "contract",
    "voucher",
    "bank_statement",
    "supporting",
  ];
  for (let i = 0; i < Math.max(1, Math.floor(age / 7)); i++) {
    const docType = pick(docTypes)!;
    const r2Key = `seed/${company.slug}/${i + 1}.pdf`;
    await db
      .insert(documents)
      .values({
        id: idFromKey(`doc:${company.slug}:${i}`),
        entityId,
        name: `${docType.replace("_", " ")} — ${dateStr(daysAgo(randomInt(0, age)))}`,
        type: docType as
          | "invoice"
          | "receipt"
          | "contract"
          | "voucher"
          | "bank_statement"
          | "supporting",
        status: "synced",
        mimeType: "application/pdf",
        sizeBytes: 120000 + i * 4000,
        r2Key,
        r2Bucket: "xenboox-demo-documents",
        uploadedBy: userId,
        createdAt: daysAgo(randomInt(0, age)),
        updatedAt: daysAgo(randomInt(0, age)),
      })
      .onConflictDoNothing();
  }
  console.log(`  Documents: ${Math.max(1, Math.floor(age / 7))}`);

  console.log(`  ✅ ${company.companyName} seeded successfully`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    "════════════════════════════════════════════════════════════════",
  );
  console.log("XENBOOX — MULTI-USER DEMO SEED");
  console.log(
    "════════════════════════════════════════════════════════════════",
  );
  console.log(
    `Seeding ${COMPANIES.length} companies with varying data depths...`,
  );

  for (const company of COMPANIES) {
    try {
      await seedCompany(company);
    } catch (err) {
      console.error(`  ❌ Failed to seed ${company.companyName}:`, err);
    }
  }

  // Summary
  console.log(
    "\n════════════════════════════════════════════════════════════════",
  );
  console.log("SEED SUMMARY");
  console.log(
    "════════════════════════════════════════════════════════════════",
  );
  for (const company of COMPANIES) {
    console.log(
      `  ${company.email} / demo1234 — ${company.companyName} (${company.ageDays} days)`,
    );
  }
  console.log(
    "════════════════════════════════════════════════════════════════\n",
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
