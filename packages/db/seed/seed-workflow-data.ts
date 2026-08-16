/**
 * Seed workflow-builder demo data (Invoice Processing Workflow).
 *
 * Replicates the workflowBuilder router's `seedDemoData` mutation body so the
 * /admin/workflow-builder page renders a real canvas with nodes, edges, runs,
 * versions, and templates. Idempotent: only writes when `workflows` is empty.
 *
 * Usage:
 *   cd packages/db && pnpm tsx seed/seed-workflow-data.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  workflows,
  workflowNodes,
  workflowEdges,
  workflowRuns,
  workflowVersions,
  workflowTemplates,
} from "../schema/ops-workflow-builder";

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

export async function seedWorkflowData() {
  const existing = await db.select({ c: count() }).from(workflows);
  if ((existing[0]?.c ?? 0) > 0) {
    console.log("workflow-builder seed: skipped (data exists)");
    return;
  }

  // Main workflow
  const [mainWorkflow] = await db
    .insert(workflows)
    .values({
      name: "Invoice Processing Workflow",
      description:
        "Automated invoice processing with AI extraction, validation, and human review.",
      status: "active",
      version: "1.3",
      lastPublishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      totalSteps: 10,
      aiAgentCount: 4,
      humanStepCount: 2,
      integrationCount: 2,
      avgDurationMinutes: "1.2",
      successRate: "98.6",
      totalRuns: 243,
    })
    .returning();

  if (!mainWorkflow) throw new Error("Failed to create workflow");

  // Nodes
  const nodesData = [
    {
      workflowId: mainWorkflow.id,
      name: "Email Inbound",
      type: "trigger" as const,
      stepNumber: 1,
      x: "200",
      y: "50",
      triggerType: "email_inbound" as const,
      config: { description: "Receives invoice emails" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Document Extractor",
      type: "ai_agent" as const,
      stepNumber: 2,
      x: "200",
      y: "150",
      model: "claude-3-5-sonnet",
      instructions:
        "Extract invoice number, vendor, date, due date, line items, amounts, taxes and total.",
      outputSchema: {
        fields: [
          "invoiceNumber",
          "vendor",
          "date",
          "dueDate",
          "lineItems",
          "amount",
          "taxes",
          "total",
        ],
      },
      confidenceThreshold: 85,
      config: { description: "Extracts data from invoice" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Data Validator",
      type: "ai_agent" as const,
      stepNumber: 3,
      x: "200",
      y: "250",
      model: "claude-3-5-sonnet",
      instructions:
        "Validate extracted invoice data for completeness and accuracy.",
      config: { description: "Validates invoice data" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Data is valid?",
      type: "condition" as const,
      stepNumber: 4,
      x: "200",
      y: "350",
      condition: "confidence >= 85 && requiredFieldsPresent",
      trueBranch: "node-categorization",
      falseBranch: "node-review",
      config: { description: "Check if data is valid" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Review Task",
      type: "review" as const,
      stepNumber: 4,
      x: "400",
      y: "350",
      config: { description: "Review and correct data" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Categorization Agent",
      type: "ai_agent" as const,
      stepNumber: 5,
      x: "200",
      y: "450",
      model: "claude-3-5-sonnet",
      instructions: "Categorize the expense based on vendor and line items.",
      config: { description: "Categorizes expense" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Create Bill",
      type: "action" as const,
      stepNumber: 6,
      x: "200",
      y: "550",
      config: {
        action: "create_record",
        description: "Create bill in system",
      },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Match & Reconcile",
      type: "ai_agent" as const,
      stepNumber: 7,
      x: "350",
      y: "550",
      model: "claude-3-5-sonnet",
      instructions: "Match invoice with PO / Receipt.",
      config: { description: "Matches with PO / Receipt" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Approval",
      type: "approval" as const,
      stepNumber: 8,
      x: "450",
      y: "450",
      config: { description: "Manager approval required" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Post to Ledger",
      type: "action" as const,
      stepNumber: 9,
      x: "450",
      y: "350",
      config: { action: "post_journal", description: "Post journal entry" },
    },
    {
      workflowId: mainWorkflow.id,
      name: "Send Notification",
      type: "action" as const,
      stepNumber: 10,
      x: "450",
      y: "250",
      config: {
        action: "send_notification",
        description: "Notify stakeholders",
      },
    },
  ];

  const insertedNodes = await db
    .insert(workflowNodes)
    .values(nodesData)
    .returning();

  // Edges
  const edgesData = [
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[0]!.id,
      targetNodeId: insertedNodes[1]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[1]!.id,
      targetNodeId: insertedNodes[2]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[2]!.id,
      targetNodeId: insertedNodes[3]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[3]!.id,
      targetNodeId: insertedNodes[4]!.id,
      label: "No",
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[3]!.id,
      targetNodeId: insertedNodes[5]!.id,
      label: "Yes",
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[4]!.id,
      targetNodeId: insertedNodes[5]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[5]!.id,
      targetNodeId: insertedNodes[6]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[5]!.id,
      targetNodeId: insertedNodes[7]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[6]!.id,
      targetNodeId: insertedNodes[8]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[7]!.id,
      targetNodeId: insertedNodes[8]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[8]!.id,
      targetNodeId: insertedNodes[9]!.id,
    },
    {
      workflowId: mainWorkflow.id,
      sourceNodeId: insertedNodes[9]!.id,
      targetNodeId: insertedNodes[10]!.id,
    },
  ];
  await db.insert(workflowEdges).values(edgesData);

  // Latest run
  await db.insert(workflowRuns).values({
    workflowId: mainWorkflow.id,
    status: "completed",
    startedAt: new Date(now.getTime() - 60 * 60 * 1000),
    completedAt: new Date(now.getTime() - 58 * 60 * 1000),
    durationMinutes: "1.2",
    completedSteps: 10,
    totalSteps: 10,
    confidence: "92",
    fieldsExtracted: 12,
    fieldsTotal: 12,
    triggeredBy: "Email Inbound",
  });

  // Version
  await db.insert(workflowVersions).values({
    workflowId: mainWorkflow.id,
    version: "1.3",
    description: "Added reconciliation agent and improved extraction accuracy.",
    publishedBy: "Famara Touray",
  });

  // Templates
  await db.insert(workflowTemplates).values([
    {
      name: "Invoice Processing",
      description: "Automated invoice extraction and processing",
      category: "Finance",
      usageCount: 45,
    },
    {
      name: "Receipt Matching",
      description: "Match receipts with transactions",
      category: "Finance",
      usageCount: 32,
    },
    {
      name: "Employee Onboarding",
      description: "Automated employee setup workflow",
      category: "HR",
      usageCount: 28,
    },
    {
      name: "Expense Approval",
      description: "Multi-level expense approval flow",
      category: "Finance",
      usageCount: 24,
    },
  ]);

  console.log(
    `workflow-builder seed: done (1 workflow, ${insertedNodes.length} nodes, ${edgesData.length} edges, run, version, 4 templates)`,
  );
}

// Direct-run entry (pnpm tsx seed/seed-workflow-data.ts)
// Basename comparison is Windows-safe (new URL() mangles drive-letter paths).
const isDirectRun =
  (import.meta.url.split(/[\\/]/).pop() ?? "") ===
  (process.argv[1]?.split(/[\\/]/).pop() ?? "");
if (isDirectRun) {
  seedWorkflowData().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
}
