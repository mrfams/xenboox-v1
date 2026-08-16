/**
 * Seed admin-ops demo data (AI Agent Monitor).
 *
 * Replicates the agentMonitor router's `seedAgentMonitorData` mutation body
 * so the /admin/agent-monitor page renders real rows. Idempotent: only
 * writes when the ops_agent_health table is empty.
 *
 * Usage:
 *   cd packages/db && pnpm tsx seed/seed-admin-ops.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  opsAgentHealth,
  opsAgentRunsHourly,
  opsAgentAlerts,
  opsAgentActivity,
  opsSystemResources,
  opsWorkloadDistribution,
} from "../schema/ops-agent-monitor";

// Load DATABASE_URL from repo .env.local (quoted values supported).
const envContent = readFileSync(
  new URL("../../../.env.local", import.meta.url),
  "utf8",
);
const urlMatch = envContent.match(/^DATABASE_URL="?(.+?)"?\s*$/m);
const url = urlMatch?.[1] ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL not found. Set it in .env.local or the environment.",
  );
  process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql);

const now = new Date();

// ── Agent health rows (mirrors the router seed) ───────────────────────────

const agents = [
  {
    agentName: "bank_reconciler",
    displayName: "Bank Reconciler",
    category: "accounting" as const,
    healthScore: 96,
    successRate: "98.90",
    totalRuns24h: 1245,
    errors24h: 14,
    avgLatencyMs: 1850,
    status: "healthy" as const,
    currentTask: "Reconcile GTBank **** 6789 May 2025 transactions",
    currentTaskProgress: 78,
    currentTaskEta: "2m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 5,
    memoryUsageGb: "1.2",
    tasksRunning: 3,
    tasksCompleted: 45,
    tasksReview: 2,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "12.5",
  },
  {
    agentName: "invoice_processor",
    displayName: "Invoice Processor",
    category: "accounting" as const,
    healthScore: 94,
    successRate: "98.10",
    totalRuns24h: 1980,
    errors24h: 34,
    avgLatencyMs: 2450,
    status: "healthy" as const,
    currentTask: "Process 23 uploaded invoices Extracting data with OCR",
    currentTaskProgress: 45,
    currentTaskEta: "6m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "0.8",
    tasksRunning: 2,
    tasksCompleted: 38,
    tasksReview: 3,
    tasksFailed: 1,
    humanReviewCount: 2,
    timeSavedHours: "8.3",
  },
  {
    agentName: "payroll_assistant",
    displayName: "Payroll Assistant",
    category: "hr" as const,
    healthScore: 93,
    successRate: "96.80",
    totalRuns24h: 1320,
    errors24h: 42,
    avgLatencyMs: 1880,
    status: "healthy" as const,
    currentTask: "Prepare May 2025 payroll Calculating salaries & taxes",
    currentTaskProgress: 62,
    currentTaskEta: "12m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 6,
    memoryUsageGb: "0.9",
    tasksRunning: 1,
    tasksCompleted: 28,
    tasksReview: 1,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "6.2",
  },
  {
    agentName: "journal_entry_agent",
    displayName: "Journal Entry Agent",
    category: "accounting" as const,
    healthScore: 97,
    successRate: "97.60",
    totalRuns24h: 2842,
    errors24h: 68,
    avgLatencyMs: 2110,
    status: "healthy" as const,
    currentTask: "Categorize 18 transactions Auto-categorizing expenses",
    currentTaskProgress: 88,
    currentTaskEta: "1m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 3,
    memoryUsageGb: "0.6",
    tasksRunning: 4,
    tasksCompleted: 52,
    tasksReview: 1,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "9.8",
  },
  {
    agentName: "ap_payment_scanner",
    displayName: "AP Payment Scanner",
    category: "accounting" as const,
    healthScore: 91,
    successRate: "95.60",
    totalRuns24h: 1542,
    errors24h: 68,
    avgLatencyMs: 2090,
    status: "healthy" as const,
    currentTask: "Scan & process 12 bills Matching with POs",
    currentTaskProgress: 35,
    currentTaskEta: "8m",
    model: "Claude 3.5 Haiku",
    toolsCount: 4,
    memoryUsageGb: "0.7",
    tasksRunning: 2,
    tasksCompleted: 32,
    tasksReview: 2,
    tasksFailed: 1,
    humanReviewCount: 1,
    timeSavedHours: "5.4",
  },
  {
    agentName: "tax_compliance",
    displayName: "Tax Compliance",
    category: "compliance" as const,
    healthScore: 95,
    successRate: "95.70",
    totalRuns24h: 420,
    errors24h: 18,
    avgLatencyMs: 3200,
    status: "healthy" as const,
    currentTask: "VAT return preparation Collecting required data",
    currentTaskProgress: 20,
    currentTaskEta: "25m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 5,
    memoryUsageGb: "1.1",
    tasksRunning: 1,
    tasksCompleted: 18,
    tasksReview: 1,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "3.8",
  },
  {
    agentName: "forecasting_agent",
    displayName: "Forecasting Agent",
    category: "analytics" as const,
    healthScore: 89,
    successRate: "96.50",
    totalRuns24h: 580,
    errors24h: 20,
    avgLatencyMs: 2650,
    status: "healthy" as const,
    currentTask: "Cash flow forecast Analyzing trends",
    currentTaskProgress: 90,
    currentTaskEta: "3m",
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "1.4",
    tasksRunning: 1,
    tasksCompleted: 22,
    tasksReview: 3,
    tasksFailed: 0,
    humanReviewCount: 2,
    timeSavedHours: "4.2",
  },
  {
    agentName: "expense_auditor",
    displayName: "Expense Auditor",
    category: "accounting" as const,
    healthScore: 87,
    successRate: "95.10",
    totalRuns24h: 380,
    errors24h: 19,
    avgLatencyMs: 2180,
    status: "warning" as const,
    currentTask: "Review 30 flagged expenses Checking for duplicates",
    currentTaskProgress: 70,
    currentTaskEta: "5m",
    model: "Claude 3.5 Haiku",
    toolsCount: 3,
    memoryUsageGb: "0.5",
    tasksRunning: 1,
    tasksCompleted: 15,
    tasksReview: 4,
    tasksFailed: 2,
    humanReviewCount: 3,
    timeSavedHours: "2.1",
  },
  {
    agentName: "report_generation",
    displayName: "Report Generation Agent",
    category: "analytics" as const,
    healthScore: 90,
    successRate: "97.30",
    totalRuns24h: 1103,
    errors24h: 29,
    avgLatencyMs: 2220,
    status: "healthy" as const,
    currentTask: null,
    currentTaskProgress: 0,
    currentTaskEta: null,
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "0.8",
    tasksRunning: 0,
    tasksCompleted: 42,
    tasksReview: 0,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "7.5",
  },
  {
    agentName: "document_understanding",
    displayName: "Document Understanding Agent",
    category: "accounting" as const,
    healthScore: 91,
    successRate: "98.10",
    totalRuns24h: 1987,
    errors24h: 37,
    avgLatencyMs: 2080,
    status: "healthy" as const,
    currentTask: null,
    currentTaskProgress: 0,
    currentTaskEta: null,
    model: "Claude 3.5 Sonnet",
    toolsCount: 5,
    memoryUsageGb: "1.0",
    tasksRunning: 0,
    tasksCompleted: 56,
    tasksReview: 0,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "10.2",
  },
  {
    agentName: "cash_flow_forecasting",
    displayName: "Cash Flow Forecasting Agent",
    category: "treasury" as const,
    healthScore: 88,
    successRate: "96.50",
    totalRuns24h: 580,
    errors24h: 20,
    avgLatencyMs: 2650,
    status: "healthy" as const,
    currentTask: null,
    currentTaskProgress: 0,
    currentTaskEta: null,
    model: "Claude 3.5 Sonnet",
    toolsCount: 4,
    memoryUsageGb: "1.3",
    tasksRunning: 0,
    tasksCompleted: 18,
    tasksReview: 0,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "3.5",
  },
  {
    agentName: "compliance_check",
    displayName: "Compliance Check Agent",
    category: "compliance" as const,
    healthScore: 85,
    successRate: "95.10",
    totalRuns24h: 420,
    errors24h: 21,
    avgLatencyMs: 3200,
    status: "healthy" as const,
    currentTask: null,
    currentTaskProgress: 0,
    currentTaskEta: null,
    model: "Claude 3.5 Haiku",
    toolsCount: 3,
    memoryUsageGb: "0.6",
    tasksRunning: 0,
    tasksCompleted: 14,
    tasksReview: 0,
    tasksFailed: 0,
    humanReviewCount: 0,
    timeSavedHours: "2.8",
  },
];

const alerts = [
  {
    agentName: "expense_auditor",
    alertType: "high_error_rate",
    severity: "critical",
    title: "High error rate detected",
    description: "Expense Auditor has 5 failed tasks",
  },
  {
    agentName: "payroll_assistant",
    alertType: "human_review_required",
    severity: "warning",
    title: "Human review required",
    description: "7 tasks are waiting for your review",
  },
  {
    agentName: "cash_flow_forecasting",
    alertType: "agent_deployed",
    severity: "info",
    title: "New agent available",
    description: "Fixed Asset Manager is ready to use",
  },
  {
    agentName: "tax_compliance",
    alertType: "high_latency",
    severity: "warning",
    title: "High latency detected",
    description: "Tax Compliance Agent response time increased",
  },
  {
    agentName: "forecasting_agent",
    alertType: "low_success_rate",
    severity: "warning",
    title: "Success rate below 95%",
    description: "Forecasting Agent needs attention",
  },
];

const activities = [
  {
    agentName: "bank_reconciler",
    activityType: "matched",
    title: "Matched 48 transactions",
    description: "Auto-matched with high confidence",
  },
  {
    agentName: "invoice_processor",
    activityType: "identified",
    title: "Identified 2 possible matches",
    description: "Awaiting confirmation",
  },
  {
    agentName: "bank_reconciler",
    activityType: "downloaded",
    title: "Downloaded 256 transactions",
    description: "From GTBank **** 6789",
  },
  {
    agentName: "bank_reconciler",
    activityType: "connected",
    title: "Connected to bank",
    description: "Secure connection established",
  },
  {
    agentName: "journal_entry_agent",
    activityType: "processed",
    title: "Processed 18 journal entries",
    description: "All entries posted successfully",
  },
];

export async function seedAdminOps() {
  const existing = await db.select({ c: count() }).from(opsAgentHealth);
  if ((existing[0]?.c ?? 0) > 0) {
    console.log("agent-monitor seed: skipped (data exists)");
    return;
  }

  // Agent health
  for (const agent of agents) {
    const trendData = Array.from({ length: 7 }, () =>
      Math.floor(80 + Math.random() * 20),
    );
    await db.insert(opsAgentHealth).values({
      ...agent,
      trendData,
      isActive: true,
      lastRunAt: new Date(now.getTime() - Math.random() * 3600000),
      currentTaskStartedAt: agent.currentTask
        ? new Date(now.getTime() - 15 * 60000)
        : null,
    });
  }

  // Hourly runs (last 24 hours)
  for (let h = 23; h >= 0; h--) {
    const hour = new Date(now.getTime() - h * 3600000);
    const hourStr = hour.toISOString().slice(0, 13).replace("T", " ") + ":00";

    for (const agent of agents.slice(0, 8)) {
      const runs = Math.floor(50 + Math.random() * 200);
      const successCount = Math.floor(runs * (0.9 + Math.random() * 0.1));
      await db.insert(opsAgentRunsHourly).values({
        agentName: agent.agentName,
        hour: hourStr,
        runs,
        successCount,
        errorCount: runs - successCount,
        totalLatencyMs: runs * agent.avgLatencyMs,
        avgLatencyMs: agent.avgLatencyMs,
        successRate: ((successCount / runs) * 100).toFixed(2),
      });
    }
  }

  // Alerts
  for (let i = 0; i < alerts.length; i++) {
    const minsAgo = [2, 18, 45, 60, 120][i]!;
    await db.insert(opsAgentAlerts).values({
      ...alerts[i]!,
      createdAt: new Date(now.getTime() - minsAgo * 60000),
    });
  }

  // System resources
  await db.insert(opsSystemResources).values({
    cpuUsagePercent: "24.00",
    cpuCores: 16,
    memoryUsagePercent: "48.00",
    memoryTotalGb: "64.0",
    workerQueueJobs: 7,
    allSystemsOperational: true,
    activeWorkflows: 18,
    queueLength: 7,
  });

  // Workload distribution
  await db.insert(opsWorkloadDistribution).values({
    date: now.toISOString().slice(0, 10),
    completed: 68,
    inProgress: 24,
    review: 22,
    scheduled: 28,
    failed: 14,
    totalTasks: 156,
  });

  // Activity feed
  for (let i = 0; i < activities.length; i++) {
    const minsAgo = [10, 30, 34, 37, 45][i]!;
    await db.insert(opsAgentActivity).values({
      ...activities[i]!,
      createdAt: new Date(now.getTime() - minsAgo * 60000),
    });
  }

  console.log(
    `agent-monitor seed: done (${agents.length} agents, 24h runs, ${alerts.length} alerts, resources, workload, ${activities.length} activities)`,
  );
}

// Direct-run entry (pnpm tsx seed/seed-admin-ops.ts)
// Basename comparison is Windows-safe (new URL() mangles drive-letter paths).
const isDirectRun =
  (import.meta.url.split(/[\\/]/).pop() ?? "") ===
  (process.argv[1]?.split(/[\\/]/).pop() ?? "");
if (isDirectRun) {
  seedAdminOps().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
}
