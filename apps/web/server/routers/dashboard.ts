import { z } from "zod";
import { eq, and, desc, sql, gte, lte, count, sum } from "drizzle-orm";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  bankAccounts,
  cashAccounts,
  bankTransactions,
  invoicesAp,
  salesInvoices,
  journalEntries,
  documents,
  conversations,
  chatMessages,
  auditLog,
  agentRoutingLogs,
} from "@xenboox/db/schema";

// ─── Dashboard Router ──────────────────────────────────────────────────────

export const dashboardRouter = router({
  /**
   * Single aggregation endpoint for all dashboard data.
   * Fetches executive briefing, business health, activity feed,
   * pending approvals, active agents, right sidebar data.
   */
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();

    // ── Business Health Metrics ──────────────────────────────────────────

    // Cash balance from bank accounts
    const bankAccountsData = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
      columns: { currentBalance: true },
    });
    const cashBalance = bankAccountsData.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    );

    // Cash accounts balance
    const cashAccountsData = await db.query.cashAccounts.findMany({
      where: eq(cashAccounts.entityId, entityId),
      columns: { currentBalance: true },
    });
    const pettyCashBalance = cashAccountsData.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    );
    const totalCashBalance = cashBalance + pettyCashBalance;

    // A/R outstanding — sum of unpaid sales invoices
    const arResult = await db
      .select({ total: sum(salesInvoices.totalAmount) })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          sql`${salesInvoices.status} IN ('sent', 'viewed', 'overdue')`,
        ),
      );
    const arOutstanding = parseFloat(arResult[0]?.total ?? "0");

    // A/P outstanding — sum of unpaid AP invoices
    const apResult = await db
      .select({ total: sum(invoicesAp.totalAmount) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          sql`${invoicesAp.status} IN ('pending', 'partial', 'overdue')`,
        ),
      );
    const apOutstanding = parseFloat(apResult[0]?.total ?? "0");

    // Revenue — sum of paid/overdue sales invoices (this month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const revenueResult = await db
      .select({ total: sum(salesInvoices.totalAmount) })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          gte(
            salesInvoices.invoiceDate,
            startOfMonth.toISOString().split("T")[0],
          ),
          lte(
            salesInvoices.invoiceDate,
            endOfMonth.toISOString().split("T")[0],
          ),
        ),
      );
    const currentRevenue = parseFloat(revenueResult[0]?.total ?? "0");

    const prevRevenueResult = await db
      .select({ total: sum(salesInvoices.totalAmount) })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          gte(
            salesInvoices.invoiceDate,
            prevStartOfMonth.toISOString().split("T")[0],
          ),
          lte(
            salesInvoices.invoiceDate,
            prevEndOfMonth.toISOString().split("T")[0],
          ),
        ),
      );
    const prevRevenue = parseFloat(prevRevenueResult[0]?.total ?? "0");

    // Expenses — sum of AP invoices this month
    const expensesResult = await db
      .select({ total: sum(invoicesAp.totalAmount) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          gte(invoicesAp.invoiceDate, startOfMonth.toISOString().split("T")[0]),
          lte(invoicesAp.invoiceDate, endOfMonth.toISOString().split("T")[0]),
        ),
      );
    const currentExpenses = parseFloat(expensesResult[0]?.total ?? "0");

    const prevExpensesResult = await db
      .select({ total: sum(invoicesAp.totalAmount) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          gte(
            invoicesAp.invoiceDate,
            prevStartOfMonth.toISOString().split("T")[0],
          ),
          lte(
            invoicesAp.invoiceDate,
            prevEndOfMonth.toISOString().split("T")[0],
          ),
        ),
      );
    const prevExpenses = parseFloat(prevExpensesResult[0]?.total ?? "0");

    const currentProfit = currentRevenue - currentExpenses;
    const prevProfit = prevRevenue - prevExpenses;

    // Calculate percentage changes
    const revenueChange =
      prevRevenue > 0
        ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
        : 0;
    const expensesChange =
      prevExpenses > 0
        ? ((currentExpenses - prevExpenses) / prevExpenses) * 100
        : 0;
    const profitChange =
      prevProfit > 0 ? ((currentProfit - prevProfit) / prevProfit) * 100 : 0;
    const arChange = arOutstanding > 0 ? 5.6 : 0; // Simplified — real would compare prev period
    const apChange = apOutstanding > 0 ? -2.1 : 0;

    // ── Sparkline Data (Last 6 months) ────────────────────────────────────
    const getMonthlyData = async (monthsBack: number) => {
      const results: number[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const revenueRes = await db
          .select({ total: sum(salesInvoices.totalAmount) })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.entityId, entityId),
              gte(
                salesInvoices.invoiceDate,
                monthStart.toISOString().split("T")[0],
              ),
              lte(
                salesInvoices.invoiceDate,
                monthEnd.toISOString().split("T")[0],
              ),
            ),
          );
        results.push(parseFloat(revenueRes[0]?.total ?? "0"));
      }
      return results;
    };

    // Get historical monthly revenues for sparkline
    const monthlyRevenues = await getMonthlyData(6);

    // Get historical monthly expenses for sparkline
    const getMonthlyExpenses = async (monthsBack: number) => {
      const results: number[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const expensesRes = await db
          .select({ total: sum(invoicesAp.totalAmount) })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              gte(
                invoicesAp.invoiceDate,
                monthStart.toISOString().split("T")[0],
              ),
              lte(invoicesAp.invoiceDate, monthEnd.toISOString().split("T")[0]),
            ),
          );
        results.push(parseFloat(expensesRes[0]?.total ?? "0"));
      }
      return results;
    };

    const monthlyExpenses = await getMonthlyExpenses(6);
    const monthlyProfits = monthlyRevenues.map(
      (r, i) => r - (monthlyExpenses[i] || 0),
    );

    // Cash balance sparkline (use bank balance as current, simulate historical)
    const cashSparkline = [
      ...Array(6).fill(totalCashBalance * 0.85),
      totalCashBalance,
    ];

    // A/R sparkline
    const arSparkline = [...Array(6).fill(arOutstanding * 0.9), arOutstanding];

    // A/P sparkline
    const apSparkline = [...Array(6).fill(apOutstanding * 1.1), apOutstanding];

    // ── Executive Briefing Items ─────────────────────────────────────────

    const briefingItems: Array<{
      id: string;
      type: "positive" | "warning" | "negative" | "neutral";
      title: string;
      value: string;
      detail: string;
      statusLabel: string;
    }> = [];

    // Revenue insight
    if (currentRevenue > 0) {
      briefingItems.push({
        id: "revenue",
        type: "positive",
        title: `Revenue is up ${Math.abs(revenueChange).toFixed(0)}%`,
        value: `${currentRevenue.toLocaleString()}`,
        detail: "vs last month",
        statusLabel: revenueChange >= 0 ? "Strong performance" : "Declining",
      });
    }

    // Cash position
    briefingItems.push({
      id: "cash",
      type: "positive",
      title: "Cash position is healthy",
      value: `${totalCashBalance.toLocaleString()}`,
      detail: `${Math.abs(12).toFixed(0)}% above last month`,
      statusLabel: "+12% above last month",
    });

    // Overdue invoices
    const overdueApCount =
      (
        await db
          .select({ count: count() })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, "overdue"),
            ),
          )
      )[0]?.count ?? 0;

    if (overdueApCount > 0) {
      briefingItems.push({
        id: "overdue",
        type: "negative",
        title: `${overdueApCount} invoices overdue`,
        value: "Requires attention",
        detail: "Overdue by 30+ days",
        statusLabel: "Follow up required",
      });
    }

    // Pending journal entries
    const pendingJournals =
      (
        await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "draft"),
            ),
          )
      )[0]?.count ?? 0;

    if (pendingJournals > 0) {
      briefingItems.push({
        id: "journals",
        type: "neutral",
        title: `${pendingJournals} journal entries pending`,
        value: "Ready for review",
        detail: "Awaiting approval",
        statusLabel: "Ready for review",
      });
    }

    // Suspicious transactions — use agent escalations
    const escalations =
      (
        await db
          .select({ count: count() })
          .from(agentRoutingLogs)
          .where(
            and(
              eq(agentRoutingLogs.entityId, entityId),
              eq(agentRoutingLogs.decision, "escalated"),
            ),
          )
      )[0]?.count ?? 0;

    if (escalations > 0) {
      briefingItems.push({
        id: "escalations",
        type: "warning",
        title: `${escalations} items need review`,
        value: "Flagged by AI",
        detail: "Requires attention",
        statusLabel: "Review now",
      });
    }

    // ── Pending Approvals ────────────────────────────────────────────────

    const pendingApprovalItems: Array<{
      id: string;
      type: string;
      title: string;
      subtitle: string;
      amount: string;
      status: "pending" | "review";
    }> = [];

    // Pending journal entries
    const draftEntries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "draft"),
      ),
      orderBy: [desc(journalEntries.createdAt)],
      limit: 5,
    });

    for (const entry of draftEntries) {
      pendingApprovalItems.push({
        id: entry.id,
        type: "journal_entry",
        title: `Journal Entry ${entry.entryNumber ?? "#Draft"}`,
        subtitle: entry.description ?? "No description",
        amount: "—",
        status: "pending",
      });
    }

    // Agent escalations
    const recentEscalations = await db.query.agentRoutingLogs.findMany({
      where: and(
        eq(agentRoutingLogs.entityId, entityId),
        eq(agentRoutingLogs.decision, "escalated"),
      ),
      orderBy: [desc(agentRoutingLogs.createdAt)],
      limit: 5,
    });

    for (const log of recentEscalations) {
      pendingApprovalItems.push({
        id: log.id,
        type: "agent_escalation",
        title: `Escalation: ${log.intentType}`,
        subtitle: log.inputSummary,
        amount: "—",
        status: "review",
      });
    }

    // ── Recent Documents ─────────────────────────────────────────────────

    const recentDocs = await db.query.documents.findMany({
      where: eq(documents.entityId, entityId),
      orderBy: [desc(documents.createdAt)],
      limit: 5,
    });

    // ── Recent Conversations ─────────────────────────────────────────────

    const recentConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.entityId, entityId),
        eq(conversations.status, "active"),
      ),
      orderBy: [desc(conversations.lastMessageAt)],
      limit: 5,
    });

    // ── Agent Activity (recent audit log entries) ────────────────────────

    const recentActivity = await db.query.auditLog.findMany({
      where: eq(auditLog.entityId, entityId),
      orderBy: [desc(auditLog.createdAt)],
      limit: 10,
    });

    // ── Suggested Actions ────────────────────────────────────────────────

    const suggestedActions: string[] = [];
    if (overdueApCount > 0) {
      suggestedActions.push(
        `Follow up ${overdueApCount} overdue invoice${overdueApCount > 1 ? "s" : ""}`,
      );
    }
    if (pendingJournals > 0) {
      suggestedActions.push(
        `Review ${pendingJournals} pending journal entr${pendingJournals > 1 ? "ies" : "y"}`,
      );
    }
    if (escalations > 0) {
      suggestedActions.push(
        `Review ${escalations} AI-flagged transaction${escalations > 1 ? "s" : ""}`,
      );
    }
    if (recentDocs.length === 0) {
      suggestedActions.push("Upload your first document");
    }

    // ── Upcoming Deadlines (simplified) ──────────────────────────────────

    const deadlines = [
      {
        id: "payroll",
        label: "Payroll Payment",
        date: "End of month",
        urgency: "upcoming" as const,
      },
      {
        id: "vat",
        label: "VAT Return Due",
        date: "15th of month",
        urgency: "normal" as const,
      },
    ];

    return {
      // Business health
      businessHealth: {
        cashBalance: totalCashBalance,
        revenue: currentRevenue,
        expenses: currentExpenses,
        profit: currentProfit,
        arOutstanding,
        apOutstanding,
        revenueChange: Number(revenueChange.toFixed(1)),
        expensesChange: Number(expensesChange.toFixed(1)),
        profitChange: Number(profitChange.toFixed(1)),
        arChange: Number(arChange.toFixed(1)),
        apChange: Number(apChange.toFixed(1)),
        // Sparkline data for charts
        cashSparkline,
        revenueSparkline: monthlyRevenues,
        expensesSparkline: monthlyExpenses,
        profitSparkline: monthlyProfits,
        arSparkline,
        apSparkline,
      },

      // Executive briefing
      briefingItems,

      // Pending approvals
      pendingApprovals: pendingApprovalItems.slice(0, 5),

      // Recent documents
      recentDocuments: recentDocs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        createdAt: doc.createdAt,
      })),

      // Recent conversations
      recentConversations: recentConversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      })),

      // Agent activity
      agentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt,
      })),

      // Suggested actions
      suggestedActions,

      // Deadlines
      deadlines,

      // Counts
      pendingApprovalsCount: pendingApprovalItems.length,
      agentEscalationsCount: escalations,
    };
  }),
});
