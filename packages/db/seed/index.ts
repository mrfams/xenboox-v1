import { db } from "../index"
import { users } from "../schema/auth"
import {
  organizations,
  entities,
  userEntityAccess,
} from "../schema/organization"
import {
  chartOfAccounts,
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
} from "../schema/accounting"
import { suppliers, purchaseOrders, poLines, invoicesAp } from "../schema/ap-ar"
import { customers, salesInvoices, salesInvoiceLines } from "../schema/ap-ar"
import { employees, employeeContracts, payrollDeductionTypes, payrollRuns, payrollLineItems, staffLoans } from "../schema/payroll"
import { fixedAssets } from "../schema/fixed-assets"
import { warehouses, inventoryItems, inventoryTransactions } from "../schema/inventory"
import { bankAccounts, bankTransactions } from "../schema/treasury"

// ─── IDs (deterministic for seeding) ─────────────────────────────

const USER_ID = "00000000-0000-0000-0000-000000000001"
const ORG_ID = "00000000-0000-0000-0000-000000000002"
const ENTITY_ID = "00000000-0000-0000-0000-000000000003"

// Account IDs (deterministic)
const A = (code: string) => `00000000-0000-0000-0000-00000000${code}`

const ACCT = {
  // Assets
  cash: A("0001"),
  bank: A("0002"),
  receivable: A("0003"),
  inventory: A("0004"),
  prepaid: A("0005"),
  fixedAsset: A("0006"),
  accumDepreciation: A("0007"),
  // Liabilities
  payable: A("0008"),
  taxLiability: A("0009"),
  accruedLiability: A("0010"),
  shortTermLoan: A("0011"),
  // Equity
  ownerEquity: A("0012"),
  retainedEarnings: A("0013"),
  currentYearEarnings: A("0014"),
  // Revenue
  salesRevenue: A("0015"),
  serviceRevenue: A("0016"),
  otherIncome: A("0017"),
  // Expenses
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
}

// ─── Chart of Accounts ───────────────────────────────────────────

const coa = [
  // Assets
  { id: ACCT.cash, code: "1010", name: "Cash on Hand", type: "asset" as const, subtype: "cash" as const },
  { id: ACCT.bank, code: "1020", name: "Bank Account - Trust Bank", type: "asset" as const, subtype: "bank_account" as const },
  { id: ACCT.receivable, code: "1100", name: "Accounts Receivable", type: "asset" as const, subtype: "accounts_receivable" as const },
  { id: ACCT.inventory, code: "1200", name: "Inventory", type: "asset" as const, subtype: "inventory" as const },
  { id: ACCT.prepaid, code: "1300", name: "Prepaid Expenses", type: "asset" as const, subtype: "prepaid" as const },
  { id: ACCT.fixedAsset, code: "1500", name: "Office Equipment", type: "asset" as const, subtype: "fixed_asset" as const },
  { id: ACCT.accumDepreciation, code: "1510", name: "Accumulated Depreciation", type: "asset" as const, subtype: "fixed_asset" as const },

  // Liabilities
  { id: ACCT.payable, code: "2010", name: "Accounts Payable", type: "liability" as const, subtype: "accounts_payable" as const },
  { id: ACCT.taxLiability, code: "2100", name: "VAT Payable", type: "liability" as const, subtype: "tax_liability" as const },
  { id: ACCT.accruedLiability, code: "2200", name: "Accrued Expenses", type: "liability" as const, subtype: "accrued_liability" as const },
  { id: ACCT.shortTermLoan, code: "2300", name: "Short-Term Loan", type: "liability" as const, subtype: "current_liability" as const },

  // Equity
  { id: ACCT.ownerEquity, code: "3010", name: "Owner's Equity", type: "equity" as const, subtype: "owner_equity" as const },
  { id: ACCT.retainedEarnings, code: "3020", name: "Retained Earnings", type: "equity" as const, subtype: "retained_earnings" as const },
  { id: ACCT.currentYearEarnings, code: "3030", name: "Current Year Earnings", type: "equity" as const, subtype: "current_year_earnings" as const },

  // Revenue
  { id: ACCT.salesRevenue, code: "4010", name: "Sales Revenue", type: "revenue" as const, subtype: "sales_revenue" as const },
  { id: ACCT.serviceRevenue, code: "4020", name: "Service Revenue", type: "revenue" as const, subtype: "service_revenue" as const },
  { id: ACCT.otherIncome, code: "4030", name: "Other Income", type: "revenue" as const, subtype: "other_income" as const },

  // Expenses
  { id: ACCT.cogs, code: "5010", name: "Cost of Goods Sold", type: "expense" as const, subtype: "cost_of_goods_sold" as const },
  { id: ACCT.salaryExpense, code: "6010", name: "Salaries & Wages", type: "expense" as const, subtype: "payroll_expense" as const },
  { id: ACCT.rentExpense, code: "6020", name: "Rent Expense", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.utilitiesExpense, code: "6030", name: "Utilities", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.depreciation, code: "6040", name: "Depreciation Expense", type: "expense" as const, subtype: "depreciation" as const },
  { id: ACCT.officeExpense, code: "6050", name: "Office Supplies", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.travelExpense, code: "6060", name: "Travel & Transport", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.marketingExpense, code: "6070", name: "Marketing & Advertising", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.insuranceExpense, code: "6080", name: "Insurance", type: "expense" as const, subtype: "operating_expense" as const },
  { id: ACCT.interestExpense, code: "7010", name: "Interest Expense", type: "expense" as const, subtype: "interest_expense" as const },
  { id: ACCT.taxExpense, code: "7020", name: "Income Tax Expense", type: "expense" as const, subtype: "tax_expense" as const },
]

