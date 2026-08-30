/**
 * Seed realistic data for August 2026
 *
 * Creates:
 * - 5 realistic users with Gambian names
 * - 3 organizations (trading, hospitality, consulting)
 * - 3 entities with different currencies
 * - Chart of accounts for each entity
 * - Suppliers and customers
 * - Invoices (AP and AR)
 * - Bank accounts and transactions
 * - Journal entries
 *
 * Usage: pnpm seed:august
 */

import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "../schema/organization";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
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
import { bankAccounts, bankTransactions } from "../schema/treasury";

// ─── Helper Functions ───────────────────────────────────────────────────────

function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function generateId(prefix: string, index: number): string {
  return seedUuid(prefix, index);
}

// ─── User Data ──────────────────────────────────────────────────────────────

const userData = [
  {
    id: generateId("user", 1),
    name: "Fatoumata Ceesay",
    email: "fatoumata@seagulllogistics.gm",
    authProvider: "credentials" as const,
  },
  {
    id: generateId("user", 2),
    name: "Musa Jallow",
    email: "musa@sunufresh.gm",
    authProvider: "credentials" as const,
  },
  {
    id: generateId("user", 3),
    name: "Omar Darboe",
    email: "omar@atlantictraders.gm",
    authProvider: "credentials" as const,
  },
  {
    id: generateId("user", 4),
    name: "Amina Draboe",
    email: "amina@kairaclinics.gm",
    authProvider: "credentials" as const,
  },
  {
    id: generateId("user", 5),
    name: "Lamin Sanyang",
    email: "lamin@lsconsulting.gm",
    authProvider: "credentials" as const,
  },
];

// ─── Organization Data ──────────────────────────────────────────────────────

const orgData = [
  {
    id: generateId("org", 1),
    name: "Seagull Logistics Co. Ltd",
    slug: "seagull-logistics",
    type: "business" as const,
    plan: "business" as const,
    ownerId: generateId("user", 1),
  },
  {
    id: generateId("org", 2),
    name: "SunuFresh Foods Ltd",
    slug: "sunufresh-foods",
    type: "business" as const,
    plan: "starter" as const,
    ownerId: generateId("user", 2),
  },
  {
    id: generateId("org", 3),
    name: "Atlantic Traders International",
    slug: "atlantic-traders",
    type: "business" as const,
    plan: "business" as const,
    ownerId: generateId("user", 3),
  },
];

// ─── Entity Data ────────────────────────────────────────────────────────────

const entityData = [
  {
    id: generateId("entity", 1),
    organizationId: generateId("org", 1),
    name: "Seagull Logistics Gambia",
    type: "company" as const,
    currency: "GMD",
    country: "GM",
    fiscalYearEnd: "12",
  },
  {
    id: generateId("entity", 2),
    organizationId: generateId("org", 2),
    name: "SunuFresh Foods Gambia",
    type: "company" as const,
    currency: "GMD",
    country: "GM",
    fiscalYearEnd: "12",
  },
  {
    id: generateId("entity", 3),
    organizationId: generateId("org", 3),
    name: "Atlantic Traders Gambia",
    type: "company" as const,
    currency: "GMD",
    country: "GM",
    fiscalYearEnd: "12",
  },
  {
    id: generateId("entity", 4),
    organizationId: generateId("org", 3),
    name: "Atlantic Traders Senegal",
    type: "subsidiary" as const,
    currency: "XOF",
    country: "SN",
    fiscalYearEnd: "12",
  },
];

// ─── Chart of Accounts ──────────────────────────────────────────────────────

