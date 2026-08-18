/**
 * Seed-launch-data — fills the remaining operational domains for
 * demo@xenboox.com (Kerr Jula Trading Co., Gambia / GMD) with 6 months of
 * realistic data so every dashboard surface shows live, coherent data:
 *
 *   1. Reconciliations (bank) + items
 *   2. Cash / imprest: petty cash ledger, imprest floats + receipts
 *   3. Notifications (per user + entity)
 *   4. Agent runs (ops_live_runs + steps + events) — tenant agent monitor
 *   5. Audit log entries (append-only; the DB trigger chains them)
 *   6. Analytics: snapshots, trends, anomaly flags, health scores, forecasts
 *   7. Tax compliance: VAT calcs, withholding, filing deadlines, packages
 *   8. FX rates (GMD pairs)
 *   9. Close checklists for every month in the window
 *  10. Review queue items (platform, org-scoped)
 *
 * Idempotent: deterministic ids via idFromKey + onConflictDoNothing. Runs
 * AFTER seed() + seed-six-months() in seed-all.ts so the entity (and its
 * freshly-reset child data) already exists.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/auth";
import { organizations, entities } from "../schema/organization";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
  reconciliationItems,
} from "../schema/treasury";
import {
  cashAccounts,
  pettyCashLedger,
  imprestFloats,
  imprestReceipts,
} from "../schema/cash";
import { notifications } from "../schema/notifications";
import {
  opsLiveRuns,
  opsLiveRunSteps,
  opsLiveRunEvents,
} from "../schema/ops-live-runs";
import { auditLog } from "../schema/documents";
import {
  analyticsSnapshots,
  detectedTrends,
  anomalyFlags,
  healthScores,
  forecastModels,
} from "../schema/analytics";
import {
  vatCalculations,
  withholdingRecords,
  filingDeadlines,
  complianceDeadlines,
  taxPackages,
} from "../schema/tax-compliance";
import { fxRates } from "../schema/fx";
import { reviewItems } from "../schema/ops-review-queue";
import { idFromKey, shouldRunDirect } from "./seed-lib";
import { seedCloseTasks } from "./close-tasks";

const uuid = (type: string, n: number) => idFromKey(`${type}-${n}`);

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

export async function seedLaunchData() {
  console.log("Seeding launch completeness data (demo entity)...");

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

  // ── 1. Reconciliations (Feb–Jul, monthly for the main operating account) ──
  const bank = await db
    .select({ id: bankAccounts.id, balance: bankAccounts.currentBalance })
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.entityId, entityId),
        eq(bankAccounts.name, "Main Operating Account"),
      ),
    )
    .limit(1);
  const bankAccountId = bank[0]?.id;
  let reconCount = 0;
  if (bankAccountId) {
    for (let m = 0; m < MONTHS.length; m++) {
      const mon = MONTHS[m];
      const statementBalance = 520000 + m * 95000;
      const bookBalance = statementBalance + (m % 2 === 0 ? 0 : 2500);
      const reconId = uuid("e1", m + 1);
      await db
        .insert(reconciliations)
        .values({
          id: reconId,
          entityId,
          bankAccountId,
          statementDate: day(mon, 31),
          statementBalance: String(statementBalance),
          bookBalance: String(bookBalance),
          difference: String(statementBalance - bookBalance),
          status:
            m < MONTHS.length - 1 ? ("closed" as const) : ("partial" as const),
          closedBy: m < MONTHS.length - 1 ? "demo@xenboox.com" : null,
          closedAt:
            m < MONTHS.length - 1
              ? new Date(`${day(mon, 31)}T18:00:00Z`)
              : null,
          notes: `${mon.label} bank reconciliation`,
        })
        .onConflictDoNothing();
      // Link the month's reconciled bank transactions to the recon.
      const monthTxs = await db
        .select({ id: bankTransactions.id, amount: bankTransactions.amount })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            eq(bankTransactions.bankAccountId, bankAccountId),
            eq(bankTransactions.isReconciled, true),
          ),
        )
        .limit(12);
      for (const tx of monthTxs) {
        await db
          .insert(reconciliationItems)
          .values({
            id: uuid("e2", reconCount + 1),
            reconciliationId: reconId,
            bankTransactionId: tx.id,
            status: "matched" as const,
            matchedAmount: tx.amount,
            notes: "Matched in statement",
          })
          .onConflictDoNothing();
        reconCount++;
      }
    }
  }
  console.log(`  Reconciliations: ${MONTHS.length} · items: ${reconCount}`);

  // ── 2. Cash / imprest: petty cash ledger + floats + receipts ──────────────
  const cashAcct = await db
    .select({ id: cashAccounts.id })
    .from(cashAccounts)
    .where(
      and(
        eq(cashAccounts.entityId, entityId),
        eq(cashAccounts.name, "Main Office Petty Cash"),
      ),
    )
    .limit(1);
  const cashAccountId = cashAcct[0]?.id;
  let pclCount = 0;
  if (cashAccountId) {
    let running = 50000;
    for (let m = 0; m < MONTHS.length; m++) {
      const mon = MONTHS[m];
      const items = [
        {
          desc: "Petty cash top-up",
          debit: "15000",
          credit: "0",
          cat: "top_up",
        },
        {
          desc: "Office refreshments",
          debit: "0",
          credit: "3200",
          cat: "office",
        },
        {
          desc: "Local transport (courier)",
          debit: "0",
          credit: "1800",
          cat: "travel",
        },
        { desc: "Stationery", debit: "0", credit: "2400", cat: "office" },
        {
          desc: "Misc small purchases",
          debit: "0",
          credit: "1500",
          cat: "misc",
        },
      ];
      for (const it of items) {
        const debit = parseFloat(it.debit);
        const credit = parseFloat(it.credit);
        running = running + debit - credit;
        await db
          .insert(pettyCashLedger)
          .values({
            id: uuid("e3", pclCount + 1),
            entityId,
            cashAccountId,
            transactionDate: day(mon, 4 + (pclCount % 20)),
            description: it.desc,
            debit: it.debit,
            credit: it.credit,
            balance: String(running),
            category: it.cat,
            reference: `PCL-${mon.period}-${pclCount + 1}`,
          })
          .onConflictDoNothing();
        pclCount++;
      }
    }
    // Imprest floats (active + settled).
    const floats = [
      {
        assignee: "Ismaila Ceesay",
        amount: "25000",
        remaining: "8000",
        purpose: "Field operations — West Coast deliveries",
        status: "active" as const,
        issued: "2026-06-02",
        settleBy: "2026-08-30",
      },
      {
        assignee: "Fatoumata Jawara",
        amount: "15000",
        remaining: "0",
        purpose: "Client visit expenses — sales trips",
        status: "settled" as const,
        issued: "2026-03-10",
        settleBy: "2026-04-10",
      },
      {
        assignee: "Awa Bah",
        amount: "10000",
        remaining: "2500",
        purpose: "Office supplies float",
        status: "active" as const,
        issued: "2026-07-01",
        settleBy: "2026-08-31",
      },
    ];
    for (let f = 0; f < floats.length; f++) {
      const fl = floats[f];
      const floatId = uuid("e4", f + 1);
      await db
        .insert(imprestFloats)
        .values({
          id: floatId,
          entityId,
          cashAccountId,
          assigneeName: fl.assignee,
          amount: fl.amount,
          remainingBalance: fl.remaining,
          purpose: fl.purpose,
          status: fl.status,
          issuedDate: fl.issued,
          settleByDate: fl.settleBy,
          settledAt:
            fl.status === "settled" ? new Date("2026-04-10T15:00:00Z") : null,
        })
        .onConflictDoNothing();
      if (fl.status === "active") {
        await db
          .insert(imprestReceipts)
          .values({
            id: uuid("e5", f + 1),
            imprestFloatId: floatId,
            description: `Spent ${fl.amount} — ${fl.purpose}`,
            amount: String(parseFloat(fl.amount) - parseFloat(fl.remaining)),
            receiptDate: "2026-07-15",
          })
          .onConflictDoNothing();
      }
    }
  }
  console.log(`  Petty cash ledger: ${pclCount} entries · imprest floats: 3`);

  // ── 3. Notifications (12 recent, mixed types/read states) ────────────────
  const notifData = [
    {
      type: "payroll_processed",
      priority: "medium",
      title: "June payroll processed",
      body: "Payroll run for June 2026 was processed and paid to 5 employees.",
    },
    {
      type: "overdue_invoice",
      priority: "high",
      title: "2 invoices are overdue",
      body: "SI-2026-027 and SI-2026-030 are past due — follow up with customers.",
    },
    {
      type: "recon_discrepancy",
      priority: "high",
      title: "Bank reconciliation difference",
      body: "July reconciliation has a GMD 2,500 difference to review.",
    },
    {
      type: "budget_alert",
      priority: "medium",
      title: "Marketing budget at 82%",
      body: "Marketing & advertising has consumed 82% of its monthly budget.",
    },
    {
      type: "agent_flag",
      priority: "medium",
      title: "Duplicate transaction flagged",
      body: "A possible duplicate bank transaction was detected and moved to review.",
    },
    {
      type: "report_ready",
      priority: "low",
      title: "June P&L report ready",
      body: "The month-end P&L with variance analysis has been generated.",
    },
    {
      type: "closeComplete",
      priority: "medium",
      title: "May close completed",
      body: "May 2026 close checklist completed and period closed.",
    },
    {
      type: "ingestion_posted",
      priority: "low",
      title: "3 documents auto-posted",
      body: "OCR extraction posted 3 supplier bills automatically.",
    },
    {
      type: "invoice_reminder",
      priority: "low",
      title: "Reminder sent to Gambia Food Distributors",
      body: "A payment reminder was sent for invoice SI-2026-018.",
    },
    {
      type: "systemAlert",
      priority: "low",
      title: "Bank feed synced",
      body: "Trust Bank feed synced 14 new transactions.",
    },
    {
      type: "budgetExceeded",
      priority: "high",
      title: "Utilities over budget",
      body: "Utilities exceeded its monthly budget by 12% in July.",
    },
    {
      type: "agentEscalation",
      priority: "high",
      title: "Expense claim escalated",
      body: "EXP-2026-004 was flagged for policy review — receipt over per-line limit.",
    },
  ];
  for (let n = 0; n < notifData.length; n++) {
    const nd = notifData[n];
    await db
      .insert(notifications)
      .values({
        id: uuid("e6", n + 1),
        userId,
        entityId,
        type: nd.type,
        priority: nd.priority,
        title: nd.title,
        body: nd.body,
        read: n >= 6,
        status: n >= 6 ? "read" : "sent",
        sentAt: new Date(
          `2026-07-${String(20 - (n % 15)).padStart(2, "0")}T09:00:00Z`,
        ),
        createdAt: new Date(
          `2026-07-${String(20 - (n % 15)).padStart(2, "0")}T09:00:00Z`,
        ),
      })
      .onConflictDoNothing();
  }
  console.log(`  Notifications: +${notifData.length}`);

  // ── 4. Agent runs (tenant agent monitor) — 14 completed + 1 in progress ──
  const AGENTS: Array<{
    name: string;
    display: string;
    category: string;
    steps: string[];
  }> = [
    {
      name: "cfo-agent",
      display: "CFO Agent",
      category: "management",
      steps: ["Classify intent", "Route task", "Summarize outcome"],
    },
    {
      name: "ledger-agent",
      display: "Ledger Agent",
      category: "worker",
      steps: ["Validate entry", "Check double-entry", "Post to GL"],
    },
    {
      name: "ap-agent",
      display: "Accounts Payable Agent",
      category: "worker",
      steps: ["Process invoice", "Match to PO", "Schedule payment"],
    },
    {
      name: "ar-agent",
      display: "Accounts Receivable Agent",
      category: "worker",
      steps: ["Generate aging report", "Flag overdue", "Draft reminder"],
    },
    {
      name: "treasury-agent",
      display: "Treasury Agent",
      category: "management",
      steps: [
        "Get cash position",
        "Run reconciliation",
        "Generate daily report",
      ],
    },
    {
      name: "recon-agent",
      display: "Reconciliation Agent",
      category: "worker",
      steps: ["Import statement", "Match lines", "Flag exceptions"],
    },
    {
      name: "payroll-agent",
      display: "Payroll Worker",
      category: "worker",
      steps: ["Compute gross", "Apply statutory deductions", "Post net pay"],
    },
    {
      name: "compliance-agent",
      display: "Compliance Agent",
      category: "management",
      steps: ["Tax review", "Check filing status", "Certify period"],
    },
    {
      name: "reporting-agent",
      display: "Reporting Agent",
      category: "platform",
      steps: ["Generate P&L", "Generate balance sheet", "Write narrative"],
    },
    {
      name: "analytics-agent",
      display: "Analytics Agent",
      category: "platform",
      steps: ["Aggregate balances", "Detect anomalies", "Project runway"],
    },
  ];
  const runTasks = [
    "Categorize July bank transactions",
    "Reconcile July bank statement",
    "Post supplier bill from Touba Import Export",
    "Generate June P&L report",
    "Draft overdue invoice reminders",
    "Run July payroll validation",
    "Detect duplicate expenses",
    "Close May period checklist",
    "Generate Q2 cash flow forecast",
    "Review flagged journal entries",
    "Match AR payments to invoices",
    "Update vendor payment terms",
    "Prepare VAT filing summary",
    "Run depreciation for office equipment",
  ];
  let runSeq = 0;
  const now = Date.now();
  for (let r = 0; r < AGENTS.length; r++) {
    const agent = AGENTS[r];
    const runsPerAgent = r === 0 ? 2 : 1; // CFO ran twice
    for (let k = 0; k < runsPerAgent; k++) {
      runSeq++;
      const runId = `RUN-${(runSeq + 400).toString(16).toUpperCase()}${runSeq.toString().padStart(3, "0")}`;
      const taskIdx = (r + k * 3) % runTasks.length;
      const isActive = runSeq === 15;
      const durationMs = 800 + ((runSeq * 137) % 2400);
      const status = isActive
        ? ("in_progress" as const)
        : runSeq % 9 === 0
          ? ("failed" as const)
          : ("completed" as const);
      const error =
        status === "failed"
          ? "Rate limit exceeded on LLM provider — retrying"
          : null;
      const progress = isActive ? 62 : status === "completed" ? 100 : 40;
      await db
        .insert(opsLiveRuns)
        .values({
          id: uuid("e7", runSeq),
          runId,
          agentName: agent.name,
          agentDisplayName: agent.display,
          agentCategory: agent.category,
          organizationName: "Kerr Jula Trading Co.",
          organizationId: orgId,
          entityId,
          status,
          progress,
          currentStep: isActive
            ? agent.steps[1]
            : status === "completed"
              ? null
              : agent.steps[0],
          durationMs,
          startedAt: new Date(now - runSeq * 3600_000 * 7),
          completedAt:
            status === "completed"
              ? new Date(now - runSeq * 3600_000 * 7 + durationMs)
              : null,
          model:
            agent.category === "worker"
              ? "claude-haiku-4-5"
              : "claude-sonnet-4-6",
          userId,
          userName: "Demo User",
          error,
          costUsd: String(
            (durationMs / 1000) *
              (agent.category === "worker" ? 0.00001 : 0.00003),
          ),
          inputTokens: 1200 + (runSeq % 8) * 310,
          outputTokens: 240 + (runSeq % 6) * 90,
          metadata: { task: runTasks[taskIdx] },
        })
        .onConflictDoNothing();
      for (let s = 0; s < agent.steps.length; s++) {
        await db
          .insert(opsLiveRunSteps)
          .values({
            id: uuid("e8", runSeq * 10 + s + 1),
            runId,
            stepNumber: s + 1,
            name: agent.steps[s],
            status:
              isActive && s >= progress / 40
                ? ("pending" as const)
                : status === "completed"
                  ? ("completed" as const)
                  : ("in_progress" as const),
            durationMs: 180 + s * 140,
            startedAt: new Date(now - runSeq * 3600_000 * 7 + s * 200),
            completedAt:
              !isActive && status === "completed"
                ? new Date(now - runSeq * 3600_000 * 7 + s * 200 + 180)
                : null,
          })
          .onConflictDoNothing();
      }
      await db
        .insert(opsLiveRunEvents)
        .values({
          id: uuid("e9", runSeq),
          runId,
          eventType:
            status === "completed"
              ? "completed"
              : isActive
                ? "started"
                : "failed",
          message:
            status === "completed"
              ? `${agent.display} finished: ${runTasks[taskIdx]}`
              : isActive
                ? `${agent.display} started: ${runTasks[taskIdx]}`
                : error,
          metadata: { task: runTasks[taskIdx] },
          createdAt: new Date(now - runSeq * 3600_000 * 7),
        })
        .onConflictDoNothing();
    }
  }
  console.log(`  Agent runs: +${runSeq} (10 agents, 1 active)`);

  // ── 5. Audit log entries (append-only — the DB trigger chains them) ─────
  const auditEntries = [
    {
      action: "expense_claim.decide",
      entityType: "expense_claim",
      ref: "",
      actor: "agent",
      agent: "expense-agent",
      values: {
        claimNumber: "EXP-2026-001",
        decision: "approved",
        confidence: 0.91,
      },
    },
    {
      action: "journal_entry.post",
      entityType: "journal_entry",
      ref: "",
      actor: "agent",
      agent: "ledger-agent",
      values: { entryNumber: 100, confidence: 0.94 },
    },
    {
      action: "invoice.create",
      entityType: "sales_invoice",
      ref: "",
      actor: "user",
      agent: null,
      values: { customer: "Gambia Food Distributors" },
    },
    {
      action: "payment.match",
      entityType: "payment_ar",
      ref: "",
      actor: "agent",
      agent: "ar-agent",
      values: { matched: 3, confidence: 0.88 },
    },
    {
      action: "reconciliation.close",
      entityType: "reconciliation",
      ref: "",
      actor: "user",
      agent: null,
      values: { period: "2026-06" },
    },
    {
      action: "payroll.run.approve",
      entityType: "payroll_run",
      ref: "",
      actor: "user",
      agent: null,
      values: { period: "2026-06" },
    },
    {
      action: "anomaly.flag",
      entityType: "anomaly_flag",
      ref: "",
      actor: "agent",
      agent: "analytics-agent",
      values: { type: "duplicate_transaction", severity: "medium" },
    },
    {
      action: "bill.import",
      entityType: "invoice_ap",
      ref: "",
      actor: "agent",
      agent: "ap-agent",
      values: { source: "ocr", confidence: 0.87 },
    },
    {
      action: "close.period",
      entityType: "fiscal_period",
      ref: "",
      actor: "user",
      agent: null,
      values: { period: "2026-05", status: "closed" },
    },
    {
      action: "budget.alert.ack",
      entityType: "budget",
      ref: "",
      actor: "user",
      agent: null,
      values: { account: "Marketing & Advertising" },
    },
  ];
  for (let a = 0; a < auditEntries.length; a++) {
    const ae = auditEntries[a];
    await db
      .insert(auditLog)
      .values({
        id: uuid("f1", a + 1),
        entityId,
        userId,
        action: ae.action,
        entityType: ae.entityType,
        entityIdRef: ae.ref ? ae.ref : null,
        actorType: ae.actor,
        agentId: ae.agent,
        reason: "Operational history seed",
        newValues: ae.values,
        confidence:
          ae.values.confidence != null ? String(ae.values.confidence) : null,
        ipAddress: "10.0.0.1",
        userAgent: "xenboox-seed",
        createdAt: new Date(
          `2026-07-${String(18 - a).padStart(2, "0")}T10:00:00Z`,
        ),
      })
      .onConflictDoNothing();
  }
  console.log(`  Audit log entries: +${auditEntries.length}`);

  // ── 6. Analytics: snapshots, trends, anomalies, health, forecasts ────────
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    const revenue = 900000 + m * 45000;
    const expenses = 640000 + m * 20000;
    const netIncome = revenue - expenses;
    await db
      .insert(analyticsSnapshots)
      .values({
        id: uuid("f2", m + 1),
        entityId,
        period: mon.period,
        sourcePipelines: ["reporting", "reconciliation", "cash", "expense"],
        snapshotData: {
          revenue,
          expenses,
          netIncome,
          totalAssets: 4100000 + m * 80000,
          totalLiabilities: 1250000 + m * 30000,
          cashBalance: 670000 + m * 45000,
          receivables: 477000 - m * 12000,
          payables: 250000 + m * 15000,
        },
        dataFreshness: "1.0",
        generatedBy: "analytics-pipeline",
        generatedAt: new Date(`${day(mon, 28)}T20:00:00Z`),
        createdAt: new Date(`${day(mon, 28)}T20:00:00Z`),
      })
      .onConflictDoNothing();

    // Trends
    const trends = [
      {
        dimension: "revenue",
        trendType: "upward",
        magnitude: "0.12",
        confidence: "0.9",
        description: `${mon.label} revenue up 12% month-over-month`,
      },
      {
        dimension: "expense",
        trendType: "stable",
        magnitude: "0.03",
        confidence: "0.85",
        description: `${mon.label} operating expenses stable within ±3%`,
      },
      {
        dimension: "cash_flow",
        trendType: "upward",
        magnitude: "0.08",
        confidence: "0.82",
        description: `${mon.label} net cash position improving 8%`,
      },
      {
        dimension: "profit_margin",
        trendType: "upward",
        magnitude: "0.05",
        confidence: "0.78",
        description: `${mon.label} profit margin up 5 percentage points`,
      },
    ];
    for (let t = 0; t < trends.length; t++) {
      const tr = trends[t];
      await db
        .insert(detectedTrends)
        .values({
          id: uuid("f3", m * 10 + t + 1),
          entityId,
          dimension: tr.dimension,
          trendType: tr.trendType,
          magnitude: tr.magnitude,
          confidence: tr.confidence,
          period: mon.period,
          comparisonPeriod: `2026-${String(mon.month - 1).padStart(2, "0")}`,
          description: tr.description,
          detectedAt: new Date(`${day(mon, 26)}T08:00:00Z`),
        })
        .onConflictDoNothing();
    }

    // Anomaly flags (one per month, mix of severities + one unacknowledged)
    const anomaly = [
      {
        type: "duplicate_transaction",
        severity: "medium",
        desc: "Possible duplicate supplier payment of GMD 24,000",
        ack: true,
      },
      {
        type: "unusual_amount",
        severity: "high",
        desc: "Fuel expense 34% above 3-month average",
        ack: false,
      },
      {
        type: "timing_irregularity",
        severity: "low",
        desc: "Payment posted on weekend for invoice INV-2026-014",
        ack: true,
      },
      {
        type: "pattern_shift",
        severity: "medium",
        desc: "Customer payment pattern shifted from net15 to net45",
        ack: true,
      },
      {
        type: "velocity_change",
        severity: "high",
        desc: "AR collections velocity dropped 22% vs prior month",
        ack: false,
      },
      {
        type: "duplicate_transaction",
        severity: "medium",
        desc: "Two identical cash withdrawals of GMD 12,500",
        ack: true,
      },
    ][m];
    await db
      .insert(anomalyFlags)
      .values({
        id: uuid("f4", m + 1),
        entityId,
        transactionRef: `TX-${mon.period}-${m + 3}`,
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        description: anomaly.desc,
        statisticalBasis: {
          method: "zscore",
          zScore: 2.4 + m * 0.2,
          expectedValue: 18000,
          actualValue: 24000,
          stdDev: 2500,
          timeWindow: "30d",
        },
        routedTo: "cfo_agent",
        acknowledged: anomaly.ack,
        acknowledgedAt: anomaly.ack
          ? new Date(`${day(mon, 24)}T09:00:00Z`)
          : null,
        acknowledgedBy: anomaly.ack ? "demo@xenboox.com" : null,
        notes: anomaly.ack ? "Reviewed and accepted" : null,
      })
      .onConflictDoNothing();

    // Health score
    const score = 0.72 + m * 0.025;
    await db
      .insert(healthScores)
      .values({
        id: uuid("f5", m + 1),
        entityId,
        period: mon.period,
        overallScore: score.toFixed(2),
        componentBreakdown: {
          liquidity: {
            score: 0.81,
            weight: 0.25,
            explanation: "Current ratio 1.8, above 1.5 target",
          },
          solvency: {
            score: 0.74,
            weight: 0.25,
            explanation: "Debt-to-equity 0.6, within safe band",
          },
          profitability: {
            score: 0.68,
            weight: 0.2,
            explanation: "Net margin 8.2%, up 1.1pts",
          },
          efficiency: {
            score: 0.7,
            weight: 0.15,
            explanation: "Receivables days 34, near target of 30",
          },
          growth: {
            score: 0.77,
            weight: 0.15,
            explanation: "Revenue +12% MoM, above cohort",
          },
        },
        trend: m >= 3 ? ("improving" as const) : ("stable" as const),
        previousScore: m > 0 ? (0.72 + (m - 1) * 0.025).toFixed(2) : null,
        generatedAt: new Date(`${day(mon, 27)}T07:00:00Z`),
      })
      .onConflictDoNothing();
  }
  // Forecast models (3 snapshots)
  for (let f = 0; f < 3; f++) {
    const isActive = f === 2;
    await db
      .insert(forecastModels)
      .values({
        id: uuid("f6", f + 1),
        entityId,
        generatedAt: new Date(`2026-0${6 + f}-28T09:00:00Z`),
        runwayMonths: String(11.5 - f * 0.8),
        projectedRevenue: String(1150000 + f * 120000),
        projectedExpenses: String(980000 + f * 40000),
        projectedCashBalance: String(812000 + f * 96000),
        assumptions: {
          revenueGrowthRate: 0.08,
          expenseGrowthRate: 0.04,
          inflationRate: 0.05,
          projectionMonths: 6,
          seasonalityFactors: { Q1: 0.9, Q2: 1.0, Q3: 1.1, Q4: 1.0 },
          confidenceInterval: 0.9,
        },
        confidence: "0.82",
        period: `2026-0${6 + f}`,
        methodology: "linear_regression",
        isActive,
      })
      .onConflictDoNothing();
  }
  console.log(
    `  Analytics: ${MONTHS.length} snapshots · 24 trends · 6 anomalies · 6 health · 3 forecasts`,
  );

  // ── 7. Tax compliance ────────────────────────────────────────────────────
  for (let m = 0; m < MONTHS.length; m++) {
    const mon = MONTHS[m];
    const outputVat = Math.round((900000 + m * 45000) * 0.15);
    const inputVat = Math.round((520000 + m * 22000) * 0.15);
    const netPosition = outputVat - inputVat;
    await db
      .insert(vatCalculations)
      .values({
        id: uuid("f7", m + 1),
        entityId,
        period: mon.period,
        inputVat: String(inputVat),
        outputVat: String(outputVat),
        netPosition: String(netPosition),
        status:
          m < MONTHS.length - 1 ? ("filed" as const) : ("reviewed" as const),
        calculatedBy: "demo@xenboox.com",
        reviewedBy: m < MONTHS.length - 1 ? "demo@xenboox.com" : null,
        reviewedAt:
          m < MONTHS.length - 1 ? new Date(`${day(mon, 25)}T11:00:00Z`) : null,
        filedAt:
          m < MONTHS.length - 1 ? new Date(`${day(mon, 26)}T12:00:00Z`) : null,
        filingReference: m < MONTHS.length - 1 ? `GRA-VAT-${mon.period}` : null,
        notes: `${mon.label} VAT return`,
      })
      .onConflictDoNothing();

    // Withholding records (2 contractors/month)
    await db
      .insert(withholdingRecords)
      .values({
        id: uuid("f8", m * 2 + 1),
        entityId,
        period: mon.period,
        payeeId: `contractor-${(m % 3) + 1}`,
        payeeName: [
          "Banjul IT Services",
          "Coastal Marketing",
          "Kairaba Consulting",
        ][m % 3],
        payeeType: "contractor",
        amount: String(42000 + m * 3000),
        rate: "0.05",
        taxWithheld: String(Math.round((42000 + m * 3000) * 0.05)),
        jurisdiction: "GM",
        filed: m < MONTHS.length - 1,
        filingReference: m < MONTHS.length - 1 ? `WHT-${mon.period}-A` : null,
      })
      .onConflictDoNothing();
  }
  // Filing deadlines (current + upcoming)
  const deadlines = [
    {
      jurisdiction: "GM",
      filingType: "vat",
      name: "July VAT return",
      due: "2026-08-15",
      period: "2026-07",
      status: "pending" as const,
      estimated: "48250",
    },
    {
      jurisdiction: "GM",
      filingType: "paye",
      name: "August PAYE remittance",
      due: "2026-08-21",
      period: "2026-08",
      status: "pending" as const,
      estimated: "26000",
    },
    {
      jurisdiction: "GM",
      filingType: "withholding",
      name: "Q3 withholding tax",
      due: "2026-09-30",
      period: "2026-Q3",
      status: "pending" as const,
      estimated: "18400",
    },
    {
      jurisdiction: "GM",
      filingType: "corporate_tax",
      name: "FY2026 corporate tax estimate",
      due: "2026-10-31",
      period: "2026",
      status: "pending" as const,
      estimated: "960000",
    },
    {
      jurisdiction: "GM",
      filingType: "social_security",
      name: "SSNIT August contribution",
      due: "2026-08-28",
      period: "2026-08",
      status: "pending" as const,
      estimated: "17200",
    },
  ];
  for (let d = 0; d < deadlines.length; d++) {
    const dl = deadlines[d];
    await db
      .insert(filingDeadlines)
      .values({
        id: uuid("f9", d + 1),
        entityId,
        jurisdiction: dl.jurisdiction,
        filingType: dl.filingType,
        name: dl.name,
        dueDate: dl.due,
        period: dl.period,
        estimatedAmount: dl.estimated,
        status: dl.status,
      })
      .onConflictDoNothing();
    await db
      .insert(complianceDeadlines)
      .values({
        id: uuid("f10", d + 1),
        entityId,
        jurisdiction: dl.jurisdiction,
        filingType: dl.filingType,
        name: dl.name,
        dueDate: new Date(`${dl.due}T23:59:00Z`),
        period: dl.period,
        estimatedAmount: dl.estimated,
        status: dl.status,
        urgencyLevel:
          d < 2
            ? ("critical" as const)
            : d === 4
              ? ("approaching" as const)
              : ("normal" as const),
        lastCheckedAt: new Date("2026-08-01T06:00:00Z"),
        regulatoryStatus: "clean",
      })
      .onConflictDoNothing();
  }
  // Tax packages
  const packages = [
    {
      packageType: "vat" as const,
      period: "2026-06",
      status: "submitted" as const,
      complianceChecked: true,
    },
    {
      packageType: "paye" as const,
      period: "2026-06",
      status: "acknowledged" as const,
      complianceChecked: true,
    },
    {
      packageType: "corporate" as const,
      period: "2026",
      status: "assembling" as const,
      complianceChecked: false,
    },
  ];
  for (let p = 0; p < packages.length; p++) {
    const pk = packages[p];
    await db
      .insert(taxPackages)
      .values({
        id: uuid("f11", p + 1),
        entityId,
        packageType: pk.packageType,
        period: pk.period,
        status: pk.status,
        complianceChecked: pk.complianceChecked,
        complianceNotes: pk.complianceChecked
          ? "All checks passed"
          : "Awaiting payroll reconciliation",
        reviewedBy: pk.complianceChecked ? "demo@xenboox.com" : null,
        reviewedAt: pk.complianceChecked
          ? new Date("2026-07-05T10:00:00Z")
          : null,
        submitted: pk.status === "submitted",
        submittedAt:
          pk.status === "submitted" ? new Date("2026-07-06T09:00:00Z") : null,
        submissionReference:
          pk.status === "submitted" ? "GRA-ACK-2026-06" : null,
      })
      .onConflictDoNothing();
  }
  console.log(
    `  Tax compliance: ${MONTHS.length} VAT calcs · ${MONTHS.length * 2} WHT · 5 deadlines · 3 packages`,
  );

  // ── 8. FX rates (GMD pairs, monthly) ─────────────────────────────────────
  const fxPairs = [
    { from: "GMD", to: "USD", rate: "0.01481", label: "GMD/USD" },
    { from: "GMD", to: "EUR", rate: "0.01366", label: "GMD/EUR" },
    { from: "GMD", to: "GBP", rate: "0.0117", label: "GMD/GBP" },
    { from: "USD", to: "GMD", rate: "67.5", label: "USD/GMD" },
    { from: "EUR", to: "GMD", rate: "73.2", label: "EUR/GMD" },
    { from: "GMD", to: "NGN", rate: "21.8", label: "GMD/NGN" },
  ];
  for (let f = 0; f < fxPairs.length; f++) {
    const pair = fxPairs[f];
    for (let m = 0; m < MONTHS.length; m++) {
      const mon = MONTHS[m];
      const drift = 1 - m * 0.004;
      await db
        .insert(fxRates)
        .values({
          id: uuid("f12", f * MONTHS.length + m + 1),
          entityId,
          fromCurrency: pair.from,
          toCurrency: pair.to,
          rate: (parseFloat(pair.rate) * drift).toFixed(6),
          asOf: day(mon, 1),
          source: "sync",
          createdBy: userId,
        })
        .onConflictDoNothing();
    }
  }
  console.log(`  FX rates: ${fxPairs.length * MONTHS.length} rows`);

  // ── 9. Close checklists for every month in the window ────────────────────
  let closeTotal = 0;
  for (const mon of MONTHS) {
    const res = await seedCloseTasks(entityId, mon.period);
    closeTotal += res.inserted;
  }
  console.log(
    `  Close tasks: ${closeTotal} created across ${MONTHS.length} periods`,
  );

  // ── 10. Review queue items (platform, org-scoped) ────────────────────────
  const reviewItemsData = [
    {
      title: "Duplicate supplier detected — Global Supplies",
      description:
        "Two supplier records share the same tax ID and phone. AI suggests merging.",
      type: "duplicate_detection" as const,
      priority: "high" as const,
      status: "pending" as const,
      agentId: "ap-agent",
      aiRec: "Merge records, keep Global Supplies Ltd. as primary",
    },
    {
      title: "Invoice amount mismatch — INV-2026-014",
      description:
        "Bill total (GMD 128,400) differs from PO total (GMD 121,800) by 5.4%.",
      type: "data_validation" as const,
      priority: "high" as const,
      status: "pending" as const,
      agentId: "ap-agent",
      aiRec: "Request vendor credit note for the GMD 6,600 difference",
    },
    {
      title: "Uncategorized transactions — 4 items",
      description: "Four bank transactions lack a category and GL account.",
      type: "missing_data" as const,
      priority: "medium" as const,
      status: "pending" as const,
      agentId: "cfo-agent",
      aiRec: "Auto-categorize with 87% confidence",
    },
    {
      title: "Potential round-trip payment",
      description:
        "Payment to supplier followed by refund to same account within 3 days.",
      type: "anomaly" as const,
      priority: "medium" as const,
      status: "escalated" as const,
      agentId: "compliance-agent",
      aiRec: "Review with compliance agent",
    },
    {
      title: "New vendor onboarding — Atlantic Fuels",
      description:
        "New supplier pending KYC documentation before first purchase order.",
      type: "configuration" as const,
      priority: "low" as const,
      status: "pending" as const,
      agentId: "ap-agent",
      aiRec: "Request business license and bank letter",
    },
  ];
  for (let ri = 0; ri < reviewItemsData.length; ri++) {
    const item = reviewItemsData[ri];
    await db
      .insert(reviewItems)
      .values({
        id: uuid("f13", ri + 1),
        title: item.title,
        description: item.description,
        type: item.type,
        priority: item.priority,
        status: item.status,
        organizationId: orgId,
        agentId: item.agentId,
        assignedTo: "Demo User",
        slaDeadline: new Date("2026-08-25T00:00:00Z"),
        slaBreached: false,
        aiRecommendation: item.aiRec,
        contextData: JSON.stringify({ entityId, source: "seed" }),
        createdAt: new Date(`2026-08-0${ri + 1}T08:00:00Z`),
        updatedAt: new Date(`2026-08-0${ri + 1}T08:00:00Z`),
      })
      .onConflictDoNothing();
  }
  console.log(`  Review queue items: +${reviewItemsData.length}`);

  console.log("  Launch completeness seed complete.");
  return {
    reconCount,
    pclCount,
    runSeq: 15,
    closeTotal,
    reviewItems: reviewItemsData.length,
  };
}

if (shouldRunDirect()) {
  seedLaunchData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-launch-data failed:", err);
      process.exit(1);
    });
}