// ─── Seed Function ───────────────────────────────────────────────

export async function seed() {
  console.log("Seeding database...")

  // 1. User
  console.log("  Creating user...")
  await db.insert(users).values({
    id: USER_ID,
    name: "Demo User",
    email: "demo@xenboox.com",
    passwordHash: "$2b$10$placeholder_hash_for_demo_only",
  }).onConflictDoNothing()

  // 2. Organization
  console.log("  Creating organization...")
  await db.insert(organizations).values({
    id: ORG_ID,
    name: "Kerr Jula Trading Co.",
    slug: "kerr-jula-trading",
    type: "business",
    plan: "starter",
    ownerId: USER_ID,
    settings: { timezone: "Africa/Banjul", locale: "en-GM" },
  }).onConflictDoNothing()

  // 3. Entity
  console.log("  Creating entity...")
  await db.insert(entities).values({
    id: ENTITY_ID,
    organizationId: ORG_ID,
    name: "Kerr Jula Trading Co.",
    type: "company",
    currency: "GMD",
    country: "GM",
    fiscalYearEnd: "12",
    taxId: "GD123456789",
    settings: { vatRate: 0.15, defaultPaymentTerms: "net30" },
  }).onConflictDoNothing()

  // 4. User entity access
  console.log("  Granting entity access...")
  await db.insert(userEntityAccess).values({
    userId: USER_ID,
    entityId: ENTITY_ID,
    role: "owner",
    grantedBy: USER_ID,
  }).onConflictDoNothing()

  // 5. Chart of Accounts
  console.log("  Creating chart of accounts...")
  for (const acct of coa) {
    await db.insert(chartOfAccounts).values({
      id: acct.id,
      entityId: ENTITY_ID,
      code: acct.code,
      name: acct.name,
      type: acct.type,
      subtype: acct.subtype,
      isActive: true,
    }).onConflictDoNothing()
  }

  // 6. Fiscal Periods (2026)
  console.log("  Creating fiscal periods...")
  const periodIds: string[] = []
  for (let month = 1; month <= 12; month++) {
    const pid = `00000000-0000-0000-0000-2026000000${String(month).padStart(2, "0")}`
    periodIds.push(pid)
    const startDate = `2026-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(2026, month, 0).getDate()
    const endDate = `2026-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    const status = month < 7 ? "closed" as const : month === 7 ? "open" as const : "open" as const

    await db.insert(fiscalPeriods).values({
      id: pid,
      entityId: ENTITY_ID,
      year: 2026,
      month,
      startDate,
      endDate,
      status,
    }).onConflictDoNothing()
  }

  // 7. Sample Journal Entries (Jan - Jun 2026)
  console.log("  Creating sample journal entries...")
  const journalData = [
    // Jan: Opening balances
    {
      month: 0, entryNumber: 1, description: "Opening balances - cash deposit",
      date: "2026-01-02",
      lines: [
        { accountId: ACCT.bank, debit: "500000", credit: "0" },
        { accountId: ACCT.ownerEquity, debit: "0", credit: "500000" },
      ],
    },
    // Jan: Office rent
    {
      month: 0, entryNumber: 2, description: "January office rent payment",
      date: "2026-01-05",
      lines: [
        { accountId: ACCT.rentExpense, debit: "75000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "75000" },
      ],
    },
    // Feb: Sales
    {
      month: 1, entryNumber: 3, description: "February sales revenue",
      date: "2026-02-15",
      lines: [
        { accountId: ACCT.receivable, debit: "320000", credit: "0" },
        { accountId: ACCT.salesRevenue, debit: "0", credit: "278260.87" },
        { accountId: ACCT.taxLiability, debit: "0", credit: "41739.13" },
      ],
    },
    // Feb: COGS
    {
      month: 1, entryNumber: 4, description: "February cost of goods sold",
      date: "2026-02-15",
      lines: [
        { accountId: ACCT.cogs, debit: "180000", credit: "0" },
        { accountId: ACCT.inventory, debit: "0", credit: "180000" },
      ],
    },
    // Mar: Salaries
    {
      month: 2, entryNumber: 5, description: "March salaries",
      date: "2026-03-01",
      lines: [
        { accountId: ACCT.salaryExpense, debit: "250000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "250000" },
      ],
    },
    // Mar: Utilities
    {
      month: 2, entryNumber: 6, description: "March utilities (NAWEC)",
      date: "2026-03-10",
      lines: [
        { accountId: ACCT.utilitiesExpense, debit: "35000", credit: "0" },
        { accountId: ACCT.cash, debit: "0", credit: "35000" },
      ],
    },
    // Apr: More sales
    {
      month: 3, entryNumber: 7, description: "April sales revenue",
      date: "2026-04-20",
      lines: [
        { accountId: ACCT.bank, debit: "450000", credit: "0" },
        { accountId: ACCT.salesRevenue, debit: "0", credit: "391304.35" },
        { accountId: ACCT.taxLiability, debit: "0", credit: "58695.65" },
      ],
    },
    // Apr: COGS
    {
      month: 3, entryNumber: 8, description: "April cost of goods sold",
      date: "2026-04-20",
      lines: [
        { accountId: ACCT.cogs, debit: "260000", credit: "0" },
        { accountId: ACCT.inventory, debit: "0", credit: "260000" },
      ],
    },
    // May: Office supplies
    {
      month: 4, entryNumber: 9, description: "May office supplies",
      date: "2026-05-08",
      lines: [
        { accountId: ACCT.officeExpense, debit: "12000", credit: "0" },
        { accountId: ACCT.cash, debit: "0", credit: "12000" },
      ],
    },
    // May: Loan proceeds
    {
      month: 4, entryNumber: 10, description: "Short-term loan from trust bank",
      date: "2026-05-15",
      lines: [
        { accountId: ACCT.bank, debit: "200000", credit: "0" },
        { accountId: ACCT.shortTermLoan, debit: "0", credit: "200000" },
      ],
    },
    // Jun: Sales
    {
      month: 5, entryNumber: 11, description: "June sales revenue",
      date: "2026-06-18",
      lines: [
        { accountId: ACCT.receivable, debit: "380000", credit: "0" },
        { accountId: ACCT.salesRevenue, debit: "0", credit: "330434.78" },
        { accountId: ACCT.taxLiability, debit: "0", credit: "49565.22" },
      ],
    },
    // Jun: COGS
    {
      month: 5, entryNumber: 12, description: "June cost of goods sold",
      date: "2026-06-18",
      lines: [
        { accountId: ACCT.cogs, debit: "220000", credit: "0" },
        { accountId: ACCT.inventory, debit: "0", credit: "220000" },
      ],
    },
    // Jun: Depreciation
    {
      month: 5, entryNumber: 13, description: "June depreciation - office equipment",
      date: "2026-06-30",
      lines: [
        { accountId: ACCT.depreciation, debit: "8333", credit: "0" },
        { accountId: ACCT.accumDepreciation, debit: "0", credit: "8333" },
      ],
    },
    // Jun: Marketing
    {
      month: 5, entryNumber: 14, description: "June marketing - radio ads",
      date: "2026-06-25",
      lines: [
        { accountId: ACCT.marketingExpense, debit: "45000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "45000" },
      ],
    },
  ]

  for (const entry of journalData) {
    const jeId = `00000000-0000-0000-0000-journal${String(entry.entryNumber).padStart(4, "0")}`
    await db.insert(journalEntries).values({
      id: jeId,
      entityId: ENTITY_ID,
      entryNumber: entry.entryNumber,
      description: entry.description,
      date: entry.date,
      periodId: periodIds[entry.month],
      status: "posted",
      postedBy: "demo@xenboox.com",
      postedAt: new Date(entry.date),
      source: "seed",
    }).onConflictDoNothing()

    for (const line of entry.lines) {
      await db.insert(journalEntryLines).values({
        journalEntryId: jeId,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: entry.description,
      }).onConflictDoNothing()
    }
  }

  // 8. Sample Suppliers
  console.log("  Creating suppliers...")
  const supplierData = [
    { name: "Global Supplies Ltd.", email: "info@globalsupplies.gm", phone: "+22012345678" },
    { name: "Banjul Wholesale Market", email: "sales@banjulwholesale.gm", phone: "+22098765432" },
    { name: "Senegal Import Co.", email: "contact@senegalimport.sn", phone: "+22176543210" },
  ]

  const supplierIds: string[] = []
  for (let i = 0; i < supplierData.length; i++) {
    const sid = `00000000-0000-0000-0000-supplier0000${i + 1}`
    supplierIds.push(sid)
    await db.insert(suppliers).values({
      id: sid,
      entityId: ENTITY_ID,
      name: supplierData[i].name,
      contactEmail: supplierData[i].email,
      contactPhone: supplierData[i].phone,
      paymentTerms: "net30",
    }).onConflictDoNothing()
  }

  // 9. Sample Customers
  console.log("  Creating customers...")
  const customerData = [
    { name: "Brikama Market Traders", email: "traders@brikama.gm", phone: "+22011122233" },
    { name: "Serrekunda Hardware", email: "info@serrekunda-hw.gm", phone: "+22044455566" },
    { name: "Kanifing Municipal Council", email: "finance@kanifing.gm", phone: "+22077788899" },
  ]

  const customerIds: string[] = []
  for (let i = 0; i < customerData.length; i++) {
    const cid = `00000000-0000-0000-0000-customer0000${i + 1}`
    customerIds.push(cid)
    await db.insert(customers).values({
      id: cid,
      entityId: ENTITY_ID,
      name: customerData[i].name,
      contactEmail: customerData[i].email,
      contactPhone: customerData[i].phone,
      paymentTerms: "net30",
    }).onConflictDoNothing()
  }

  // 10. Sample AP Invoices
  console.log("  Creating AP invoices...")
  const apInvoiceData = [
    { supplierId: supplierIds[0], invoiceNo: "INV-2026-001", date: "2026-06-01", amount: "85000", status: "pending" as const },
    { supplierId: supplierIds[1], invoiceNo: "INV-2026-002", date: "2026-06-10", amount: "120000", status: "pending" as const },
    { supplierId: supplierIds[2], invoiceNo: "INV-2026-003", date: "2026-06-15", amount: "45000", status: "pending" as const },
  ]

  for (const inv of apInvoiceData) {
    const invId = `00000000-0000-0000-0000-apinv${inv.invoiceNo.slice(-3)}`
    await db.insert(invoicesAp).values({
      id: invId,
      entityId: ENTITY_ID,
      supplierId: inv.supplierId,
      invoiceNumber: inv.invoiceNo,
      invoiceDate: inv.date,
      dueDate: `2026-07-${inv.date.slice(8, 10)}`,
      totalAmount: inv.amount,
      balance: inv.amount,
      currency: "GMD",
      status: inv.status,
    }).onConflictDoNothing()
  }

  // 11. Sample AR Invoices
  console.log("  Creating AR invoices...")
  const arInvoiceData = [
    { customerId: customerIds[0], invoiceNo: "SI-2026-001", date: "2026-06-05", amount: "175000", status: "pending" as const },
    { customerId: customerIds[1], invoiceNo: "SI-2026-002", date: "2026-06-12", amount: "92000", status: "pending" as const },
    { customerId: customerIds[2], invoiceNo: "SI-2026-003", date: "2026-06-20", amount: "210000", status: "pending" as const },
  ]

  for (const inv of arInvoiceData) {
    const invId = `00000000-0000-0000-0000-arinv${inv.invoiceNo.slice(-3)}`
    await db.insert(salesInvoices).values({
      id: invId,
      entityId: ENTITY_ID,
      customerId: inv.customerId,
      invoiceNumber: inv.invoiceNo,
      invoiceDate: inv.date,
      dueDate: `2026-07-${inv.date.slice(8, 10)}`,
      totalAmount: inv.amount,
      balance: inv.amount,
      currency: "GMD",
      status: inv.status,
    }).onConflictDoNothing()
  }

  // 12. Sample Employees
  console.log("  Creating employees...")
  const employeeData = [
    { name: "Ousman Jatta", email: "ousman@kerrjula.gm", department: "Finance", title: "Finance Manager", type: "full_time" as const, salary: "45000" },
    { name: "Fatoumata Jawara", email: "fatou@kerrjula.gm", department: "Sales", title: "Sales Lead", type: "full_time" as const, salary: "38000" },
    { name: "Ismaila Ceesay", email: "ismaila@kerrjula.gm", department: "Operations", title: "Warehouse Manager", type: "full_time" as const, salary: "35000" },
    { name: "Awa Bah", email: "awa@kerrjula.gm", department: "Admin", title: "Admin Assistant", type: "full_time" as const, salary: "25000" },
    { name: "Bubacarr Jobe", email: "buba@kerrjula.gm", department: "IT", title: "IT Support", type: "full_time" as const, salary: "30000" },
  ]

  const employeeIds: string[] = []
  for (let i = 0; i < employeeData.length; i++) {
    const eid = `00000000-0000-0000-0000-employee00${String(i + 1).padStart(2, "0")}`
    employeeIds.push(eid)
    const emp = employeeData[i]
    await db.insert(employees).values({
      id: eid,
      entityId: ENTITY_ID,
      employeeNumber: `EMP-${String(i + 1).padStart(3, "0")}`,
      name: emp.name,
      email: emp.email,
      hireDate: "2025-01-15",
      department: emp.department,
      jobTitle: emp.title,
      employmentType: emp.type,
      isActive: true,
    }).onConflictDoNothing()

    await db.insert(employeeContracts).values({
      entityId: ENTITY_ID,
      employeeId: eid,
      effectiveDate: "2025-01-15",
      basicSalary: emp.salary,
      currency: "GMD",
      payFrequency: "monthly",
      isActive: true,
    }).onConflictDoNothing()
  }

  // 13. Sample Fixed Assets
  console.log("  Creating fixed assets...")
  const assetData = [
    { name: "Toyota Hilux 2024", class: "vehicle", location: "Banjul Office", cost: "1850000", life: 60, method: "straight_line" as const },
    { name: "Office Building - Kairaba Ave", class: "building", location: "Kairaba Avenue", cost: "5000000", life: 240, method: "straight_line" as const },
    { name: "Dell Servers (x3)", class: "equipment", location: "Server Room", cost: "450000", life: 36, method: "straight_line" as const },
    { name: "Office Furniture Set", class: "furniture", location: "Main Office", cost: "180000", life: 60, method: "straight_line" as const },
    { name: "Generator 50kVA", class: "equipment", location: "Generator Room", cost: "320000", life: 84, method: "straight_line" as const },
  ]

  const assetIds: string[] = []
  for (let i = 0; i < assetData.length; i++) {
    const acid = `00000000-0000-0000-0000-asset0000${i + 1}`
    assetIds.push(acid)
    const a = assetData[i]
    const cost = parseFloat(a.cost)
    const salvage = cost * 0.1
    const annualDep = (cost - salvage) / (a.life / 12)
    const monthsDepreciated = Math.min(18, a.life) // assume 18 months elapsed for demo
    const accumDep = annualDep * (monthsDepreciated / 12)
    const nbv = cost - accumDep

    await db.insert(fixedAssets).values({
      id: acid,
      entityId: ENTITY_ID,
      name: a.name,
      assetClass: a.class,
      location: a.location,
      purchaseDate: "2025-01-01",
      cost: a.cost,
      salvageValue: salvage.toFixed(2),
      usefulLifeMonths: a.life,
      depreciationMethod: a.method,
      accumulatedDepreciation: Math.min(accumDep, cost - salvage).toFixed(2),
      netBookValue: nbv.toFixed(2),
      status: "active",
      glAccountId: ACCT.fixedAsset,
      accumulatedDepreciationAccountId: ACCT.accumDepreciation,
      responsiblePerson: "Ousman Jatta",
      condition: "good",
    }).onConflictDoNothing()
  }

  // 14. Sample Warehouses & Inventory Items
  console.log("  Creating warehouses and inventory...")
  const warehouseIds: string[] = []
  for (const whName of ["Main Warehouse", "Brikama Store"]) {
    const wid = `00000000-0000-0000-0000-warehouse${whName.slice(0, 4).toLowerCase()}`
    warehouseIds.push(wid)
    await db.insert(warehouses).values({
      id: wid,
      entityId: ENTITY_ID,
      name: whName,
      location: whName === "Main Warehouse" ? "Serrekunda" : "Brikama",
      isActive: true,
    }).onConflictDoNothing()
  }

  const inventoryData = [
    { name: "Rice (25kg bag)", sku: "RICE-25KG", category: "food", unit: "bag", cost: "2800", qty: 150 },
    { name: "Cooking Oil (5L)", sku: "OIL-5L", category: "food", unit: "bottle", cost: "1200", qty: 80 },
    { name: "Sugar (10kg bag)", sku: "SUGAR-10KG", category: "food", unit: "bag", cost: "1800", qty: 200 },
    { name: "Onions (10kg)", sku: "ONION-10KG", category: "food", unit: "bag", cost: "900", qty: 60 },
    { name: "Soap (carton)", sku: "SOAP-CTN", category: "household", unit: "carton", cost: "2400", qty: 40 },
  ]

  const inventoryItemIds: string[] = []
  for (let i = 0; i < inventoryData.length; i++) {
    const iid = `00000000-0000-0000-0000-invitem0${i + 1}`
    inventoryItemIds.push(iid)
    const item = inventoryData[i]
    await db.insert(inventoryItems).values({
      id: iid,
      entityId: ENTITY_ID,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unitOfMeasure: item.unit,
      costMethod: "weighted_average",
      standardCost: item.cost,
      reorderLevel: Math.floor(item.qty * 0.3),
      reorderQuantity: Math.floor(item.qty * 0.5),
      quantityOnHand: item.qty,
      glAccountId: ACCT.inventory,
      cogsAccountId: ACCT.cogs,
      isActive: true,
    }).onConflictDoNothing()
  }

  // 15. Bank Accounts
  console.log("  Creating bank accounts...")
  const bankAccountIds: string[] = []
  const bankAccountData = [
    { name: "Main Operating Account", bank: "Trust Bank", number: "1023456789", type: "checking" as const, balance: "520000" },
    { name: "Savings Account", bank: "Trust Bank", number: "1023456790", type: "savings" as const, balance: "150000" },
  ]

  for (let i = 0; i < bankAccountData.length; i++) {
    const bid = `00000000-0000-0000-0000-bank0000${i + 1}`
    bankAccountIds.push(bid)
    const b = bankAccountData[i]
    await db.insert(bankAccounts).values({
      id: bid,
      entityId: ENTITY_ID,
      name: b.name,
      bankName: b.bank,
      accountNumber: b.number,
      type: b.type,
      currency: "GMD",
      openingBalance: b.balance,
      currentBalance: b.balance,
      isActive: true,
      glAccountId: ACCT.bank,
    }).onConflictDoNothing()
  }

  // 16. Bank Transactions
  console.log("  Creating bank transactions...")
  const bankTxData = [
    { accountId: bankAccountIds[0], date: "2026-01-02", type: "deposit" as const, amount: "500000", desc: "Opening deposit from owner" },
    { accountId: bankAccountIds[0], date: "2026-01-05", type: "withdrawal" as const, amount: "75000", desc: "January office rent" },
    { accountId: bankAccountIds[0], date: "2026-02-28", type: "withdrawal" as const, amount: "250000", desc: "March salaries" },
    { accountId: bankAccountIds[0], date: "2026-04-20", type: "deposit" as const, amount: "450000", desc: "April sales receipt" },
    { accountId: bankAccountIds[0], date: "2026-05-15", type: "deposit" as const, amount: "200000", desc: "Short-term loan proceeds" },
    { accountId: bankAccountIds[0], date: "2026-06-01", type: "withdrawal" as const, amount: "85000", desc: "Payment to Global Supplies" },
    { accountId: bankAccountIds[0], date: "2026-06-25", type: "withdrawal" as const, amount: "45000", desc: "Radio advertising" },
    { accountId: bankAccountIds[0], date: "2026-06-30", type: "fee" as const, amount: "2500", desc: "Bank service charges" },
    { accountId: bankAccountIds[1], date: "2026-01-10", type: "deposit" as const, amount: "150000", desc: "Transfer to savings" },
    { accountId: bankAccountIds[1], date: "2026-06-30", type: "interest" as const, amount: "3750", desc: "Savings interest Q2" },
  ]

  for (let i = 0; i < bankTxData.length; i++) {
    const tid = `00000000-0000-0000-0000-btx000${String(i + 1).padStart(3, "0")}`
    const tx = bankTxData[i]
    await db.insert(bankTransactions).values({
      id: tid,
      entityId: ENTITY_ID,
      bankAccountId: tx.accountId,
      transactionDate: tx.date,
      type: tx.type,
      amount: tx.amount,
      description: tx.desc,
      isReconciled: i < 5, // first 5 are reconciled
      source: "seed",
    }).onConflictDoNothing()
  }

  // 17. Payroll Deduction Types
  console.log("  Creating payroll deduction types...")
  const dedTypes = [
    { name: "PAYE Tax", code: "PAYE", type: "tax" as const, rateType: "percentage", rate: "0.15", isStatutory: true },
    { name: "Social Security (Employee)", code: "SSNIT-E", type: "social_security" as const, rateType: "percentage", rate: "0.05", isStatutory: true },
    { name: "Social Security (Employer)", code: "SSNIT-ER", type: "social_security" as const, rateType: "percentage", rate: "0.10", isStatutory: true },
    { name: "Health Insurance", code: "NHIF", type: "benefit" as const, rateType: "fixed", rate: "200", isStatutory: true },
  ]

  const dedTypeIds: string[] = []
  for (let i = 0; i < dedTypes.length; i++) {
    const did = `00000000-0000-0000-0000-dedtype00${i + 1}`
    dedTypeIds.push(did)
    const d = dedTypes[i]
    await db.insert(payrollDeductionTypes).values({
      id: did,
      entityId: ENTITY_ID,
      name: d.name,
      code: d.code,
      type: d.type,
      rateType: d.rateType,
      rate: d.rate,
      isStatutory: d.isStatutory,
      isActive: true,
    }).onConflictDoNothing()
  }

  // 18. Purchase Orders
  console.log("  Creating purchase orders...")
  const poData = [
    { supplierId: supplierIds[0], number: "PO-2026-001", date: "2026-06-01", status: "approved" as const, amount: "85000" },
    { supplierId: supplierIds[1], number: "PO-2026-002", date: "2026-06-10", status: "received" as const, amount: "120000" },
    { supplierId: supplierIds[2], number: "PO-2026-003", date: "2026-07-01", status: "submitted" as const, amount: "65000" },
  ]

  const poIds: string[] = []
  for (let i = 0; i < poData.length; i++) {
    const pid = `00000000-0000-0000-0000-po0000${i + 1}`
    poIds.push(pid)
    const p = poData[i]
    await db.insert(purchaseOrders).values({
      id: pid,
      entityId: ENTITY_ID,
      supplierId: p.supplierId,
      poNumber: p.number,
      orderDate: p.date,
      expectedDate: `2026-07-${p.date.slice(8, 10)}`,
      status: p.status,
      totalAmount: p.amount,
      currency: "GMD",
      approvedBy: p.status === "approved" || p.status === "received" ? "demo@xenboox.com" : null,
    }).onConflictDoNothing()

    // PO line items
    await db.insert(poLines).values({
      purchaseOrderId: pid,
      accountId: ACCT.inventory,
      description: i === 0 ? "Rice (25kg) x 20 bags" : i === 1 ? "Cooking Oil (5L) x 50 bottles" : "Mixed goods",
      quantity: i === 0 ? "20" : i === 1 ? "50" : "10",
      unitPrice: i === 0 ? "2800" : i === 1 ? "1200" : "6500",
      amount: p.amount,
    }).onConflictDoNothing()
  }

  // 19. AP Invoice with PO link
  // (AP invoices already seeded in step 10, linking PO to first one)
  // We'll update the first AP invoice to link to PO
  await db.update(invoicesAp).set({ purchaseOrderId: poIds[0] })
    .where({ entityId: ENTITY_ID } as any)

  // 20. AR Invoice Lines
  console.log("  Creating AR invoice lines...")
  const arInvIds = [
    `00000000-0000-0000-0000-arinv001`,
    `00000000-0000-0000-0000-arinv002`,
    `00000000-0000-0000-0000-arinv003`,
  ]

  const arLineData = [
    { invId: arInvIds[0], desc: "Rice (25kg) x 25 bags", qty: "25", price: "7000", amount: "175000" },
    { invId: arInvIds[1], desc: "Cooking Oil (5L) x 30 bottles + Sugar x 20 bags", qty: "1", price: "92000", amount: "92000" },
    { invId: arInvIds[2], desc: "Mixed household goods", qty: "1", price: "210000", amount: "210000" },
  ]

  for (const line of arLineData) {
    await db.insert(salesInvoiceLines).values({
      salesInvoiceId: line.invId,
      accountId: ACCT.salesRevenue,
      description: line.desc,
      quantity: line.qty,
      unitPrice: line.price,
      amount: line.amount,
    }).onConflictDoNothing()
  }

  // 21. Payroll Runs - June 2026
  console.log("  Creating payroll runs...")
  const runIds: string[] = []
  const payrollRunData = [
    { period: "2026-06", status: "paid" as const, gross: "173000", deductions: "25950", net: "147050" },
    { period: "2026-07", status: "approved" as const, gross: "173000", deductions: "25950", net: "147050" },
  ]

  for (let r = 0; r < payrollRunData.length; r++) {
    const rid = `00000000-0000-0000-0000-prun000${r + 1}`
    runIds.push(rid)
    const run = payrollRunData[r]
    await db.insert(payrollRuns).values({
      id: rid,
      entityId: ENTITY_ID,
      period: run.period,
      status: run.status,
      employeeCount: 5,
      grossPay: run.gross,
      totalDeductions: run.deductions,
      totalEmployerContributions: "17300",
      netPay: run.net,
      processedBy: "demo@xenboox.com",
      approvedBy: run.status === "paid" ? "demo@xenboox.com" : null,
    }).onConflictDoNothing()
  }

  // 22. Payroll Line Items for June run
  console.log("  Creating payroll line items...")
  const empSalaries = [45000, 38000, 35000, 25000, 30000]
  for (let r = 0; r < runIds.length; r++) {
    for (let e = 0; e < employeeIds.length; e++) {
      const salary = empSalaries[e]
      const payeTax = Math.round(salary * 0.15)
      const ssEmployee = Math.round(salary * 0.05)
      const netPay = salary - payeTax - ssEmployee

      await db.insert(payrollLineItems).values({
        entityId: ENTITY_ID,
        payrollRunId: runIds[r],
        employeeId: employeeIds[e],
        basicSalary: String(salary),
        allowances: [{ name: "Transport", amount: "5000" }],
        grossPay: String(salary + 5000),
        payeTax: String(payeTax),
        socialSecurityEmployee: String(ssEmployee),
        socialSecurityEmployer: String(Math.round(salary * 0.10)),
        netPay: String(netPay + 5000),
        paymentMethod: "bank_transfer",
      }).onConflictDoNothing()
    }
  }

  // 23. Staff Loan (Ismaila Ceesay)
  console.log("  Creating staff loans...")
  await db.insert(staffLoans).values({
    entityId: ENTITY_ID,
    employeeId: employeeIds[2], // Ismaila Ceesay
    loanAmount: "100000",
    monthlyDeduction: "5000",
    startDate: "2026-03-01",
    endDate: "2028-02-28",
    remainingBalance: "85000",
    isActive: true,
  }).onConflictDoNothing()

  // 24. More Journal Entries (July 2026)
  console.log("  Creating July journal entries...")
  const julyEntries = [
    {
      month: 6, entryNumber: 15, description: "July opening - AR collection from Brikama",
      date: "2026-07-02",
      lines: [
        { accountId: ACCT.bank, debit: "175000", credit: "0" },
        { accountId: ACCT.receivable, debit: "0", credit: "175000" },
      ],
    },
    {
      month: 6, entryNumber: 16, description: "July rent payment",
      date: "2026-07-03",
      lines: [
        { accountId: ACCT.rentExpense, debit: "75000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "75000" },
      ],
    },
    {
      month: 6, entryNumber: 17, description: "July sales - cash and credit",
      date: "2026-07-10",
      lines: [
        { accountId: ACCT.bank, debit: "280000", credit: "0" },
        { accountId: ACCT.receivable, debit: "120000", credit: "0" },
        { accountId: ACCT.salesRevenue, debit: "0", credit: "347826.09" },
        { accountId: ACCT.taxLiability, debit: "0", credit: "52173.91" },
      ],
    },
    {
      month: 6, entryNumber: 18, description: "July COGS",
      date: "2026-07-10",
      lines: [
        { accountId: ACCT.cogs, debit: "200000", credit: "0" },
        { accountId: ACCT.inventory, debit: "0", credit: "200000" },
      ],
    },
    {
      month: 6, entryNumber: 19, description: "July salaries",
      date: "2026-07-01",
      lines: [
        { accountId: ACCT.salaryExpense, debit: "173000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "147050" },
        { accountId: ACCT.taxLiability, debit: "0", credit: "25950" },
      ],
    },
    {
      month: 6, entryNumber: 20, description: "July utilities (NAWEC)",
      date: "2026-07-12",
      lines: [
        { accountId: ACCT.utilitiesExpense, debit: "38000", credit: "0" },
        { accountId: ACCT.cash, debit: "0", credit: "38000" },
      ],
    },
    {
      month: 6, entryNumber: 21, description: "Insurance premium - annual",
      date: "2026-07-15",
      lines: [
        { accountId: ACCT.insuranceExpense, debit: "120000", credit: "0" },
        { accountId: ACCT.bank, debit: "0", credit: "120000" },
      ],
    },
  ]

  for (const entry of julyEntries) {
    const jeId = `00000000-0000-0000-0000-journal${String(entry.entryNumber).padStart(4, "0")}`
    await db.insert(journalEntries).values({
      id: jeId,
      entityId: ENTITY_ID,
      entryNumber: entry.entryNumber,
      description: entry.description,
      date: entry.date,
      periodId: periodIds[entry.month],
      status: "posted",
      postedBy: "demo@xenboox.com",
      postedAt: new Date(entry.date),
      source: "seed",
    }).onConflictDoNothing()

    for (const line of entry.lines) {
      await db.insert(journalEntryLines).values({
        journalEntryId: jeId,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: entry.description,
      }).onConflictDoNothing()
    }
  }

  // 25. Inventory Transactions
  console.log("  Creating inventory transactions...")
  const invTxData = [
    { itemId: 0, warehouseIdx: 0, type: "receipt" as const, qty: 150, cost: "2800", date: "2026-01-15", ref: "Opening stock" },
    { itemId: 0, warehouseIdx: 0, type: "issue" as const, qty: -25, cost: "2800", date: "2026-02-15", ref: "February sales" },
    { itemId: 0, warehouseIdx: 0, type: "issue" as const, qty: -30, cost: "2800", date: "2026-04-20", ref: "April sales" },
    { itemId: 1, warehouseIdx: 0, type: "receipt" as const, qty: 80, cost: "1200", date: "2026-01-15", ref: "Opening stock" },
    { itemId: 1, warehouseIdx: 0, type: "issue" as const, qty: -20, cost: "1200", date: "2026-03-10", ref: "March sales" },
    { itemId: 2, warehouseIdx: 0, type: "receipt" as const, qty: 200, cost: "1800", date: "2026-01-15", ref: "Opening stock" },
    { itemId: 2, warehouseIdx: 0, type: "issue" as const, qty: -40, cost: "1800", date: "2026-06-18", ref: "June sales" },
    { itemId: 3, warehouseIdx: 1, type: "receipt" as const, qty: 60, cost: "900", date: "2026-02-01", ref: "Brikama store stock" },
    { itemId: 3, warehouseIdx: 1, type: "issue" as const, qty: -10, cost: "900", date: "2026-05-08", ref: "May sales" },
    { itemId: 4, warehouseIdx: 0, type: "receipt" as const, qty: 40, cost: "2400", date: "2026-01-15", ref: "Opening stock" },
    { itemId: 4, warehouseIdx: 0, type: "adjustment" as const, qty: -2, cost: "2400", date: "2026-06-30", ref: "Damaged goods write-off" },
  ]

  for (let i = 0; i < invTxData.length; i++) {
    const txid = `00000000-0000-0000-0000-itx000${String(i + 1).padStart(3, "0")}`
    const tx = invTxData[i]
    await db.insert(inventoryTransactions).values({
      entityId: ENTITY_ID,
      inventoryItemId: inventoryItemIds[tx.itemId],
      warehouseId: warehouseIds[tx.warehouseIdx],
      type: tx.type,
      quantity: tx.qty,
      unitCost: tx.cost,
      totalCost: String(Math.abs(tx.qty) * parseFloat(tx.cost)),
      transactionDate: tx.date,
      notes: tx.ref,
    }).onConflictDoNothing()
  }

  console.log("Seed complete!")
  console.log(`  User: demo@xenboox.com (password: demo1234)`)
  console.log(`  Entity: ${ENTITY_ID}`)
  console.log(`  Chart of Accounts: ${coa.length} accounts`)
  console.log(`  Journal Entries: ${journalData.length + julyEntries.length}`)
  console.log(`  Bank Accounts: ${bankAccountData.length}`)
  console.log(`  Bank Transactions: ${bankTxData.length}`)
  console.log(`  Suppliers: ${supplierData.length}`)
  console.log(`  Customers: ${customerData.length}`)
  console.log(`  Purchase Orders: ${poData.length}`)
  console.log(`  AP Invoices: ${apInvoiceData.length}`)
  console.log(`  AR Invoices: ${arInvoiceData.length}`)
  console.log(`  Employees: ${employeeData.length}`)
  console.log(`  Payroll Runs: ${payrollRunData.length}`)
  console.log(`  Staff Loans: 1`)
  console.log(`  Fixed Assets: ${assetData.length}`)
  console.log(`  Warehouses: 2`)
  console.log(`  Inventory Items: ${inventoryData.length}`)
  console.log(`  Inventory Transactions: ${invTxData.length}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
