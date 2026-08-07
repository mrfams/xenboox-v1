import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { closePeriods, agents, approvals } from "@xenboox/db/schema";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";

// ─── Month-End Close Center Router ─────────────────────────────────────────

export const closeCenterRouter = router({
  /**
   * Get close center overview data.
   */
  getOverview: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(), // YYYY-MM format
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Default to current month
      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Get close period for this entity and period
      const closePeriod = await db.query.closePeriods.findFirst({
        where: and(
          eq(closePeriods.entityId, entityId),
          eq(closePeriods.periodMonth, period),
        ),
      });

      // Get fiscal period
      const fiscalPeriod = await db.query.fiscalPeriods.findFirst({
        where: and(
          eq(fiscalPeriods.entityId, entityId),
          sql`${fiscalPeriods.startDate} <= ${period}-28`,
          sql`${fiscalPeriods.endDate} >= ${period}-01`,
        ),
      });

      // Get all tasks for this period (simulated from approvals and agent logs)
      const totalTasks = 40;
      const completedTasks = closePeriod?.status === "closed" ? totalTasks : 27;
      const overallProgress = Math.round((completedTasks / totalTasks) * 100);

      // Auto-completed by AI
      const autoCompleted = 15;
      const autoCompletedPercent = Math.round(
        (autoCompleted / totalTasks) * 100,
      );

      // Adjustments detected
      const adjustmentsDetected = 8;

      // Risks & blockers
      const risksAndBlockers = 2;

      // Close status
      const closeStatus =
        closePeriod?.status === "closed" ? "Completed" : "On Track";
      const estimatedCloseDate = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-02`;
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (new Date(estimatedCloseDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      return {
        period,
        overallProgress,
        completedTasks,
        totalTasks,
        closeStatus,
        estimatedCloseDate,
        daysRemaining,
        autoCompleted,
        autoCompletedPercent,
        adjustmentsDetected,
        risksAndBlockers,
        isOnTrack: closeStatus === "On Track" || closeStatus === "Completed",
      };
    }),

  /**
   * Get close checklist with phases and tasks.
   */
  getChecklist: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Get agents for task assignment
      const agentList = await db.query.agents.findMany({
        where: eq(agents.isActive, true),
      });

      const agentMap = new Map(agentList.map((a) => [a.name, a]));

      // Define phases and tasks (in production, this would come from a close_tasks table)
      const phases = [
        {
          id: "pre-close",
          name: "Pre-Close",
          order: 1,
          tasks: [
            {
              id: "task-1",
              name: "Review bank feeds & categorize",
              owner: "Bank Reconciler Agent",
              ownerInitials: "BR",
              ownerColor: "bg-indigo-500",
              status: "completed",
              confidence: 98,
              dueDate: "May 20",
            },
            {
              id: "task-2",
              name: "Reconcile all bank accounts",
              owner: "Bank Reconciler Agent",
              ownerInitials: "BR",
              ownerColor: "bg-indigo-500",
              status: "completed",
              confidence: 95,
              dueDate: "May 21",
            },
            {
              id: "task-3",
              name: "Review accounts payable aging",
              owner: "AP Agent",
              ownerInitials: "AP",
              ownerColor: "bg-emerald-500",
              status: "completed",
              confidence: 97,
              dueDate: "May 21",
            },
            {
              id: "task-4",
              name: "Review accounts receivable aging",
              owner: "AR Agent",
              ownerInitials: "AR",
              ownerColor: "bg-blue-500",
              status: "in_review",
              confidence: 92,
              dueDate: "May 22",
            },
            {
              id: "task-5",
              name: "Verify payroll for the month",
              owner: "Payroll Agent",
              ownerInitials: "PA",
              ownerColor: "bg-amber-500",
              status: "pending",
              confidence: null,
              dueDate: "May 22",
            },
            {
              id: "task-6",
              name: "Review open items & accruals",
              owner: "Journal Agent",
              ownerInitials: "JA",
              ownerColor: "bg-purple-500",
              status: "pending",
              confidence: null,
              dueDate: "May 23",
            },
          ],
        },
        {
          id: "closing-entries",
          name: "Closing Entries",
          order: 2,
          taskCount: 12,
          isExpanded: false,
        },
        {
          id: "reconciliations",
          name: "Reconciliations",
          order: 3,
          taskCount: 10,
          isExpanded: false,
        },
        {
          id: "reviews-approvals",
          name: "Reviews & Approvals",
          order: 4,
          taskCount: 8,
          isExpanded: false,
        },
        {
          id: "reporting-finalization",
          name: "Reporting & Finalization",
          order: 5,
          taskCount: 4,
          isExpanded: false,
        },
      ];

      return {
        period,
        phases,
        totalTasks: 40,
        completedTasks: 27,
      };
    }),

  /**
   * Get AI Close Assistant recommendations.
   */
  getAiRecommendations: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // In production, this would analyze actual close progress
    const recommendations = [
      {
        id: "rec-1",
        type: "warning",
        title: "Unreconciled bank accounts",
        description: "2 accounts are unreconciled for more than 7 days.",
        actionLabel: "Reconcile now",
        priority: "high",
      },
      {
        id: "rec-2",
        type: "info",
        title: "Accruals missing",
        description: "4 recurring accruals are due but not created.",
        actionLabel: "Create accruals",
        priority: "medium",
      },
    ];

    return {
      isOnTrack: true,
      estimatedCloseDate: "Jun 2, 2025",
      risksCount: 2,
      recommendations,
    };
  }),

  /**
   * Get time saved by AI.
   */
  getTimeSaved: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // In production, this would calculate actual time saved
      const breakdown = [
        { task: "Bank Reconciliations", hours: 12.4 },
        { task: "Transaction Categorization", hours: 9.8 },
        { task: "Data Validation", hours: 7.1 },
        { task: "Journal Entry Drafting", hours: 5.3 },
        { task: "Other", hours: 3.0 },
      ];

      const totalHours = breakdown.reduce((sum, b) => sum + b.hours, 0);
      const changeVsLastMonth = 18;

      return {
        totalHours,
        totalHoursFormatted: `${totalHours.toFixed(1)} hrs`,
        changeVsLastMonth,
        breakdown,
      };
    }),

  /**
   * Get close history.
   */
  getCloseHistory: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get historical close periods
    const history = await db.query.closePeriods.findMany({
      where: and(
        eq(closePeriods.entityId, entityId),
        eq(closePeriods.status, "closed"),
      ),
      orderBy: [desc(closePeriods.periodMonth)],
      limit: 12,
    });

    // If no history, return mock data
    if (history.length === 0) {
      return [
        { period: "Apr 2025", closedDate: "Apr 30, 2025", onTime: true },
        { period: "Mar 2025", closedDate: "Mar 31, 2025", onTime: true },
        { period: "Feb 2025", closedDate: "Feb 28, 2025", onTime: true },
        { period: "Jan 2025", closedDate: "Jan 31, 2025", onTime: true },
        { period: "Dec 2024", closedDate: "Dec 31, 2024", onTime: true },
      ];
    }

    return history.map((h) => ({
      period: h.periodMonth,
      closedDate:
        h.closedAt?.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) ?? "Unknown",
      onTime: true,
    }));
  }),

  /**
   * Get AI insights for the close center.
   */
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const insights = [
      {
        id: "insight-1",
        type: "success",
        title: "Close is 3 days ahead",
        description: "Compared to last month",
        icon: "check",
      },
      {
        id: "insight-2",
        type: "info",
        title: "AI auto-completed 15 tasks",
        description: "Save 12.4 hrs of manual work",
        icon: "sparkles",
      },
      {
        id: "insight-3",
        type: "warning",
        title: "Adjustments detected",
        description: "8 journal adjustments need review",
        icon: "alert",
      },
      {
        id: "insight-4",
        type: "success",
        title: "Data quality score: 92%",
        description: "Very good",
        icon: "check",
      },
    ];

    return insights;
  }),

  /**
   * Get task completion trend data.
   */
  getTaskCompletionTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    // In production, this would query actual completion data
    const trend = [
      { date: "May 1", thisMonth: 0, lastMonth: 0 },
      { date: "May 8", thisMonth: 25, lastMonth: 20 },
      { date: "May 15", thisMonth: 45, lastMonth: 40 },
      { date: "May 22", thisMonth: 60, lastMonth: 55 },
      { date: "May 29", thisMonth: 68, lastMonth: 65 },
    ];

    return trend;
  }),
});