const chartOfAccountsData = [
  // Assets
  { code: "1010", name: "Cash at Bank", type: "asset", subtype: "current" },
  { code: "1020", name: "Petty Cash", type: "asset", subtype: "current" },
  {
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    subtype: "current",
  },
  { code: "1200", name: "Inventory", type: "asset", subtype: "current" },
  { code: "1300", name: "Prepaid Expenses", type: "asset", subtype: "current" },
  { code: "1500", name: "Fixed Assets", type: "asset", subtype: "non-current" },
  {
    code: "1600",
    name: "Accumulated Depreciation",
    type: "asset",
    subtype: "contra",
  },
  // Liabilities
  {
    code: "2010",
    name: "Accounts Payable",
    type: "liability",
    subtype: "current",
  },
  {
    code: "2020",
    name: "Accrued Expenses",
    type: "liability",
    subtype: "current",
  },
  { code: "2030", name: "VAT Payable", type: "liability", subtype: "current" },
  {
    code: "2100",
    name: "Short-term Loans",
    type: "liability",
    subtype: "current",
  },
  {
    code: "2200",
    name: "Long-term Loans",
    type: "liability",
    subtype: "non-current",
  },
  // Equity
  { code: "3010", name: "Share Capital", type: "equity", subtype: "permanent" },
  {
    code: "3020",
    name: "Retained Earnings",
    type: "equity",
    subtype: "permanent",
  },
  {
    code: "3030",
    name: "Current Year Earnings",
    type: "equity",
    subtype: "temporary",
  },
  // Revenue
  {
    code: "4010",
    name: "Sales Revenue",
    type: "revenue",
    subtype: "operating",
  },
  {
    code: "4020",
    name: "Service Revenue",
    type: "revenue",
    subtype: "operating",
  },
  {
    code: "4030",
    name: "Other Income",
    type: "revenue",
    subtype: "non-operating",
  },
  // Expenses
  {
    code: "5010",
    name: "Cost of Goods Sold",
    type: "expense",
    subtype: "direct",
  },
  {
    code: "5020",
    name: "Salary Expense",
    type: "expense",
    subtype: "operating",
  },
  { code: "5030", name: "Rent Expense", type: "expense", subtype: "operating" },
  {
    code: "5040",
    name: "Utilities Expense",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5050",
    name: "Depreciation Expense",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5060",
    name: "Office Supplies",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5070",
    name: "Travel Expense",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5080",
    name: "Marketing Expense",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5090",
    name: "Insurance Expense",
    type: "expense",
    subtype: "operating",
  },
  {
    code: "5100",
    name: "Interest Expense",
    type: "expense",
    subtype: "financing",
  },
  { code: "5110", name: "Tax Expense", type: "expense", subtype: "operating" },
];

// ─── Supplier Data ──────────────────────────────────────────────────────────

const supplierData = [
  {
    id: generateId("supplier", 1),
    entityId: generateId("entity", 1),
    name: "Gambia Ports Authority",
    contactEmail: "info@gpa.gm",
    contactPhone: "+220 437 0000",
    currency: "GMD",
  },
  {
    id: generateId("supplier", 2),
    entityId: generateId("entity", 1),
    name: "Trust Bank Limited",
    contactEmail: "corporate@trustbank.gm",
    contactPhone: "+220 439 0000",
    currency: "GMD",
  },
  {
    id: generateId("supplier", 3),
    entityId: generateId("entity", 2),
    name: "Fresh Produce Suppliers",
    contactEmail: "orders@freshpro.gm",
    contactPhone: "+220 555 1234",
    currency: "GMD",
  },
  {
    id: generateId("supplier", 4),
    entityId: generateId("entity", 3),
    name: "Dakar Trading Co.",
    contactEmail: "contact@dakartrading.sn",
    contactPhone: "+221 33 800 0000",
    currency: "XOF",
  },
  {
    id: generateId("supplier", 5),
    entityId: generateId("entity", 3),
    name: "Global Shipping Lines",
    contactEmail: "bookings@globallines.com",
    contactPhone: "+1 555 0123",
    currency: "USD",
  },
];

// ─── Customer Data ──────────────────────────────────────────────────────────

