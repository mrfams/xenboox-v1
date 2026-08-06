import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../index";
import * as schema from "../schema";

// ─── Helpers ────────────────────────────────────────────────────────────────

let ENTITY_ID = "f19095a8-b547-4751-91c1-ede98d59de9b";

function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Seed Function ──────────────────────────────────────────────────────────

export async function seedComprehensiveData(entityId?: string) {
  if (entityId) ENTITY_ID = entityId;
  console.log(
    "Seeding comprehensive data (conversations, audit, routing, exchange rates, close sessions)...",
  );

  // Get user ID
  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "demo@xenboox.com"));
  const userId = userRows[0]?.id;
  if (!userId) {
    console.error(
      "  ⚠ demo@xenboox.com not found — skipping comprehensive seed",
    );
    return;
  }

  // ── 1. Conversations (chat data) ─────────────────────────────────────────

  console.log("  Creating conversations...");

  const conversationData = [
    {
      title: "Monthly Revenue Analysis",
      date: dateStr(2026, 7, 28),
      messages: [
        {
          role: "user" as const,
          content: "What was our revenue performance in July compared to June?",
        },
        {
          role: "assistant" as const,
          content:
            "July revenue was GMD 400,000 from 12 invoices. This is a 12% increase over June's GMD 357,000. The growth was driven primarily by increased sales to Brikama Market Traders and Serrekunda Hardware. Your AR collection rate improved to 68%, up from 54% in June.",
        },
        {
          role: "user" as const,
          content: "Which customer contributed the most?",
        },
        {
          role: "assistant" as const,
          content:
            "Kanifing Municipal Council was your top customer in July with GMD 165,000 in invoices (41% of total revenue). Brikama Market Traders contributed GMD 120,000 (30%) and Serrekunda Hardware contributed GMD 115,000 (29%).",
        },
      ],
    },
    {
      title: "Cash Flow Forecast",
      date: dateStr(2026, 7, 25),
      messages: [
        {
          role: "user" as const,
          content: "Can you give me a cash flow forecast for the next 30 days?",
        },
        {
          role: "assistant" as const,
          content:
            "Based on your current receivables and payables:\n\n**Inflows (next 30 days):**\n- Expected collections: GMD 380,000 (from SI-2026-010 partial + SI-2026-011)\n- Mobile money collections: ~GMD 45,000\n\n**Outflows (next 30 days):**\n- Payroll: GMD 173,000 (end of month)\n- Supplier payments: GMD 227,000 (INV-2026-009, INV-2026-010)\n- Rent: GMD 75,000\n- Utilities: ~GMD 38,000\n\n**Net position:** You'll need approximately GMD 88,000 to cover obligations. Your current bank balance of GMD 520,000 provides adequate headroom, but I recommend collecting the outstanding AR before the supplier payment due date.",
        },
      ],
    },
    {
      title: "Payroll Discrepancy Review",
      date: dateStr(2026, 7, 20),
      messages: [
        {
          role: "user" as const,
          content:
            "I noticed the payroll figures look different this month. Can you review?",
        },
        {
          role: "assistant" as const,
          content:
            "I've reviewed the July payroll run. The gross pay remains at GMD 173,000 for 5 employees. Here's the breakdown:\n\n- Ousman Jatta: GMD 50,000 (45K base + 5K transport)\n- Fatoumata Jawara: GMD 43,000 (38K base + 5K transport)\n- Ismaila Ceesay: GMD 40,000 (35K base + 5K transport)\n- Awa Bah: GMD 30,000 (25K base + 5K transport)\n- Bubacarr Jobe: GMD 35,000 (30K base + 5K transport)\n\nDeductions include PAYE (15%), SSNIT employee (5%), and NHIF (GMD 200). Ismaila Ceesay also has a GMD 5,000 staff loan deduction. The figures look correct to me.",
        },
        { role: "user" as const, content: "Good, approve it." },
        {
          role: "assistant" as const,
          content:
            "July payroll has been approved. The payroll run status has been updated to 'approved' and is ready for payment processing. Payment should be initiated by the 28th to meet the month-end deadline.",
        },
      ],
    },
    {
      title: "Inventory Restock Recommendation",
      date: dateStr(2026, 7, 15),
      messages: [
        {
          role: "user" as const,
          content: "Which inventory items need restocking?",
        },
        {
          role: "assistant" as const,
          content:
            "Based on current stock levels and reorder points:\n\n**Critical (below reorder level):**\n- Rice (25kg): 105 units on hand, reorder level is 45 — well stocked\n- Cooking Oil (5L): 70 units on hand, reorder level is 24 — adequate\n\n**Recommended restock:**\n- Sugar (10kg): 100 units on hand, consumption rate ~30/month. Recommend ordering 100 units.\n- Soap (carton): 34 units on hand, consumption rate ~5/month. Adequate for now.\n- Onions (10kg): 50 units at Brikama, 0 at main. Transfer 20 from Brikama or restock.\n\nI recommend placing a purchase order for Sugar and Onions within the next 2 weeks.",
        },
      ],
    },
    {
      title: "Tax Compliance Check",
      date: dateStr(2026, 7, 10),
      messages: [
        {
          role: "user" as const,
          content: "Are we up to date on our tax obligations?",
        },
        {
          role: "assistant" as const,
          content:
            "Here's your compliance status:\n\n✅ **VAT Return (June):** Filed and paid — GMD 58,695\n✅ **PAYE (June):** Remitted — GMD 25,950\n✅ **SSNIT Contributions (June):** Filed — GMD 17,300 employer + GMD 8,650 employee\n\n⚠️ **VAT Return (July):** Due by August 15. Estimated liability: GMD 52,174 based on July sales.\n⚠️ **PAYE (July):** Due by August 10. Amount: GMD 25,950.\n\nNo overdue filings. All previous periods are compliant. I recommend setting up calendar reminders for the July filings.",
        },
      ],
    },
    {
      title: "Bank Reconciliation Discussion",
      date: dateStr(2026, 7, 5),
      messages: [
        {
          role: "user" as const,
          content:
            "The June bank reconciliation showed a difference. Can you explain?",
        },
        {
          role: "assistant" as const,
          content:
            "The June reconciliation has been completed with zero difference. The statement balance matched the book balance at GMD 686,250. All 17 bank transactions for June have been matched to their corresponding journal entries.\n\nThe reconciliation was closed on July 1 by the demo user. There are currently no open reconciliation items for June.",
        },
      ],
    },
    {
      title: "Vendor Payment Strategy",
      date: dateStr(2026, 6, 28),
      messages: [
        {
          role: "user" as const,
          content: "Which supplier payments should we prioritize this week?",
        },
        {
          role: "assistant" as const,
          content:
            "Based on payment terms and aging:\n\n**Priority 1 (Overdue):**\n- INV-2026-009 from Senegal Import Co: GMD 145,000 — 30 days overdue\n\n**Priority 2 (Due soon):**\n- INV-2026-010 from Global Supplies Ltd: GMD 135,000 — due July 15\n- INV-2026-011 from Banjul Wholesale: GMD 92,000 — due July 25\n\n**Recommendation:** Pay the overdue Senegal Import invoice immediately to maintain the supplier relationship. Then schedule Global Supplies for next week. You have GMD 520,000 in your main account which covers all three payments.",
        },
      ],
    },
    {
      title: "Profit Margin Analysis",
      date: dateStr(2026, 6, 20),
      messages: [
        {
          role: "user" as const,
          content: "How are our profit margins trending?",
        },
        {
          role: "assistant" as const,
          content:
            "Here's your margin analysis for the last 3 months:\n\n| Month | Revenue | COGS | Gross Margin | Net Margin |\n|-------|---------|------|-------------|------------|\n| May | GMD 410,000 | GMD 210,000 | 48.8% | 22.4% |\n| Jun | GMD 570,000 | GMD 280,000 | 50.9% | 24.1% |\n| Jul | GMD 400,000 | GMD 200,000 | 50.0% | 20.5% |\n\nGross margins are stable around 49-51%. Net margin dipped in July mainly due to the annual insurance premium (GMD 120,000). Excluding that one-time expense, net margin would be approximately 32%. Overall, the business is healthy.",
        },
      ],
    },
  ];

  for (let i = 0; i < conversationData.length; i++) {
    const conv = conversationData[i];
    const convId = seedUuid("conv", i + 1);

    await db
      .insert(schema.conversations)
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
        .insert(schema.chatMessages)
        .values({
          id: msgId,
          conversationId: convId,
          role: msg.role,
          content: msg.content,
          status: "completed",
          confidence: msg.role === "assistant" ? 0.92 : null,
          agentModel: msg.role === "assistant" ? "sonnet-4-6" : null,
          tokenCount: msg.content.length,
          latencyMs:
            msg.role === "assistant"
              ? 1200 + Math.floor(Math.random() * 800)
              : null,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`    ✓ ${conversationData.length} conversations with messages`);

  // ── 2. Audit Log ─────────────────────────────────────────────────────────

  console.log("  Creating audit log entries...");

  const auditEntries = [
    {
      date: dateStr(2026, 5, 2),
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted journal entry #30 — May sales revenue",
    },
    {
      date: dateStr(2026, 5, 5),
      action: "document.uploaded",
      entityType: "document",
      desc: "Uploaded Bank-Statement-May2026.pdf",
    },
    {
      date: dateStr(2026, 5, 8),
      action: "expense.claimed",
      entityType: "expense_claim",
      desc: "Awa Bah submitted office supplies claim — GMD 18,000",
    },
    {
      date: dateStr(2026, 5, 12),
      action: "invoice.created",
      entityType: "sales_invoice",
      desc: "Created SI-2026-008 for Serrekunda Hardware — GMD 195,000",
    },
    {
      date: dateStr(2026, 5, 15),
      action: "payroll.approved",
      entityType: "payroll_run",
      desc: "May payroll approved — 5 employees, GMD 147,050 net",
    },
    {
      date: dateStr(2026, 5, 18),
      action: "agent.action",
      entityType: "agent_routing",
      desc: "AR Agent sent overdue reminder to Brikama Market Traders",
    },
    {
      date: dateStr(2026, 5, 22),
      action: "bank.reconciliation",
      entityType: "reconciliation",
      desc: "May bank reconciliation completed — zero difference",
    },
    {
      date: dateStr(2026, 6, 1),
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted journal entry #34 — June sales revenue",
    },
    {
      date: dateStr(2026, 6, 3),
      action: "invoice.created",
      entityType: "sales_invoice",
      desc: "Created SI-2026-010 for Brikama Market Traders — GMD 380,000",
    },
    {
      date: dateStr(2026, 6, 8),
      action: "document.uploaded",
      entityType: "document",
      desc: "Uploaded Invoice-SI-2026-010.pdf",
    },
    {
      date: dateStr(2026, 6, 10),
      action: "agent.action",
      entityType: "agent_routing",
      desc: "AP Agent flagged INV-2026-009 as overdue — requires follow-up",
    },
    {
      date: dateStr(2026, 6, 15),
      action: "payroll.approved",
      entityType: "payroll_run",
      desc: "June payroll approved — 5 employees, GMD 147,050 net",
    },
    {
      date: dateStr(2026, 6, 18),
      action: "inventory.adjusted",
      entityType: "inventory",
      desc: "Damaged soap write-off — 3 cartons at GMD 2,400 each",
    },
    {
      date: dateStr(2026, 6, 25),
      action: "expense.approved",
      entityType: "expense_claim",
      desc: "June marketing expense approved — GMD 55,000",
    },
    {
      date: dateStr(2026, 6, 30),
      action: "bank.reconciliation",
      entityType: "reconciliation",
      desc: "June bank reconciliation completed — zero difference",
    },
    {
      date: dateStr(2026, 7, 1),
      action: "journal_entry.posted",
      entityType: "journal_entry",
      desc: "Posted journal entry #15 — July AR collection",
    },
    {
      date: dateStr(2026, 7, 3),
      action: "payment.processed",
      entityType: "payment",
      desc: "Paid INV-2026-004 to Global Supplies — GMD 95,000",
    },
    {
      date: dateStr(2026, 7, 8),
      action: "agent.action",
      entityType: "agent_routing",
      desc: "Treasury Agent generated daily cash position report",
    },
    {
      date: dateStr(2026, 7, 12),
      action: "document.processed",
      entityType: "document",
      desc: "OCR completed on Bank-Statement-July2026.pdf — 98% confidence",
    },
    {
      date: dateStr(2026, 7, 15),
      action: "invoice.created",
      entityType: "sales_invoice",
      desc: "Created SI-2026-011 for Kanifing Municipal Council — GMD 225,000",
    },
    {
      date: dateStr(2026, 7, 20),
      action: "close.started",
      entityType: "close_session",
      desc: "July month-end close initiated by CFO Agent",
    },
    {
      date: dateStr(2026, 7, 25),
      action: "agent.action",
      entityType: "agent_routing",
      desc: "Analytics Agent detected revenue growth trend — 12% MoM",
    },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    await db
      .insert(schema.auditLog)
      .values({
        id: seedUuid("audit", i + 1),
        entityId: ENTITY_ID,
        userId: userId,
        action: entry.action,
        entityType: entry.entityType,
        newValues: { description: entry.desc },
        confidence: "0.95",
        ipAddress: "192.168.1.100",
        userAgent: "Xenboox/1.0",
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${auditEntries.length} audit log entries`);

  // ── 3. Agent Routing Logs ────────────────────────────────────────────────

  console.log("  Creating agent routing logs...");

  const routingLogs = [
    {
      date: dateStr(2026, 5, 3),
      intent: "invoice_classification",
      summary: "Classified supplier invoice from Global Supplies",
      decision: "auto",
      confidence: "0.940",
    },
    {
      date: dateStr(2026, 5, 8),
      intent: "expense_approval",
      summary: "Awa Bah office supplies claim under threshold — auto-approved",
      decision: "auto",
      confidence: "0.910",
    },
    {
      date: dateStr(2026, 5, 12),
      intent: "bank_reconciliation",
      summary: "Matched 12 bank transactions to journal entries",
      decision: "auto",
      confidence: "0.960",
    },
    {
      date: dateStr(2026, 5, 18),
      intent: "overdue_reminder",
      summary: "AR Agent sent payment reminder to Brikama Market Traders",
      decision: "auto",
      confidence: "0.890",
    },
    {
      date: dateStr(2026, 5, 25),
      intent: "payroll_calculation",
      summary:
        "May payroll calculated — 5 employees, statutory deductions applied",
      decision: "auto",
      confidence: "0.980",
    },
    {
      date: dateStr(2026, 6, 2),
      intent: "journal_entry_review",
      summary: "June sales entry flagged — VAT amount requires verification",
      decision: "escalated",
      confidence: "0.650",
    },
    {
      date: dateStr(2026, 6, 10),
      intent: "vendor_payment_priority",
      summary:
        "Identified overdue invoice INV-2026-009 — flagged for priority payment",
      decision: "auto",
      confidence: "0.920",
    },
    {
      date: dateStr(2026, 6, 15),
      intent: "payroll_approval",
      summary: "June payroll run ready for human approval",
      decision: "escalated",
      confidence: "0.780",
    },
    {
      date: dateStr(2026, 6, 18),
      intent: "inventory_adjustment",
      summary: "Damaged soap write-off detected — auto-processed",
      decision: "auto",
      confidence: "0.950",
    },
    {
      date: dateStr(2026, 6, 25),
      intent: "expense_anomaly",
      summary: "Marketing expense GMD 55,000 exceeds monthly average — flagged",
      decision: "escalated",
      confidence: "0.620",
    },
    {
      date: dateStr(2026, 7, 1),
      intent: "collection_prediction",
      summary: "Predicted 68% collection rate for outstanding AR",
      decision: "auto",
      confidence: "0.870",
    },
    {
      date: dateStr(2026, 7, 8),
      intent: "cash_position_report",
      summary: "Daily treasury report generated — cash position healthy",
      decision: "auto",
      confidence: "0.960",
    },
    {
      date: dateStr(2026, 7, 12),
      intent: "document_ocr",
      summary: "Bank statement processed — 42 transactions extracted",
      decision: "auto",
      confidence: "0.940",
    },
    {
      date: dateStr(2026, 7, 20),
      intent: "month_end_close",
      summary: "July close checklist initiated — 8 tasks pending",
      decision: "auto",
      confidence: "0.930",
    },
    {
      date: dateStr(2026, 7, 25),
      intent: "trend_detection",
      summary: "Revenue growth trend detected — 12% MoM increase",
      decision: "auto",
      confidence: "0.910",
    },
  ];

  for (let i = 0; i < routingLogs.length; i++) {
    const log = routingLogs[i];
    await db
      .insert(schema.agentRoutingLogs)
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

  console.log(`    ✓ ${routingLogs.length} agent routing logs`);

  // ── 4. Exchange Rates ────────────────────────────────────────────────────

  console.log("  Creating exchange rates...");

  // First ensure currencies exist
  const currencyData = [
    { code: "GMD", name: "Gambian Dalasi", symbol: "D", decimalPlaces: 2 },
    { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
    { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
    { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimalPlaces: 2 },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", decimalPlaces: 2 },
    { code: "XOF", name: "CFA Franc", symbol: "CFA", decimalPlaces: 0 },
  ];

  for (const curr of currencyData) {
    await db
      .insert(schema.currencies)
      .values({
        code: curr.code,
        name: curr.name,
        symbol: curr.symbol,
        decimalPlaces: curr.decimalPlaces,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // Monthly exchange rates GMD → other currencies
  const exchangeRateData = [
    // May 2026
    { from: "USD", to: "GMD", rate: "68.50", source: "ecb", month: 5 },
    { from: "EUR", to: "GMD", rate: "74.20", source: "ecb", month: 5 },
    { from: "GBP", to: "GMD", rate: "86.80", source: "ecb", month: 5 },
    { from: "NGN", to: "GMD", rate: "0.042", source: "cbn", month: 5 },
    { from: "GHS", to: "GMD", rate: "5.60", source: "bank_of_ghana", month: 5 },
    { from: "XOF", to: "GMD", rate: "0.113", source: "bceao", month: 5 },
    // June 2026
    { from: "USD", to: "GMD", rate: "69.10", source: "ecb", month: 6 },
    { from: "EUR", to: "GMD", rate: "74.80", source: "ecb", month: 6 },
    { from: "GBP", to: "GMD", rate: "87.50", source: "ecb", month: 6 },
    { from: "NGN", to: "GMD", rate: "0.041", source: "cbn", month: 6 },
    { from: "GHS", to: "GMD", rate: "5.55", source: "bank_of_ghana", month: 6 },
    { from: "XOF", to: "GMD", rate: "0.112", source: "bceao", month: 6 },
    // July 2026
    { from: "USD", to: "GMD", rate: "69.80", source: "ecb", month: 7 },
    { from: "EUR", to: "GMD", rate: "75.30", source: "ecb", month: 7 },
    { from: "GBP", to: "GMD", rate: "88.20", source: "ecb", month: 7 },
    { from: "NGN", to: "GMD", rate: "0.043", source: "cbn", month: 7 },
    { from: "GHS", to: "GMD", rate: "5.50", source: "bank_of_ghana", month: 7 },
    { from: "XOF", to: "GMD", rate: "0.114", source: "bceao", month: 7 },
  ];

  for (let i = 0; i < exchangeRateData.length; i++) {
    const er = exchangeRateData[i];
    await db
      .insert(schema.exchangeRates)
      .values({
        fromCurrency: er.from,
        toCurrency: er.to,
        rate: er.rate,
        source: er.source,
        validFrom: new Date(2026, er.month - 1, 1),
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${exchangeRateData.length} exchange rates`);

  // ── 5. Close Sessions ────────────────────────────────────────────────────

  console.log("  Creating close sessions...");

  const closeSessionsData = [
    {
      year: 2026,
      month: 5,
      label: "2026-05",
      status: "locked" as const,
      closedAt: new Date(dateStr(2026, 6, 5)),
    },
    {
      year: 2026,
      month: 6,
      label: "2026-06",
      status: "locked" as const,
      closedAt: new Date(dateStr(2026, 7, 4)),
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
    // Find the fiscal period ID by year and month
    const periodRows = await db
      .select()
      .from(schema.fiscalPeriods)
      .where(and(eq(schema.fiscalPeriods.entityId, ENTITY_ID)));
    const periodRow = periodRows.find(
      (p) => p.year === cs.year && p.month === cs.month,
    );
    const periodId = periodRow?.id;
    if (!periodId) continue;

    await db
      .insert(schema.closeSessions)
      .values({
        id: seedUuid("close", i + 1),
        entityId: ENTITY_ID,
        fiscalPeriodId: periodId,
        periodLabel: cs.label,
        status: cs.status,
        triggeredByUserId: userId,
        closedAt: cs.closedAt,
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${closeSessionsData.length} close sessions`);

  // ── 6. Additional Documents ──────────────────────────────────────────────

  console.log("  Creating additional documents...");

  const additionalDocs = [
    {
      name: "Invoice-SI-2026-009.pdf",
      type: "invoice",
      status: "processed",
      size: 245000,
      date: dateStr(2026, 6, 20),
    },
    {
      name: "Receipt-NAWEC-July2026.pdf",
      type: "receipt",
      status: "processed",
      size: 45000,
      date: dateStr(2026, 7, 12),
    },
    {
      name: "Contract-TrustBank-2026.pdf",
      type: "contract",
      status: "processed",
      size: 520000,
      date: dateStr(2026, 5, 1),
    },
    {
      name: "Bank-Statement-July2026.pdf",
      type: "bank_statement",
      status: "processed",
      size: 510000,
      date: dateStr(2026, 7, 5),
    },
    {
      name: "Insurance-Policy-Annual.pdf",
      type: "contract",
      status: "processed",
      size: 380000,
      date: dateStr(2026, 7, 15),
    },
    {
      name: "VAT-Return-June2026.pdf",
      type: "tax_return",
      status: "processed",
      size: 92000,
      date: dateStr(2026, 7, 10),
    },
    {
      name: "Payroll-July-2026.xlsx",
      type: "payroll_report",
      status: "uploaded",
      size: 85000,
      date: dateStr(2026, 7, 28),
    },
    {
      name: "PO-2026-003-SenegalImport.pdf",
      type: "po",
      status: "processed",
      size: 67000,
      date: dateStr(2026, 7, 1),
    },
  ];

  for (const doc of additionalDocs) {
    await db
      .insert(schema.documents)
      .values({
        id: crypto.randomUUID(),
        entityId: ENTITY_ID,
        name: doc.name,
        type: doc.type as any,
        status: doc.status as any,
        mimeType: doc.name.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: doc.size,
        r2Key: `${ENTITY_ID}/documents/${doc.name}`,
        r2Bucket: "xenboox-uploads",
        uploadedBy: userId,
        tags: [doc.type],
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${additionalDocs.length} additional documents`);

  // ── 7. Notifications ─────────────────────────────────────────────────────

  console.log("  Creating notifications...");

  const notifications = [
    {
      title: "Invoice Overdue",
      body: "INV-2026-009 from Senegal Import Co. is 30 days overdue (GMD 145,000)",
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
      title: "VAT Return Due",
      body: "July VAT return is due by August 15",
      type: "system_alert",
      priority: "medium",
      read: false,
    },
    {
      title: "Reconciliation Complete",
      body: "June bank reconciliation completed with zero difference",
      type: "recon_discrepancy",
      priority: "low",
      read: true,
    },
    {
      title: "AI Flagged Transaction",
      body: "Marketing expense GMD 55,000 exceeds monthly average by 96%",
      type: "agent_flag",
      priority: "high",
      read: false,
    },
    {
      title: "Document Processed",
      body: "Bank-Statement-July2026.pdf processed — 42 transactions extracted",
      type: "ingestion_posted",
      priority: "low",
      read: true,
    },
    {
      title: "Revenue Milestone",
      body: "Monthly revenue exceeded GMD 500,000 for the first time in June",
      type: "report_ready",
      priority: "medium",
      read: true,
    },
    {
      title: "Inventory Alert",
      body: "Onions (10kg) stock at Brikama store is below reorder level",
      type: "budget_alert",
      priority: "medium",
      read: false,
    },
  ];

  for (let i = 0; i < notifications.length; i++) {
    const notif = notifications[i];
    await db
      .insert(schema.notifications)
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

  console.log(`    ✓ ${notifications.length} notifications`);

  // ── 8. Report Requests ───────────────────────────────────────────────────

  console.log("  Creating report requests...");

  // Get fiscal period IDs for reports
  const allPeriods = await db
    .select()
    .from(schema.fiscalPeriods)
    .where(eq(schema.fiscalPeriods.entityId, ENTITY_ID));
  const periodMap = new Map(
    allPeriods.map((p) => [
      `${p.year}-${String(p.month).padStart(2, "0")}`,
      p.id,
    ]),
  );

  const reportData = [
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
    {
      type: "cash_flow" as const,
      status: "completed" as const,
      period: "2026-06",
    },
    {
      type: "trial_balance" as const,
      status: "completed" as const,
      period: "2026-06",
    },
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
      type: "trial_balance" as const,
      status: "completed" as const,
      period: "2026-07",
    },
    {
      type: "cash_flow" as const,
      status: "completed" as const,
      period: "2026-07",
    },
  ];

  for (let i = 0; i < reportData.length; i++) {
    const report = reportData[i];
    await db
      .insert(schema.reportRequests)
      .values({
        id: seedUuid("rpt", i + 1),
        entityId: ENTITY_ID,
        statementType: report.type,
        status: report.status,
        requestedByUserId: userId,
        periodId: periodMap.get(report.period),
        metadata: { period: report.period },
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${reportData.length} report requests`);

  // ── 9. Agent Activity (for documents table) ──────────────────────────────

  console.log("  Creating agent activity entries...");

  const agentActivities = [
    {
      agent: "cfo",
      action: "Generated executive briefing for July",
      entity: "report",
    },
    {
      agent: "ledger",
      action: "Posted 7 journal entries for July",
      entity: "journal_entry",
    },
    {
      agent: "ar",
      action: "Created and sent 3 sales invoices",
      entity: "sales_invoice",
    },
    {
      agent: "ap",
      action: "Processed 4 supplier invoices",
      entity: "ap_invoice",
    },
    {
      agent: "reconciliation",
      action: "Completed June bank reconciliation",
      entity: "reconciliation",
    },
    {
      agent: "cash",
      action: "Replenished petty cash float",
      entity: "cash_account",
    },
    {
      agent: "payroll_worker",
      action: "Processed July payroll for 5 employees",
      entity: "payroll_run",
    },
    {
      agent: "tax",
      action: "Filed June VAT return — GMD 58,695",
      entity: "tax_filing",
    },
    {
      agent: "document",
      action: "OCR processed 8 documents this month",
      entity: "document",
    },
    {
      agent: "analytics",
      action: "Detected revenue growth trend — 12% MoM",
      entity: "analytics",
    },
  ];

  for (let i = 0; i < agentActivities.length; i++) {
    const activity = agentActivities[i];
    await db
      .insert(schema.agentActivity)
      .values({
        id: seedUuid("act", i + 1),
        entityId: ENTITY_ID,
        agentName: activity.agent,
        action: activity.action,
        status: "success",
        confidence: "0.94",
        durationMs: 1200 + Math.floor(Math.random() * 800),
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${agentActivities.length} agent activity entries`);

  console.log("Comprehensive data seeding complete!");
}
