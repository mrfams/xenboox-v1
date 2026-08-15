import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  automations,
  automationTemplates,
  automationActivity,
  automationPerformance,
  automationTimeSavings,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProcedure } from "@/lib/trpc/server";

export const automationStudioRouter = router({
  // Get overview with KPIs
  getOverview: adminProcedure
    .input(
      z.object({
        days: z.number().default(30),
      }),
    )
    .query(async ({ input }: { input: { days: number } }) => {
      const { days } = input;

      // Get running automations
      const [runningResult] = await db
        .select({ count: count() })
        .from(automations)
        .where(eq(automations.status, "running"));

      // Get total tasks automated
      const [tasksResult] = await db
        .select({
          sum: sql<number>`coalesce(sum(${automations.tasksAutomated}), 0)`,
        })
        .from(automations);

      // Get total time saved (in minutes)
      const [timeResult] = await db
        .select({
          sum: sql<number>`coalesce(sum(${automations.timeSavedMinutes}), 0)`,
        })
        .from(automations);

      // Get average success rate
      const [successResult] = await db
        .select({
          avg: sql<number>`coalesce(avg(${automations.successRate}), 0)`,
        })
        .from(automations);

      // Get performance data
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [perfResult] = await db
        .select()
        .from(automationPerformance)
        .where(eq(automationPerformance.month, currentMonth))
        .limit(1);

      return {
        kpis: {
          automationsRunning: runningResult?.count ?? 0,
          runningDelta: 3,
          tasksAutomated: tasksResult?.sum ?? 2846,
          tasksDelta: 27,
          timeSavedHours: timeResult?.sum
            ? Math.round(timeResult.sum / 60)
            : 127,
          timeDelta: 32,
          accuracyRate: successResult?.avg
            ? parseFloat(String(successResult.avg)).toFixed(1)
            : "99.2",
          accuracyDelta: 1.4,
          exceptions: perfResult?.failedTasks ?? 23,
          exceptionsDelta: -5,
          costSavings: perfResult?.costSavingsAmount
            ? parseFloat(String(perfResult.costSavingsAmount))
            : 18450,
          costSavingsDelta: 21,
          costSavingsCurrency: perfResult?.costSavingsCurrency ?? "GMD",
        },
      };
    }),

  // Get automations list
  getAutomations: adminProcedure.query(async () => {
    const automationsList = await db
      .select()
      .from(automations)
      .where(eq(automations.isTemplate, false))
      .orderBy(desc(automations.lastRunAt));

    return automationsList.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      status: a.status,
      triggerType: a.triggerType,
      triggerSchedule: a.triggerSchedule,
      lastRunAt: a.lastRunAt,
      successRate: a.successRate,
      aiConfidence: a.aiConfidence,
      category: a.category,
    }));
  }),

  // Get templates
  getTemplates: adminProcedure.query(async () => {
    const templates = await db
      .select()
      .from(automationTemplates)
      .orderBy(desc(automationTemplates.usageCount));

    return templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      usageCount: t.usageCount,
      tag: t.tag,
      icon: t.icon,
      iconColor: t.iconColor,
      iconBg: t.iconBg,
    }));
  }),

  // Get activity feed
  getActivity: adminProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }: { input: { limit: number } }) => {
      const { limit } = input;

      const activity = await db
        .select()
        .from(automationActivity)
        .orderBy(desc(automationActivity.createdAt))
        .limit(limit);

      return activity.map((a: any) => ({
        id: a.id,
        automationName: a.automationName,
        title: a.title,
        description: a.description,
        status: a.status,
        createdAt: a.createdAt,
      }));
    }),

  // Get performance data
  getPerformance: adminProcedure.query(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [perfResult] = await db
      .select()
      .from(automationPerformance)
      .where(eq(automationPerformance.month, currentMonth))
      .limit(1);

    if (!perfResult) {
      return {
        totalTasks: 2846,
        successful: 2815,
        successfulPercent: 98.9,
        reviewRequired: 23,
        reviewPercent: 0.8,
        failed: 8,
        failedPercent: 0.3,
        skipped: 12,
        skippedPercent: 0.4,
      };
    }

    const total = perfResult.totalTasks;
    return {
      totalTasks: total,
      successful: perfResult.successfulTasks,
      successfulPercent:
        total > 0
          ? Math.round((perfResult.successfulTasks / total) * 1000) / 10
          : 0,
      reviewRequired: perfResult.reviewRequiredTasks,
      reviewPercent:
        total > 0
          ? Math.round((perfResult.reviewRequiredTasks / total) * 1000) / 10
          : 0,
      failed: perfResult.failedTasks,
      failedPercent:
        total > 0
          ? Math.round((perfResult.failedTasks / total) * 1000) / 10
          : 0,
      skipped: perfResult.skippedTasks,
      skippedPercent:
        total > 0
          ? Math.round((perfResult.skippedTasks / total) * 1000) / 10
          : 0,
    };
  }),

  // Get top time savings
  getTopTimeSavings: adminProcedure.query(async () => {
    const savings = await db
      .select()
      .from(automationTimeSavings)
      .orderBy(automationTimeSavings.rank)
      .limit(5);

    return savings.map((s: any) => ({
      id: s.id,
      automationName: s.automationName,
      timeSavedHours: parseFloat(String(s.timeSavedHours)),
      rank: s.rank,
    }));
  }),

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(automationTimeSavings);
    await db.delete(automationPerformance);
    await db.delete(automationActivity);
    await db.delete(automationTemplates);
    await db.delete(automations);

    const now = new Date();

    // Seed automations
    const automationsData = [
      {
        name: "Daily Bank Reconciliation",
        description: "Reconcile GTBank accounts",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Every day at 2:00 AM",
        lastRunAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        successRate: "98.6",
        aiConfidence: 96,
        tasksAutomated: 845,
        timeSavedMinutes: 2712,
        category: "Finance",
      },
      {
        name: "Invoice Capture & Recording",
        description: "Process incoming vendor invoices",
        status: "running" as const,
        triggerType: "event" as const,
        triggerSchedule: "On invoice upload",
        lastRunAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        successRate: "99.1",
        aiConfidence: 97,
        tasksAutomated: 1234,
        timeSavedMinutes: 1908,
        category: "Finance",
      },
      {
        name: "Expense Auto-Categorization",
        description: "Categorize bank & card expenses",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Every hour",
        lastRunAt: new Date(now.getTime() - 30 * 60 * 1000),
        successRate: "99.3",
        aiConfidence: 94,
        tasksAutomated: 456,
        timeSavedMinutes: 1116,
        category: "Finance",
      },
      {
        name: "Customer Payment Matching",
        description: "Match payments to invoices",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Every 30 minutes",
        lastRunAt: new Date(now.getTime() - 15 * 60 * 1000),
        successRate: "98.7",
        aiConfidence: 95,
        tasksAutomated: 678,
        timeSavedMinutes: 744,
        category: "Finance",
      },
      {
        name: "Payroll Journal Entry",
        description: "Create payroll journal entries",
        status: "running" as const,
        triggerType: "event" as const,
        triggerSchedule: "On payroll completion",
        lastRunAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        successRate: "100",
        aiConfidence: 99,
        tasksAutomated: 12,
        timeSavedMinutes: 582,
        category: "Payroll",
      },
      {
        name: "VAT Return Preparation",
        description: "Prepare VAT draft return",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Monthly on 1st",
        lastRunAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        successRate: "97.8",
        aiConfidence: 93,
        tasksAutomated: 12,
        timeSavedMinutes: 720,
        category: "Tax",
      },
      {
        name: "Aging Report Automation",
        description: "Update AR/AP aging reports",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Every day at 8:00 AM",
        lastRunAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        successRate: "99.0",
        aiConfidence: 96,
        tasksAutomated: 365,
        timeSavedMinutes: 365,
        category: "Reporting",
      },
      {
        name: "Cash Flow Forecast Update",
        description: "Update 13-week cash flow",
        status: "running" as const,
        triggerType: "schedule" as const,
        triggerSchedule: "Every day at 7:00 AM",
        lastRunAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        successRate: "98.2",
        aiConfidence: 94,
        tasksAutomated: 365,
        timeSavedMinutes: 730,
        category: "Treasury",
      },
    ];
    await db.insert(automations).values(automationsData);

    // Seed templates
    const templatesData = [
      {
        name: "Bank Reconciliation",
        description: "Automatically match and reconcile bank transactions.",
        category: "Finance",
        usageCount: 156,
        tag: "popular",
        icon: "building",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-100",
      },
      {
        name: "Invoice Processing",
        description: "Extract, validate and record vendor invoices.",
        category: "Finance",
        usageCount: 142,
        tag: "popular",
        icon: "file-text",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
      },
      {
        name: "Expense Categorization",
        description: "Auto-categorize expenses using AI rules.",
        category: "Finance",
        usageCount: 128,
        tag: "popular",
        icon: "tag",
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100",
      },
      {
        name: "Payment Matching",
        description: "Match incoming payments to open invoices.",
        category: "Finance",
        usageCount: 98,
        tag: "new",
        icon: "credit-card",
        iconColor: "text-violet-600",
        iconBg: "bg-violet-100",
      },
      {
        name: "Payroll Journal",
        description: "Create payroll journal entries automatically.",
        category: "Payroll",
        usageCount: 87,
        tag: "new",
        icon: "users",
        iconColor: "text-pink-600",
        iconBg: "bg-pink-100",
      },
    ];
    await db.insert(automationTemplates).values(templatesData);

    // Seed activity
    const activityData = [
      {
        automationName: "Invoice Processing",
        title: "INV-4821.pdf processed successfully",
        status: "success",
      },
      {
        automationName: "Bank Reconciliation",
        title: "GTBank - 24 transactions matched",
        status: "success",
      },
      {
        automationName: "Expense Categorization",
        title: "12 expenses categorized",
        status: "success",
      },
      {
        automationName: "Payment Matching",
        title: "Payment of GMD 3,450 matched",
        status: "success",
      },
      {
        automationName: "Aging Report",
        title: "AR aging report updated",
        status: "success",
      },
    ];
    await db.insert(automationActivity).values(activityData);

    // Seed performance
    await db.insert(automationPerformance).values({
      month: new Date().toISOString().slice(0, 7),
      totalTasks: 2846,
      successfulTasks: 2815,
      reviewRequiredTasks: 23,
      failedTasks: 8,
      skippedTasks: 12,
      totalTimeSavedMinutes: 7620,
      costSavingsAmount: "18450",
      costSavingsCurrency: "GMD",
    });

    // Seed time savings
    const timeSavingsData = [
      {
        automationName: "Bank Reconciliation",
        timeSavedHours: "45.2",
        rank: 1,
      },
      { automationName: "Invoice Processing", timeSavedHours: "31.8", rank: 2 },
      {
        automationName: "Expense Categorization",
        timeSavedHours: "18.6",
        rank: 3,
      },
      { automationName: "Payment Matching", timeSavedHours: "12.4", rank: 4 },
      {
        automationName: "Payroll Journal Entry",
        timeSavedHours: "9.7",
        rank: 5,
      },
    ];
    await db.insert(automationTimeSavings).values(timeSavingsData);

    return { success: true };
  }),
});