const customerData = [
  {
    id: generateId("customer", 1),
    entityId: generateId("entity", 1),
    name: "Kaira Clinics Ltd",
    contactEmail: "accounts@kairaclinics.gm",
    contactPhone: "+220 445 6789",
    currency: "GMD",
  },
  {
    id: generateId("customer", 2),
    entityId: generateId("entity", 1),
    name: "Atlantic Foods Distribution",
    contactEmail: "finance@atlanticfoods.gm",
    contactPhone: "+220 446 7890",
    currency: "GMD",
  },
  {
    id: generateId("customer", 3),
    entityId: generateId("entity", 2),
    name: "Seagull Logistics Co.",
    contactEmail: "procurement@seagulllogistics.gm",
    contactPhone: "+220 437 1000",
    currency: "GMD",
  },
  {
    id: generateId("customer", 4),
    entityId: generateId("entity", 3),
    name: "Banjul Import/Export Ltd",
    contactEmail: "ap@banjulimport.gm",
    contactPhone: "+220 447 8901",
    currency: "GMD",
  },
  {
    id: generateId("customer", 5),
    entityId: generateId("entity", 3),
    name: "West Africa Freight Services",
    contactEmail: "billing@wafreight.com",
    contactPhone: "+233 30 123 4567",
    currency: "GHS",
  },
];

// ─── Bank Account Data ──────────────────────────────────────────────────────

const bankAccountData = [
  {
    id: generateId("bank", 1),
    entityId: generateId("entity", 1),
    name: "Trust Bank - Main Account",
    bankName: "Trust Bank Limited",
    accountNumber: "1234567890",
    currency: "GMD",
    balance: "2450000.00",
  },
  {
    id: generateId("bank", 2),
    entityId: generateId("entity", 1),
    name: "GTBank - USD Account",
    bankName: "Guaranty Trust Bank",
    accountNumber: "0987654321",
    currency: "USD",
    balance: "15000.00",
  },
  {
    id: generateId("bank", 3),
    entityId: generateId("entity", 2),
    name: "Trust Bank - Operating",
    bankName: "Trust Bank Limited",
    accountNumber: "1122334455",
    currency: "GMD",
    balance: "890000.00",
  },
  {
    id: generateId("bank", 4),
    entityId: generateId("entity", 3),
    name: "Ecobank - Main",
    bankName: "Ecobank Gambia",
    accountNumber: "5566778899",
    currency: "GMD",
    balance: "3200000.00",
  },
  {
    id: generateId("bank", 5),
    entityId: generateId("entity", 3),
    name: "Ecobank - XOF",
    bankName: "Ecobank Senegal",
    accountNumber: "9988776655",
    currency: "XOF",
    balance: "2500000.00",
  },
];

// ─── Journal Entry Data (August 2026) ───────────────────────────────────────

