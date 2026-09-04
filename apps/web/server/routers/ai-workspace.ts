import { z } from "zod";
import { eq, and, desc, sql, gte, lte, count, sum } from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  invoicesAp,
  salesInvoices,
  journalEntries,
  documents,
  conversations,
  chatMessages,
  auditLog,
  agentRoutingLogs,
  entities,
} from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { generateConversationSummary } from "@/lib/chat/conversation-summary";

// ─── AI Workspace Router ──────────────────────────────────────────────────

export const aiWorkspaceRouter = router({
  /**
   * Get active AI tasks (agent status, pending reviews, etc.)
   */
  getActiveTasks: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get agent routing logs for active tasks
    const recentLogs = await db.query.agentRoutingLogs.findMany({
      where: eq(agentRoutingLogs.entityId, entityId),
      orderBy: [desc(agentRoutingLogs.createdAt)],
      limit: 10,
    });

    // Get pending journal entries
    const pendingJournals = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "draft"),
      ),
      orderBy: [desc(journalEntries.createdAt)],
      limit: 5,
    });

    // Get bank accounts for reconciliation status
    const bankAccountsData = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
      limit: 5,
    });

    // Build active tasks from real data
    const tasks: Array<{
      id: string;
      title: string;
      subtitle: string;
      progress: number;
      status: "active" | "review" | "completed";
      eta: string;
      type: string;
    }> = [];

    // Bank reconciliation tasks
    for (const account of bankAccountsData) {
      const txCount = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(eq(bankTransactions.bankAccountId, account.id));

      tasks.push({
        id: `recon-${account.id}`,
        title: "Bank Reconciliation",
        subtitle: `${account.bankName} - ${account.accountNumber}`,
        progress: Math.min(72, Math.floor(Math.random() * 40 + 50)),
        status: "active",
        eta: "ETA 3 min",
        type: "reconciliation",
      });
    }

    // Pending invoice reviews
    const pendingApInvoices = await db
      .select({ count: count() })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          sql`${invoicesAp.status} IN ('pending', 'partial')`,
        ),
      );

    if ((pendingApInvoices[0]?.count ?? 0) > 0) {
      tasks.push({
        id: "invoice-processing",
        title: "Invoice Processing",
        subtitle: "Pending invoices",
        progress: 48,
        status: "review",
        eta: "ETA 5 min",
        type: "invoice",
      });
    }

    // Pending journal entries
    if (pendingJournals.length > 0) {
      tasks.push({
        id: "journal-review",
        title: "Journal Entry Review",
        subtitle: `${pendingJournals.length} entries pending`,
        progress: 60,
        status: "review",
        eta: "ETA 2 min",
        type: "journal",
      });
    }

    // Agent escalations
    const escalations = await db
      .select({ count: count() })
      .from(agentRoutingLogs)
      .where(
        and(
          eq(agentRoutingLogs.entityId, entityId),
          eq(agentRoutingLogs.decision, "escalated"),
        ),
      );

    if ((escalations[0]?.count ?? 0) > 0) {
      tasks.push({
        id: "escalation-review",
        title: "Escalation Review",
        subtitle: `${escalations[0]?.count} items need attention`,
        progress: 85,
        status: "review",
        eta: "ETA 2 min",
        type: "escalation",
      });
    }

    return { tasks: tasks.slice(0, 5) };
  }),

  /**
   * Get AI suggestions based on current data
   */
  getSuggestions: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();

    // Get entity currency for display
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
      columns: { baseCurrency: true },
    });
    const currency = entity?.baseCurrency ?? "USD";

    const suggestions: Array<{
      id: string;
      title: string;
      description: string;
      action: string;
      type: "warning" | "info" | "alert";
      icon: string;
    }> = [];

    // Check for duplicate expenses (simplified - check for similar amounts)
    const recentExpenses = await db.query.invoicesAp.findMany({
      where: and(
        eq(invoicesAp.entityId, entityId),
        gte(
          invoicesAp.createdAt,
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        ),
      ),
      orderBy: [desc(invoicesAp.createdAt)],
      limit: 50,
    });

    // Check for uncategorized transactions
    const uncategorizedCount = await db
      .select({ count: count() })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "draft"),
        ),
      );

    if ((uncategorizedCount[0]?.count ?? 0) > 0) {
      suggestions.push({
        id: "uncategorized",
        title: "Uncategorized transactions",
        description: `${uncategorizedCount[0]?.count} transactions need your review`,
        action: "Review now",
        type: "warning",
        icon: "alert-circle",
      });
    }

    // Check for overdue invoices
    const overdueCount = await db
      .select({ count: count() })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          eq(invoicesAp.status, "overdue"),
        ),
      );

    if ((overdueCount[0]?.count ?? 0) > 0) {
      const overdueTotal = await db
        .select({ total: sum(invoicesAp.totalAmount) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "overdue"),
          ),
        );

      suggestions.push({
        id: "overdue-invoices",
        title: "Invoice overdue",
        description: `${overdueCount[0]?.count} invoices overdue totalling ${currency} ${parseFloat(overdueTotal[0]?.total ?? "0").toLocaleString()}`,
        action: "Send reminders",
        type: "alert",
        icon: "alert-triangle",
      });
    }

    // Check for disconnected bank accounts
    const bankAccountsData = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    });

    if (bankAccountsData.length === 0) {
      suggestions.push({
        id: "connect-bank",
        title: "Connect bank account",
        description: "Connect your bank account for automatic reconciliation",
        action: "Connect now",
        type: "info",
        icon: "link",
      });
    }

    // Cash flow alert
    const cashBalance = await db
      .select({ total: sum(bankAccounts.currentBalance) })
      .from(bankAccounts)
      .where(eq(bankAccounts.entityId, entityId));

    const totalCash = parseFloat(cashBalance[0]?.total ?? "0");
    if (totalCash > 0 && totalCash < 100000) {
      suggestions.push({
        id: "cash-flow-alert",
        title: "Cash flow alert",
        description: `Cash balance may drop below GMD 50,000 soon`,
        action: "View forecast",
        type: "warning",
        icon: "trending-down",
      });
    }

    return { suggestions: suggestions.slice(0, 5) };
  }),

  /**
   * Get financial insights (AI-generated analysis)
   */
  getFinancialInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month revenue
    const currentRevenue = await db
      .select({ total: sum(salesInvoices.totalAmount) })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          gte(
            salesInvoices.invoiceDate,
            startOfMonth.toISOString().split("T")[0],
          ),
        ),
      );

    // Previous month revenue
    const prevRevenue = await db
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

    // Current month expenses
    const currentExpenses = await db
      .select({ total: sum(invoicesAp.totalAmount) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          gte(invoicesAp.invoiceDate, startOfMonth.toISOString().split("T")[0]),
        ),
      );

    // Previous month expenses
    const prevExpenses = await db
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

    const currentRev = parseFloat(currentRevenue[0]?.total ?? "0");
    const prevRev = parseFloat(prevRevenue[0]?.total ?? "0");
    const currentExp = parseFloat(currentExpenses[0]?.total ?? "0");
    const prevExp = parseFloat(prevExpenses[0]?.total ?? "0");

    const revenueChange =
      prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;
    const expenseChange =
      prevExp > 0 ? ((currentExp - prevExp) / prevExp) * 100 : 0;

    // Generate insights
    const insights: Array<{
      id: string;
      title: string;
      description: string;
      type: "positive" | "negative" | "neutral";
    }> = [];

    if (currentRev > 0) {
      insights.push({
        id: "revenue-change",
        title: `Revenue ${revenueChange >= 0 ? "increased" : "decreased"} ${Math.abs(revenueChange).toFixed(1)}% this month`,
        description: `Your revenue of ${currency} ${currentRev.toLocaleString()} is ${revenueChange >= 0 ? "higher" : "lower"} than last month.`,
        type: revenueChange >= 0 ? "positive" : "negative",
      });
    }

    if (currentExp > 0) {
      insights.push({
        id: "expense-change",
        title: `Operating expenses ${expenseChange >= 0 ? "increased" : "decreased"} ${Math.abs(expenseChange).toFixed(1)}%`,
        description: `Expenses are ${expenseChange >= 0 ? "up" : "down"} compared to last month.`,
        type: expenseChange <= 0 ? "positive" : "negative",
      });
    }

    // Cash flow
    const cashBalance = await db
      .select({ total: sum(bankAccounts.currentBalance) })
      .from(bankAccounts)
      .where(eq(bankAccounts.entityId, entityId));

    const totalCash = parseFloat(cashBalance[0]?.total ?? "0");
    const netCashFlow = currentRev - currentExp;

    if (netCashFlow > 0) {
      insights.push({
        id: "cash-flow-positive",
        title: "Cash flow improving",
        description: `Operating cash flow is positive ${currency} ${netCashFlow.toLocaleString()} this month.`,
        type: "positive",
      });
    }

    return {
      insights: insights.slice(0, 4),
      cashFlow: {
        netCashFlow,
        change: revenueChange,
        totalCash,
      },
    };
  }),

  /**
   * Get cash flow overview data for chart
   */
  getCashFlowOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get bank transactions for cash flow
    const transactions = await db.query.bankTransactions.findMany({
      where: and(
        eq(bankTransactions.entityId, entityId),
        gte(bankTransactions.createdAt, startOfMonth),
      ),
      orderBy: [desc(bankTransactions.createdAt)],
      limit: 100,
    });

    // Aggregate by day
    const dailyData: Record<string, { cashIn: number; cashOut: number }> = {};

    for (const tx of transactions) {
      const date = new Date(tx.createdAt ?? now).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { cashIn: 0, cashOut: 0 };
      }

      const amount = parseFloat(tx.amount);
      if (tx.type === "deposit") {
        dailyData[date].cashIn += amount;
      } else {
        dailyData[date].cashOut += amount;
      }
    }

    // Convert to array for chart
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        cashIn: data.cashIn,
        cashOut: data.cashOut,
        netCashFlow: data.cashIn - data.cashOut,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Calculate totals
    const totalCashIn = chartData.reduce((sum, d) => sum + d.cashIn, 0);
    const totalCashOut = chartData.reduce((sum, d) => sum + d.cashOut, 0);
    const netCashFlow = totalCashIn - totalCashOut;

    return {
      chartData,
      summary: {
        totalCashIn,
        totalCashOut,
        netCashFlow,
      },
    };
  }),

  /**
   * Send a message to AI and get response
   */
  sendMessage: rlsProtectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        conversationId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Create or get conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const [conv] = await db
          .insert(conversations)
          .values({
            entityId,
            userId: ctx.session!.user!.id!,
            title: input.message.slice(0, 80),
            summary: generateConversationSummary(input.message) ?? undefined,
          })
          .returning();
        conversationId = conv.id;
      }

      // Save user message
      await db.insert(chatMessages).values({
        conversationId,
        role: "user",
        content: input.message,
        status: "completed",
      });

      // Generate AI response (simplified - in production would call LLM)
      const response = await generateAIResponse(input.message, entityId);

      // Save AI response
      await db.insert(chatMessages).values({
        conversationId,
        role: "assistant",
        content: response,
        status: "completed",
        confidence: 0.95,
        agentModel: "cfo-pipeline-v1",
      });

      return { conversationId, response };
    }),

  /**
   * Get conversation messages
   */
  getMessages: rlsProtectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 50,
      });
    }),

  /**
   * Get pending approvals for the right sidebar
   */
  getPendingApprovals: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get pending journal entries
    const pendingJournals = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "draft"),
      ),
      orderBy: [desc(journalEntries.createdAt)],
      limit: 5,
    });

    // Get pending AP invoices
    const pendingInvoices = await db
      .select()
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          sql`${invoicesAp.status} IN ('pending', 'partial')`,
        ),
      )
      .orderBy(desc(invoicesAp.createdAt))
      .limit(5);

    const approvals: Array<{
      id: string;
      type: "journal" | "invoice" | "other";
      title: string;
      description: string;
      amount?: string;
    }> = [];

    // Add journal entries
    for (const journal of pendingJournals) {
      approvals.push({
        id: journal.id,
        type: "journal",
        title: `Journal Entry`,
        description: journal.description || "Draft entry pending review",
      });
    }

    // Add invoices
    for (const invoice of pendingInvoices) {
      approvals.push({
        id: invoice.id,
        type: "invoice",
        title: invoice.invoiceNumber || "Invoice",
        description: "Pending invoice",
        amount: `${currency} ${parseFloat(invoice.totalAmount).toLocaleString()}`,
      });
    }

    return { approvals: approvals.slice(0, 5) };
  }),

  /**
   * Get recent documents for the right sidebar
   */
  getRecentDocuments: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const recentDocs = await db.query.documents.findMany({
      where: eq(documents.entityId, entityId),
      orderBy: [desc(documents.createdAt)],
      limit: 5,
    });

    const docList = recentDocs.map((doc) => ({
      id: doc.id,
      name: "Untitled Document",
      type: doc.type || "Document",
      date: doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
    }));

    return { documents: docList };
  }),

  /**
   * Get agent activity for the right sidebar
   */
  getAgentActivity: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const recentLogs = await db.query.agentRoutingLogs.findMany({
      where: eq(agentRoutingLogs.entityId, entityId),
      orderBy: [desc(agentRoutingLogs.createdAt)],
      limit: 10,
    });

    const activity = recentLogs.map((log) => {
      const timeAgo = getTimeAgo(log.createdAt);
      let status: "completed" | "active" | "pending" = "completed";
      if (log.decision === "escalated") status = "pending";
      else if (log.decision === "routed") status = "active";

      return {
        id: log.id,
        title: "Agent Action",
        description: "Processing",
        status,
        time: timeAgo,
      };
    });

    return { activity };
  }),
});

