import { NextResponse } from "next/server";
import { db } from "@xenboox/db";
import * as schema from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";

import { logger } from "@/lib/logger";

// §17.6 — seeding a full demo entity touches dozens of tables; allow the
// extended function budget so large seeds don't time out.
export const maxDuration = 300;

export async function POST(request: Request) {
  // Epoch 0 / N5 — this route hardcodes an entity into whatever database it
  // hits. In production it is disabled outright, regardless of tokens.
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const token = (body as { token?: string }).token;

    if (!token || token !== process.env.SEED_DEMO_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ENTITY_ID = "f19095a8-b547-4751-91c1-ede98d59de9b";

    const [
      fiscalRows,
      supplierRows,
      customerRows,
      bankRows,
      cashRows,
      invItemRows,
      whRows,
      empRows,
      userRow,
    ] = await Promise.all([
      db
        .select()
        .from(schema.fiscalPeriods)
        .where(
          and(
            eq(schema.fiscalPeriods.entityId, ENTITY_ID),
            eq(schema.fiscalPeriods.year, 2026),
          ),
        ),
      db
        .select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.bankAccounts)
        .where(eq(schema.bankAccounts.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.cashAccounts)
        .where(eq(schema.cashAccounts.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.warehouses)
        .where(eq(schema.warehouses.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.employees)
        .where(eq(schema.employees.entityId, ENTITY_ID)),
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, "demo@xenboox.com")),
    ]);

    const periodMap = new Map(fiscalRows.map((p) => [p.month, p.id]));
    const supplierIds = supplierRows.map((s) => s.id);
    const customerIds = customerRows.map((c) => c.id);
    const bankAccountIds = bankRows.map((b) => b.id);
    const cashAccountIds = cashRows.map((c) => c.id);
    const inventoryItemIds = invItemRows.map((i) => i.id);
    const warehouseIds = whRows.map((w) => w.id);
    const ____employeeIds = empRows.map((e) => e.id);
    const userId = userRow[0]!.id;

    const acctCodes: Record<string, string> = {};
    for (const code of [
      "1010",
      "1020",
      "1100",
      "1200",
      "4010",
      "5010",
      "6010",
      "6020",
      "6030",
      "6050",
      "6060",
      "6070",
      "2100",
    ]) {
      const rows = await db
        .select()
        .from(schema.chartOfAccounts)
        .where(
          and(
            eq(schema.chartOfAccounts.entityId, ENTITY_ID),
            eq(schema.chartOfAccounts.code, code),
          ),
        );
      acctCodes[code] = rows[0].id;
    }

    const startOf = (m: number) => `2026-${String(m + 1).padStart(2, "0")}-01`;
    const midOf = (m: number) => `2026-${String(m + 1).padStart(2, "0")}-15`;
    const endOf = (m: number) => `2026-${String(m + 1).padStart(2, "0")}-28`;

    const journalData = [
      {
        month: 2,
        num: 22,
        desc: "March sales revenue",
        date: midOf(2),
        lines: [
          { a: acctCodes["1100"], d: "340000", c: "0" },
          { a: acctCodes["4010"], d: "0", c: "295652.17" },
          { a: acctCodes["2100"], d: "0", c: "44347.83" },
        ],
      },
      {
        month: 2,
        num: 23,
        desc: "March cost of goods sold",
        date: midOf(2),
        lines: [
          { a: acctCodes["5010"], d: "195000", c: "0" },
          { a: acctCodes["1200"], d: "0", c: "195000" },
        ],
      },
      {
        month: 2,
        num: 24,
        desc: "March salaries",
        date: startOf(2),
        lines: [
          { a: acctCodes["6010"], d: "250000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "250000" },
        ],
      },
      {
        month: 2,
        num: 25,
        desc: "March utilities payment",
        date: endOf(2),
        lines: [
          { a: acctCodes["6030"], d: "35000", c: "0" },
          { a: acctCodes["1010"], d: "0", c: "35000" },
        ],
      },
      {
        month: 3,
        num: 26,
        desc: "April sales revenue",
        date: midOf(3),
        lines: [
          { a: acctCodes["1020"], d: "380000", c: "0" },
          { a: acctCodes["1100"], d: "150000", c: "0" },
          { a: acctCodes["4010"], d: "0", c: "460869.57" },
          { a: acctCodes["2100"], d: "0", c: "69130.43" },
        ],
      },
      {
        month: 3,
        num: 27,
        desc: "April cost of goods sold",
        date: midOf(3),
        lines: [
          { a: acctCodes["5010"], d: "230000", c: "0" },
          { a: acctCodes["1200"], d: "0", c: "230000" },
        ],
      },
      {
        month: 3,
        num: 28,
        desc: "April rent payment",
        date: startOf(3),
        lines: [
          { a: acctCodes["6020"], d: "75000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "75000" },
        ],
      },
      {
        month: 3,
        num: 29,
        desc: "April marketing expense",
        date: endOf(3),
        lines: [
          { a: acctCodes["6070"], d: "28000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "28000" },
        ],
      },
      {
        month: 4,
        num: 30,
        desc: "May sales revenue",
        date: midOf(4),
        lines: [
          { a: acctCodes["1100"], d: "290000", c: "0" },
          { a: acctCodes["1020"], d: "120000", c: "0" },
          { a: acctCodes["4010"], d: "0", c: "356521.74" },
          { a: acctCodes["2100"], d: "0", c: "53478.26" },
        ],
      },
      {
        month: 4,
        num: 31,
        desc: "May cost of goods sold",
        date: midOf(4),
        lines: [
          { a: acctCodes["5010"], d: "210000", c: "0" },
          { a: acctCodes["1200"], d: "0", c: "210000" },
        ],
      },
      {
        month: 4,
        num: 32,
        desc: "May office supplies",
        date: endOf(4),
        lines: [
          { a: acctCodes["6050"], d: "18000", c: "0" },
          { a: acctCodes["1010"], d: "0", c: "18000" },
        ],
      },
      {
        month: 4,
        num: 33,
        desc: "May equipment repair",
        date: midOf(4),
        lines: [
          { a: acctCodes["6060"], d: "22000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "22000" },
        ],
      },
      {
        month: 5,
        num: 34,
        desc: "June sales revenue",
        date: midOf(5),
        lines: [
          { a: acctCodes["1100"], d: "420000", c: "0" },
          { a: acctCodes["1020"], d: "180000", c: "0" },
          { a: acctCodes["4010"], d: "0", c: "391304.35" },
          { a: acctCodes["2100"], d: "0", c: "58695.65" },
        ],
      },
      {
        month: 5,
        num: 35,
        desc: "June cost of goods sold",
        date: midOf(5),
        lines: [
          { a: acctCodes["5010"], d: "280000", c: "0" },
          { a: acctCodes["1200"], d: "0", c: "280000" },
        ],
      },
      {
        month: 5,
        num: 36,
        desc: "June salaries",
        date: startOf(5),
        lines: [
          { a: acctCodes["6010"], d: "250000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "250000" },
        ],
      },
      {
        month: 5,
        num: 37,
        desc: "June marketing expense",
        date: endOf(5),
        lines: [
          { a: acctCodes["6070"], d: "55000", c: "0" },
          { a: acctCodes["1020"], d: "0", c: "55000" },
        ],
      },
    ];

    const arInvoiceData = [
      {
        cIdx: 0,
        no: "SI-2026-004",
        date: midOf(2),
        amount: "220000",
        status: "paid",
      },
      {
        cIdx: 1,
        no: "SI-2026-005",
        date: endOf(2),
        amount: "145000",
        status: "partial",
      },
      {
        cIdx: 2,
        no: "SI-2026-006",
        date: midOf(3),
        amount: "310000",
        status: "paid",
      },
      {
        cIdx: 0,
        no: "SI-2026-007",
        date: endOf(3),
        amount: "185000",
        status: "pending",
      },
      {
        cIdx: 1,
        no: "SI-2026-008",
        date: midOf(4),
        amount: "195000",
        status: "partial",
      },
      {
        cIdx: 2,
        no: "SI-2026-009",
        date: endOf(4),
        amount: "260000",
        status: "pending",
      },
      {
        cIdx: 0,
        no: "SI-2026-010",
        date: midOf(5),
        amount: "380000",
        status: "partial",
      },
      {
        cIdx: 2,
        no: "SI-2026-011",
        date: endOf(5),
        amount: "225000",
        status: "pending",
      },
    ];

    const apInvoiceData = [
      {
        sIdx: 0,
        no: "INV-2026-004",
        date: midOf(2),
        amount: "95000",
        status: "paid",
      },
      {
        sIdx: 1,
        no: "INV-2026-005",
        date: endOf(2),
        amount: "78000",
        status: "partial",
      },
      {
        sIdx: 2,
        no: "INV-2026-006",
        date: midOf(3),
        amount: "112000",
        status: "paid",
      },
      {
        sIdx: 0,
        no: "INV-2026-007",
        date: endOf(3),
        amount: "65000",
        status: "pending",
      },
      {
        sIdx: 1,
        no: "INV-2026-008",
        date: midOf(4),
        amount: "88000",
        status: "partial",
      },
      {
        sIdx: 2,
        no: "INV-2026-009",
        date: endOf(4),
        amount: "145000",
        status: "pending",
      },
      {
        sIdx: 0,
        no: "INV-2026-010",
        date: midOf(5),
        amount: "135000",
        status: "partial",
      },
      {
        sIdx: 1,
        no: "INV-2026-011",
        date: endOf(5),
        amount: "92000",
        status: "pending",
      },
    ];

    const bankTxData = [
      {
        aIdx: 0,
        date: startOf(2),
        type: "withdrawal",
        amount: "250000",
        desc: "March payroll",
      },
      {
        aIdx: 0,
        date: midOf(2),
        type: "deposit",
        amount: "220000",
        desc: "Payment from Brikama Market",
      },
      {
        aIdx: 0,
        date: endOf(2),
        type: "withdrawal",
        amount: "95000",
        desc: "Payment to Global Supplies",
      },
      {
        aIdx: 0,
        date: endOf(2),
        type: "withdrawal",
        amount: "35000",
        desc: "NAWEC utilities",
      },
      {
        aIdx: 0,
        date: midOf(3),
        type: "deposit",
        amount: "530000",
        desc: "April sales receipts",
      },
      {
        aIdx: 0,
        date: startOf(3),
        type: "withdrawal",
        amount: "75000",
        desc: "April office rent",
      },
      {
        aIdx: 0,
        date: endOf(3),
        type: "withdrawal",
        amount: "28000",
        desc: "Marketing campaign",
      },
      {
        aIdx: 0,
        date: midOf(3),
        type: "withdrawal",
        amount: "112000",
        desc: "Senegal Import payment",
      },
      {
        aIdx: 0,
        date: midOf(4),
        type: "deposit",
        amount: "410000",
        desc: "May sales receipts",
      },
      {
        aIdx: 0,
        date: midOf(4),
        type: "withdrawal",
        amount: "88000",
        desc: "Payment to Banjul Wholesale",
      },
      {
        aIdx: 0,
        date: endOf(4),
        type: "withdrawal",
        amount: "18000",
        desc: "Office supplies expense",
      },
      {
        aIdx: 1,
        date: midOf(4),
        type: "interest",
        amount: "4200",
        desc: "Savings interest May",
      },
      {
        aIdx: 0,
        date: startOf(5),
        type: "withdrawal",
        amount: "250000",
        desc: "June payroll",
      },
      {
        aIdx: 0,
        date: midOf(5),
        type: "deposit",
        amount: "600000",
        desc: "June sales receipts",
      },
      {
        aIdx: 0,
        date: midOf(5),
        type: "withdrawal",
        amount: "135000",
        desc: "Payment to Global Supplies",
      },
      {
        aIdx: 0,
        date: endOf(5),
        type: "withdrawal",
        amount: "55000",
        desc: "June advertising spend",
      },
      {
        aIdx: 0,
        date: endOf(5),
        type: "fee",
        amount: "3500",
        desc: "Bank service charges",
      },
    ];

    const invTxData = [
      {
        item: 0,
        wh: 0,
        type: "receipt",
        qty: 100,
        cost: "2800",
        date: startOf(2),
        ref: "March purchase order",
      },
      {
        item: 0,
        wh: 0,
        type: "issue",
        qty: -35,
        cost: "2800",
        date: midOf(2),
        ref: "March sales",
      },
      {
        item: 1,
        wh: 0,
        type: "receipt",
        qty: 60,
        cost: "1200",
        date: startOf(2),
        ref: "March oil stock",
      },
      {
        item: 2,
        wh: 0,
        type: "issue",
        qty: -50,
        cost: "1800",
        date: midOf(2),
        ref: "March sugar sales",
      },
      {
        item: 3,
        wh: 1,
        type: "receipt",
        qty: 80,
        cost: "900",
        date: startOf(3),
        ref: "April Brikama restock",
      },
      {
        item: 1,
        wh: 0,
        type: "issue",
        qty: -40,
        cost: "1200",
        date: midOf(3),
        ref: "April oil sales",
      },
      {
        item: 4,
        wh: 0,
        type: "receipt",
        qty: 30,
        cost: "2400",
        date: startOf(3),
        ref: "April soap purchase",
      },
      {
        item: 4,
        wh: 0,
        type: "adjustment",
        qty: -1,
        cost: "2400",
        date: endOf(3),
        ref: "Damaged stock write-off",
      },
      {
        item: 0,
        wh: 0,
        type: "receipt",
        qty: 120,
        cost: "2800",
        date: startOf(4),
        ref: "May rice purchase",
      },
      {
        item: 0,
        wh: 0,
        type: "issue",
        qty: -40,
        cost: "2800",
        date: midOf(4),
        ref: "May rice sales",
      },
      {
        item: 3,
        wh: 1,
        type: "issue",
        qty: -15,
        cost: "900",
        date: endOf(4),
        ref: "May onions sales",
      },
      {
        item: 4,
        wh: 0,
        type: "receipt",
        qty: 50,
        cost: "2400",
        date: startOf(4),
        ref: "May soap restock",
      },
      {
        item: 1,
        wh: 0,
        type: "receipt",
        qty: 90,
        cost: "1200",
        date: startOf(5),
        ref: "June cooking oil purchase",
      },
      {
        item: 0,
        wh: 0,
        type: "issue",
        qty: -45,
        cost: "2800",
        date: midOf(5),
        ref: "June rice sales",
      },
      {
        item: 2,
        wh: 0,
        type: "issue",
        qty: -60,
        cost: "1800",
        date: midOf(5),
        ref: "June sugar sales",
      },
      {
        item: 3,
        wh: 1,
        type: "receipt",
        qty: 70,
        cost: "900",
        date: startOf(5),
        ref: "June onions restock",
      },
      {
        item: 4,
        wh: 0,
        type: "adjustment",
        qty: -3,
        cost: "2400",
        date: endOf(5),
        ref: "Damaged soap write-off",
      },
    ];

    const docData = [
      {
        name: "Invoice-SI-2026-004.pdf",
        type: "invoice",
        status: "processed",
        size: 260000,
      },
      {
        name: "Bank-Statement-Mar2026.pdf",
        type: "bank_statement",
        status: "processed",
        size: 480000,
      },
      {
        name: "Invoice-SI-2026-006.pdf",
        type: "invoice",
        status: "processed",
        size: 270000,
      },
      {
        name: "Bank-Statement-Apr2026.pdf",
        type: "bank_statement",
        status: "processed",
        size: 510000,
      },
      {
        name: "Invoice-SI-2026-008.pdf",
        type: "invoice",
        status: "processed",
        size: 255000,
      },
      {
        name: "Bank-Statement-May2026.pdf",
        type: "bank_statement",
        status: "processed",
        size: 495000,
      },
      {
        name: "Invoice-SI-2026-010.pdf",
        type: "invoice",
        status: "processed",
        size: 290000,
      },
      {
        name: "Payroll-June-2026.xlsx",
        type: "payroll_report",
        status: "uploaded",
        size: 82000,
      },
    ];

    const pettyData = [
      {
        date: startOf(2),
        type: "receipt",
        amount: "5000",
        desc: "Petty cash float top-up",
        balance: "50000",
      },
      {
        date: midOf(2),
        type: "expense",
        amount: "3200",
        desc: "Staff refreshments",
        balance: "33800",
      },
      {
        date: endOf(2),
        type: "expense",
        amount: "1500",
        desc: "Office cleaning supplies",
        balance: "32300",
      },
      {
        date: startOf(3),
        type: "receipt",
        amount: "3000",
        desc: "Petty cash top-up",
        balance: "35300",
      },
      {
        date: midOf(3),
        type: "expense",
        amount: "2800",
        desc: "Stationery purchase",
        balance: "32500",
      },
      {
        date: startOf(4),
        type: "receipt",
        amount: "2500",
        desc: "Petty cash top-up",
        balance: "34800",
      },
      {
        date: midOf(4),
        type: "expense",
        amount: "4200",
        desc: "Staff refreshments",
        balance: "30600",
      },
      {
        date: startOf(5),
        type: "receipt",
        amount: "4000",
        desc: "Petty cash float top-up",
        balance: "36300",
      },
      {
        date: midOf(5),
        type: "expense",
        amount: "5800",
        desc: "Office refreshments",
        balance: "30500",
      },
      {
        date: endOf(5),
        type: "expense",
        amount: "2100",
        desc: "Printer supplies",
        balance: "28400",
      },
    ];

    for (const entry of journalData) {
      const jeId = crypto.randomUUID();
      await db.insert(schema.journalEntries).values({
        id: jeId,
        entityId: ENTITY_ID,
        entryNumber: entry.num,
        description: entry.desc,
        date: entry.date,
        periodId: periodMap.get(entry.month)!,
        status: "posted",
        postedBy: userId,
        postedAt: new Date(entry.date),
        source: "seed",
      });

      for (const line of entry.lines) {
        await db.insert(schema.journalEntryLines).values({
          journalEntryId: jeId,
          accountId: line.a,
          debit: line.d,
          credit: line.c,
          description: entry.desc,
        });
      }
    }

    for (const inv of arInvoiceData) {
      let invId = crypto.randomUUID();
      await db
        .insert(schema.salesInvoices)
        .values({
          entityId: ENTITY_ID,
          customerId: customerIds[inv.cIdx],
          invoiceNumber: inv.no,
          invoiceDate: inv.date,
          dueDate: `2026-${String(new Date(inv.date).getMonth() + 2).padStart(2, "0")}-${inv.date.slice(8, 10)}`,
          totalAmount: inv.amount,
          balance:
            inv.status === "paid"
              ? "0"
              : inv.status === "partial"
                ? String(Math.round(parseFloat(inv.amount) * 0.4))
                : inv.amount,
          currency: "GMD",
          status: inv.status as
            | "pending"
            | "partial"
            | "paid"
            | "overdue"
            | "voided",
        })
        .onConflictDoNothing();

      const existing = await db
        .select()
        .from(schema.salesInvoices)
        .where(
          and(
            eq(schema.salesInvoices.entityId, ENTITY_ID),
            eq(schema.salesInvoices.invoiceNumber, inv.no),
          ),
        );
      invId = existing[0]?.id ?? invId;

      await db.insert(schema.salesInvoiceLines).values({
        salesInvoiceId: invId,
        accountId: acctCodes["4010"],
        description: `Goods/services - ${inv.no}`,
        quantity: "1",
        unitPrice: inv.amount,
        amount: inv.amount,
      });
    }

    for (const inv of apInvoiceData) {
      let invId = crypto.randomUUID();
      await db
        .insert(schema.invoicesAp)
        .values({
          entityId: ENTITY_ID,
          supplierId: supplierIds[inv.sIdx],
          invoiceNumber: inv.no,
          invoiceDate: inv.date,
          dueDate: `2026-${String(new Date(inv.date).getMonth() + 2).padStart(2, "0")}-${inv.date.slice(8, 10)}`,
          totalAmount: inv.amount,
          balance:
            inv.status === "paid"
              ? "0"
              : inv.status === "partial"
                ? String(Math.round(parseFloat(inv.amount) * 0.4))
                : inv.amount,
          currency: "GMD",
          status: inv.status as
            | "pending"
            | "partial"
            | "paid"
            | "overdue"
            | "voided",
        })
        .onConflictDoNothing();

      const existing = await db
        .select()
        .from(schema.invoicesAp)
        .where(
          and(
            eq(schema.invoicesAp.entityId, ENTITY_ID),
            eq(schema.invoicesAp.invoiceNumber, inv.no),
          ),
        );
      invId = existing[0]?.id ?? invId;

      await db.insert(schema.invoiceApLines).values({
        invoiceApId: invId,
        accountId: acctCodes["1200"],
        description: `Purchase - ${inv.no}`,
        quantity: "1",
        unitPrice: inv.amount,
        amount: inv.amount,
      });
    }

    for (const tx of bankTxData) {
      await db.insert(schema.bankTransactions).values({
        entityId: ENTITY_ID,
        bankAccountId: bankAccountIds[tx.aIdx],
        transactionDate: tx.date,
        type: tx.type as
          | "deposit"
          | "withdrawal"
          | "transfer"
          | "fee"
          | "interest",
        amount: tx.amount,
        description: tx.desc,
        isReconciled: false,
        source: "seed",
      });
    }

    for (const tx of invTxData) {
      await db.insert(schema.inventoryTransactions).values({
        entityId: ENTITY_ID,
        inventoryItemId: inventoryItemIds[tx.item],
        warehouseId: warehouseIds[tx.wh],
        type: tx.type as
          | "receipt"
          | "issue"
          | "adjustment"
          | "transfer"
          | "return",
        quantity: tx.qty,
        unitCost: tx.cost,
        totalCost: String(Math.abs(tx.qty) * parseFloat(tx.cost)),
        transactionDate: tx.date,
        notes: tx.ref,
      });
    }

    for (const doc of docData) {
      const docId = crypto.randomUUID();
      await db.insert(schema.documents).values({
        id: docId,
        entityId: ENTITY_ID,
        name: doc.name,
        type: doc.type as
          | "invoice"
          | "receipt"
          | "contract"
          | "voucher"
          | "bank_statement"
          | "tax_return"
          | "payroll_report"
          | "journal_entry"
          | "po"
          | "supporting",
        status: doc.status as "uploaded" | "processed" | "archived",
        mimeType:
          doc.type === "payroll_report"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        sizeBytes: doc.size,
        r2Key: `${ENTITY_ID}/documents/${doc.name}`,
        r2Bucket: "xenboox-uploads",
        uploadedBy: userId,
        tags: [doc.type],
      });

      await db.insert(schema.documentLinks).values({
        id: crypto.randomUUID(),
        documentId: docId,
        entityType: "entity",
        entityId: ENTITY_ID,
      });
    }

    for (const p of pettyData) {
      await db.insert(schema.pettyCashLedger).values({
        id: crypto.randomUUID(),
        entityId: ENTITY_ID,
        cashAccountId: cashAccountIds[0],
        transactionDate: p.date,
        description: p.desc,
        debit:
          p.type === "receipt" || p.type === "replenishment" ? p.amount : "0",
        credit: p.type === "expense" ? p.amount : "0",
        balance: p.balance,
        category: p.type === "expense" ? "office_supplies" : "replenishment",
      });
    }

    for (const period of ["2026-03", "2026-04", "2026-05", "2026-06"]) {
      await db.insert(schema.payrollRuns).values({
        id: crypto.randomUUID(),
        entityId: ENTITY_ID,
        period,
        status: "paid",
        employeeCount: 5,
        grossPay: "173000",
        totalDeductions: "25950",
        totalEmployerContributions: "17300",
        netPay: "147050",
        processedBy: userId,
        approvedBy: userId,
      });
    }

    await db.insert(schema.reconciliations).values({
      id: crypto.randomUUID(),
      entityId: ENTITY_ID,
      bankAccountId: bankAccountIds[0],
      statementDate: "2026-06-30",
      statementBalance: "686250",
      bookBalance: "686250",
      difference: "0",
      status: "closed",
      closedBy: userId,
      closedAt: new Date("2026-07-01"),
    });

    return NextResponse.json({
      success: true,
      message: "4-month demo data seeded successfully",
    });
  } catch (err) {
    logger.error({ err }, "Seed endpoint failed");
    return NextResponse.json(
      { error: "Seed failed", details: String(err) },
      { status: 500 },
    );
  }
}