const journalEntryData = [
  // Entity 1: Seagull Logistics
  {
    entityId: generateId("entity", 1),
    date: "2026-08-01",
    description: "Opening balance - Cash at Bank",
    lines: [
      { accountCode: "1010", debit: "2450000.00", credit: "0" },
      { accountCode: "3020", debit: "0", credit: "2450000.00" },
    ],
  },
  {
    entityId: generateId("entity", 1),
    date: "2026-08-05",
    description: "Invoice INV-1042 - Seafood Solutions",
    lines: [
      { accountCode: "1100", debit: "486000.00", credit: "0" },
      { accountCode: "4010", debit: "0", credit: "413100.00" },
      { accountCode: "2030", debit: "0", credit: "72900.00" },
    ],
  },
  {
    entityId: generateId("entity", 1),
    date: "2026-08-10",
    description: "Payment to Gambia Ports Authority",
    lines: [
      { accountCode: "2010", debit: "125000.00", credit: "0" },
      { accountCode: "1010", debit: "0", credit: "125000.00" },
    ],
  },
  {
    entityId: generateId("entity", 1),
    date: "2026-08-15",
    description: "Salary payments - August",
    lines: [
      { accountCode: "5020", debit: "420000.00", credit: "0" },
      { accountCode: "1010", debit: "0", credit: "420000.00" },
    ],
  },
  {
    entityId: generateId("entity", 1),
    date: "2026-08-20",
    description: "Rent payment - Warehouse",
    lines: [
      { accountCode: "5030", debit: "85000.00", credit: "0" },
      { accountCode: "1010", debit: "0", credit: "85000.00" },
    ],
  },
  {
    entityId: generateId("entity", 1),
    date: "2026-08-25",
    description: "Collection from Kaira Clinics",
    lines: [
      { accountCode: "1010", debit: "320000.00", credit: "0" },
      { accountCode: "1100", debit: "0", credit: "320000.00" },
    ],
  },
  // Entity 2: SunuFresh Foods
  {
    entityId: generateId("entity", 2),
    date: "2026-08-01",
    description: "Opening balance - Operating account",
    lines: [
      { accountCode: "1010", debit: "890000.00", credit: "0" },
      { accountCode: "3020", debit: "0", credit: "890000.00" },
    ],
  },
  {
    entityId: generateId("entity", 2),
    date: "2026-08-03",
    description: "Purchase - Fresh produce inventory",
    lines: [
      { accountCode: "1200", debit: "180000.00", credit: "0" },
      { accountCode: "2010", debit: "0", credit: "180000.00" },
    ],
  },
  {
    entityId: generateId("entity", 2),
    date: "2026-08-12",
    description: "Sales invoice - Seagull Logistics",
    lines: [
      { accountCode: "1100", debit: "245000.00", credit: "0" },
      { accountCode: "4010", debit: "0", credit: "210000.00" },
      { accountCode: "2030", debit: "0", credit: "35000.00" },
    ],
  },
  {
    entityId: generateId("entity", 2),
    date: "2026-08-18",
    description: "Utilities payment",
    lines: [
      { accountCode: "5040", debit: "28000.00", credit: "0" },
      { accountCode: "1010", debit: "0", credit: "28000.00" },
    ],
  },
  // Entity 3: Atlantic Traders Gambia
  {
    entityId: generateId("entity", 3),
    date: "2026-08-01",
    description: "Opening balance - Main account",
    lines: [
      { accountCode: "1010", debit: "3200000.00", credit: "0" },
      { accountCode: "3020", debit: "0", credit: "3200000.00" },
    ],
  },
  {
    entityId: generateId("entity", 3),
    date: "2026-08-08",
    description: "Import shipment - Container from China",
    lines: [
      { accountCode: "1200", debit: "1850000.00", credit: "0" },
      { accountCode: "2010", debit: "0", credit: "1850000.00" },
    ],
  },
  {
    entityId: generateId("entity", 3),
    date: "2026-08-14",
    description: "Sales to Banjul Import/Export",
    lines: [
      { accountCode: "1100", debit: "920000.00", credit: "0" },
      { accountCode: "4010", debit: "0", credit: "785000.00" },
      { accountCode: "2030", debit: "0", credit: "135000.00" },
    ],
  },
  {
    entityId: generateId("entity", 3),
    date: "2026-08-22",
    description: "Shipping costs - Global Shipping Lines",
    lines: [
      { accountCode: "5070", debit: "145000.00", credit: "0" },
      { accountCode: "1010", debit: "0", credit: "145000.00" },
    ],
  },
];

// ─── Invoice Data (AP) ──────────────────────────────────────────────────────

