import { eq, and, sql, count } from "drizzle-orm";
import { invoicesAp, journalEntries, payrollRuns } from "@xenboox/db/schema";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { safeQuery, MONTH_NAMES } from "./_helpers";

/**
 * Context-aware prompt suggestions for the AI chat input. Returns
 * suggestions driven by the entity's actual state (overdue invoices,
 * pending journals, current month, etc.) instead of hardcoded text.
 */
export const getDashboardSuggestions = rlsProtectedProcedure.query(
  async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const now = new Date();
    const currentMonth = MONTH_NAMES[now.getMonth()];

    const suggestions: Array<{
      id: string;
      label: string;
      prompt: string;
    }> = [];

    // 1. Overdue invoices (highest priority — urgent action needed)
    const overdueCount = await safeQuery(
      "suggest_overdue",
      async () => {
        const result = await db
          .select({ count: count() })
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, "overdue"),
            ),
          );
        return result[0]?.count ?? 0;
      },
      0,
    );

    if (overdueCount > 0) {
      suggestions.push({
        id: "overdue_invoices",
        label: `Follow up ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`,
        prompt: `Show all ${overdueCount} overdue invoices and help me follow up`,
      });
    }

    // 2. Pending journal entries
    const pendingJournalCount = await safeQuery(
      "suggest_journals",
      async () => {
        const result = await db
          .select({ count: count() })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "draft"),
            ),
          );
        return result[0]?.count ?? 0;
      },
      0,
    );

    if (pendingJournalCount > 0) {
      suggestions.push({
        id: "pending_journals",
        label: `Review ${pendingJournalCount} pending journal entr${pendingJournalCount > 1 ? "ies" : "y"}`,
        prompt: `Show me the ${pendingJournalCount} pending journal entries to review`,
      });
    }

    // 3. Pending payroll
    const pendingPayroll = await safeQuery(
      "suggest_payroll",
      () =>
        db.query.payrollRuns.findFirst({
          where: and(
            eq(payrollRuns.entityId, entityId),
            sql`${payrollRuns.status} IN ('draft', 'validated', 'approved')`,
          ),
        }),
      null,
    );

    if (pendingPayroll) {
      suggestions.push({
        id: "payroll",
        label: "Process payroll",
        prompt: "Help me process the pending payroll run",
      });
    }

    // 4. Close current month's books (always shown)
    suggestions.push({
      id: "close_books",
      label: `Close ${currentMonth} books`,
      prompt: `Close the books for ${currentMonth} ${now.getFullYear()}`,
    });

    // 5. Explain cash position (always shown)
    suggestions.push({
      id: "cash_position",
      label: "Explain cash position",
      prompt: "Explain my current cash position",
    });

    // 6. Forecast (always shown)
    suggestions.push({
      id: "forecast",
      label: "Forecast next month",
      prompt: "Forecast cash flow for next month",
    });

    return suggestions.slice(0, 6);
  },
);