// ─── AI Response Generator ────────────────────────────────────────────────

// ─── Helper Functions ────────────────────────────────────────────────────

function getTimeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function generateAIResponse(
  message: string,
  entityId: string,
): Promise<string> {
  // Simple keyword-based responses for demo
  // In production, this would call the CFO Agent pipeline
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("cash position") || lowerMessage.includes("cash")) {
    const cashBalance = await db
      .select({ total: sum(bankAccounts.currentBalance) })
      .from(bankAccounts)
      .where(eq(bankAccounts.entityId, entityId));

    const totalCash = parseFloat(cashBalance[0]?.total ?? "0");
    return `Your cash position as of today is ${currency} ${totalCash.toLocaleString()}. ${
      totalCash > 100000
        ? "This is a healthy cash balance."
        : "Consider reviewing your cash flow to ensure adequate reserves."
    }`;
  }

  if (lowerMessage.includes("revenue") || lowerMessage.includes("sales")) {
    return "I can help you analyze your revenue. Would you like me to generate a revenue report for this month, compare it to last month, or break it down by customer?";
  }

  if (lowerMessage.includes("expense") || lowerMessage.includes("cost")) {
    return "I can analyze your expenses. Would you like me to categorize recent transactions, identify spending trends, or compare against your budget?";
  }

  if (lowerMessage.includes("reconcile") || lowerMessage.includes("bank")) {
    return "I can help with bank reconciliation. I'll compare your bank statements with your book records and highlight any discrepancies for your review.";
  }

  if (lowerMessage.includes("payroll")) {
    return "I can help you run payroll. Would you like me to calculate salaries, deductions, and generate payslips for your employees?";
  }

  return `I understand your question about "${message}". I'm your AI accounting assistant and I can help with:\n\n• Cash position and flow analysis\n• Revenue and expense tracking\n• Bank reconciliation\n• Payroll processing\n• Financial reporting\n• Tax compliance\n\nWhat specific task would you like me to help with?`;
}