const invoiceApData = [
  {
    entityId: generateId("entity", 1),
    supplierId: generateId("supplier", 1),
    invoiceNumber: "GPA-2026-0892",
    amount: "125000.00",
    currency: "GMD",
    status: "paid",
    dueDate: "2026-08-15",
    paidDate: "2026-08-10",
  },
  {
    entityId: generateId("entity", 1),
    supplierId: generateId("supplier", 2),
    invoiceNumber: "TBL-2026-0456",
    amount: "45000.00",
    currency: "GMD",
    status: "pending",
    dueDate: "2026-09-01",
  },
  {
    entityId: generateId("entity", 2),
    supplierId: generateId("supplier", 3),
    invoiceNumber: "FPS-2026-0234",
    amount: "180000.00",
    currency: "GMD",
    status: "pending",
    dueDate: "2026-09-03",
  },
  {
    entityId: generateId("entity", 3),
    supplierId: generateId("supplier", 4),
    invoiceNumber: "DTC-2026-0178",
    amount: "2500000.00",
    currency: "XOF",
    status: "pending",
    dueDate: "2026-09-15",
  },
  {
    entityId: generateId("entity", 3),
    supplierId: generateId("supplier", 5),
    invoiceNumber: "GSL-2026-0892",
    amount: "4500.00",
    currency: "USD",
    status: "overdue",
    dueDate: "2026-08-20",
  },
];

// ─── Invoice Data (AR) ──────────────────────────────────────────────────────

const salesInvoiceData = [
  {
    entityId: generateId("entity", 1),
    customerId: generateId("customer", 1),
    invoiceNumber: "INV-1042",
    amount: "486000.00",
    currency: "GMD",
    status: "sent",
    dueDate: "2026-09-05",
  },
  {
    entityId: generateId("entity", 1),
    customerId: generateId("customer", 2),
    invoiceNumber: "INV-1043",
    amount: "320000.00",
    currency: "GMD",
    status: "paid",
    dueDate: "2026-08-25",
    paidDate: "2026-08-25",
  },
  {
    entityId: generateId("entity", 2),
    customerId: generateId("customer", 3),
    invoiceNumber: "SF-2026-0456",
    amount: "245000.00",
    currency: "GMD",
    status: "sent",
    dueDate: "2026-09-12",
  },
  {
    entityId: generateId("entity", 3),
    customerId: generateId("customer", 4),
    invoiceNumber: "AT-2026-0892",
    amount: "920000.00",
    currency: "GMD",
    status: "sent",
    dueDate: "2026-09-14",
  },
  {
    entityId: generateId("entity", 3),
    customerId: generateId("customer", 5),
    invoiceNumber: "AT-2026-0893",
    amount: "12500.00",
    currency: "GHS",
    status: "overdue",
    dueDate: "2026-08-15",
  },
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

export async function seedAugust2026() {
  console.log("═".repeat(64));
  console.log("XENBOOX — SEED AUGUST 2026 DATA");
  console.log("═".repeat(64));

  // ── 1. Create Users ─────────────────────────────────────────────────────
  console.log("\n→ Creating users...");
  for (const user of userData) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        emailVerified: new Date(),
      })
      .onConflictDoNothing({ target: users.id });
    console.log(`  ✅ ${user.name} (${user.email})`);
  }

  // ── 2. Create Organizations ──────────────────────────────────────────────
  console.log("\n→ Creating organizations...");
  for (const org of orgData) {
    await db
      .insert(organizations)
      .values({
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        plan: org.plan,
        ownerId: org.ownerId,
      })
      .onConflictDoNothing({ target: organizations.id });
    console.log(`  ✅ ${org.name}`);
  }

  // ── 3. Create Entities ───────────────────────────────────────────────────
  console.log("\n→ Creating entities...");
  for (const entity of entityData) {
    await db
      .insert(entities)
      .values({
        id: entity.id,
        organizationId: entity.organizationId,
        name: entity.name,
        type: entity.type,
        currency: entity.currency,
        country: entity.country,
        fiscalYearEnd: entity.fiscalYearEnd,
      })
      .onConflictDoNothing({ target: entities.id });
    console.log(`  ✅ ${entity.name} (${entity.currency})`);
  }

  // ── 4. Grant User Access ─────────────────────────────────────────────────
  console.log("\n→ Granting user access...");
  const accessGrants = [
    {
      userId: generateId("user", 1),
      entityId: generateId("entity", 1),
      role: "owner",
    },
    {
      userId: generateId("user", 2),
      entityId: generateId("entity", 2),
      role: "owner",
    },
    {
      userId: generateId("user", 3),
      entityId: generateId("entity", 3),
      role: "owner",
    },
    {
      userId: generateId("user", 3),
      entityId: generateId("entity", 4),
      role: "owner",
    },
    {
      userId: generateId("user", 4),
      entityId: generateId("entity", 1),
      role: "accountant",
    },
    {
      userId: generateId("user", 5),
      entityId: generateId("entity", 3),
      role: "external_accountant",
    },
  ];

  for (const grant of accessGrants) {
    await db
      .insert(userEntityAccess)
      .values({
        userId: grant.userId,
        entityId: grant.entityId,
        role: grant.role,
        grantedBy: grant.userId,
      })
      .onConflictDoNothing();
    console.log(
      `  ✅ User ${grant.userId.slice(0, 8)}... → Entity ${grant.entityId.slice(0, 8)}... (${grant.role})`,
    );
  }

  // ── 5. Create Chart of Accounts ──────────────────────────────────────────
  console.log("\n→ Creating chart of accounts...");
  for (const entity of entityData) {
    for (const account of chartOfAccountsData) {
      const accountId = seedUuid(`acct-${entity.id}-${account.code}`, 1);
      await db
        .insert(chartOfAccounts)
        .values({
          id: accountId,
          entityId: entity.id,
          code: account.code,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
        })
        .onConflictDoNothing({ target: chartOfAccounts.id });
    }
    console.log(`  ✅ ${entity.name} — ${chartOfAccountsData.length} accounts`);
  }

  // ── 6. Create Suppliers ──────────────────────────────────────────────────
  console.log("\n→ Creating suppliers...");
  for (const supplier of supplierData) {
    await db
      .insert(suppliers)
      .values({
        id: supplier.id,
        entityId: supplier.entityId,
        name: supplier.name,
        contactEmail: supplier.contactEmail,
        contactPhone: supplier.contactPhone,
        currency: supplier.currency,
      })
      .onConflictDoNothing({ target: suppliers.id });
    console.log(`  ✅ ${supplier.name}`);
  }

  // ── 7. Create Customers ──────────────────────────────────────────────────
  console.log("\n→ Creating customers...");
  for (const customer of customerData) {
    await db
      .insert(customers)
      .values({
        id: customer.id,
        entityId: customer.entityId,
        name: customer.name,
        contactEmail: customer.contactEmail,
        contactPhone: customer.contactPhone,
        currency: customer.currency,
      })
      .onConflictDoNothing({ target: customers.id });
    console.log(`  ✅ ${customer.name}`);
  }

  // ── 8. Create Bank Accounts ──────────────────────────────────────────────
  console.log("\n→ Creating bank accounts...");
  for (const bank of bankAccountData) {
    await db
      .insert(bankAccounts)
      .values({
        id: bank.id,
        entityId: bank.entityId,
        name: bank.name,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        currency: bank.currency,
        balance: bank.balance,
      })
      .onConflictDoNothing({ target: bankAccounts.id });
    console.log(`  ✅ ${bank.name} (${bank.currency} ${bank.balance})`);
  }

  // ── 9. Create Journal Entries ────────────────────────────────────────────
  console.log("\n→ Creating journal entries...");
  let entryCount = 0;
  for (const entry of journalEntryData) {
    const entryId = seedUuid(
      `je-${entry.entityId}-${entry.date}-${entryCount}`,
      1,
    );

    await db
      .insert(journalEntries)
      .values({
        id: entryId,
        entityId: entry.entityId,
        date: new Date(entry.date),
        description: entry.description,
        status: "posted",
      })
      .onConflictDoNothing({ target: journalEntries.id });

    for (const line of entry.lines) {
      const lineId = seedUuid(`jl-${entryId}-${line.accountCode}`, 1);
      const accountId = seedUuid(
        `acct-${entry.entityId}-${line.accountCode}`,
        1,
      );

      await db
        .insert(journalEntryLines)
        .values({
          id: lineId,
          journalEntryId: entryId,
          entityId: entry.entityId,
          accountId: accountId,
          debit: line.debit,
          credit: line.credit,
        })
        .onConflictDoNothing({ target: journalEntryLines.id });
    }

    entryCount++;
    console.log(`  ✅ ${entry.description} (${entry.date})`);
  }

  // ── 10. Create AP Invoices ───────────────────────────────────────────────
  console.log("\n→ Creating AP invoices...");
  for (const invoice of invoiceApData) {
    const invoiceId = seedUuid(
      `ap-${invoice.entityId}-${invoice.invoiceNumber}`,
      1,
    );

    await db
      .insert(invoicesAp)
      .values({
        id: invoiceId,
        entityId: invoice.entityId,
        supplierId: invoice.supplierId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: new Date(invoice.dueDate),
        paidDate: invoice.paidDate ? new Date(invoice.paidDate) : null,
      })
      .onConflictDoNothing({ target: invoicesAp.id });

    console.log(
      `  ✅ ${invoice.invoiceNumber} — ${invoice.currency} ${invoice.amount} (${invoice.status})`,
    );
  }

  // ── 11. Create AR Invoices ───────────────────────────────────────────────
  console.log("\n→ Creating AR invoices...");
  for (const invoice of salesInvoiceData) {
    const invoiceId = seedUuid(
      `ar-${invoice.entityId}-${invoice.invoiceNumber}`,
      1,
    );

    await db
      .insert(salesInvoices)
      .values({
        id: invoiceId,
        entityId: invoice.entityId,
        customerId: invoice.customerId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: new Date(invoice.dueDate),
        paidDate: invoice.paidDate ? new Date(invoice.paidDate) : null,
      })
      .onConflictDoNothing({ target: salesInvoices.id });

    console.log(
      `  ✅ ${invoice.invoiceNumber} — ${invoice.currency} ${invoice.amount} (${invoice.status})`,
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log("SEED COMPLETE — AUGUST 2026");
  console.log("═".repeat(64));
  console.log(`\n📊 Summary:`);
  console.log(`  • ${userData.length} users created`);
  console.log(`  • ${orgData.length} organizations created`);
  console.log(`  • ${entityData.length} entities created`);
  console.log(`  • ${accessGrants.length} access grants created`);
  console.log(
    `  • ${chartOfAccountsData.length * entityData.length} chart of accounts created`,
  );
  console.log(`  • ${supplierData.length} suppliers created`);
  console.log(`  • ${customerData.length} customers created`);
  console.log(`  • ${bankAccountData.length} bank accounts created`);
  console.log(`  • ${journalEntryData.length} journal entries created`);
  console.log(`  • ${invoiceApData.length} AP invoices created`);
  console.log(`  • ${salesInvoiceData.length} AR invoices created`);
  console.log(`\n🎯 Demo accounts:`);
  console.log(`  1. fatoumata@seagulllogistics.gm — Seagull Logistics (GMD)`);
  console.log(`  2. musa@sunufresh.gm — SunuFresh Foods (GMD)`);
  console.log(`  3. omar@atlantictraders.gm — Atlantic Traders (GMD + XOF)`);
  console.log(`  4. amina@kairaclinics.gm — Kaira Clinics (Accountant)`);
  console.log(
    `  5. lamin@lsconsulting.gm — LS Consulting (External Accountant)`,
  );
}

// Run directly
if (require.main === module) {
  seedAugust2026()
    .then(() => {
      console.log("\n✅ Seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
