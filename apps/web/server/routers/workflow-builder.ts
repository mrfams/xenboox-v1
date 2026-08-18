import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  workflows,
  workflowNodes,
  workflowEdges,
  workflowRuns,
  workflowVersions,
  workflowTemplates,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";
import { logger } from "@/lib/logger";

// ─── Validation ─────────────────────────────────────────────────────────────
// Shared zod schemas so every mutation validates the same shape the canvas
// page sends. Nodes/edges are stored on the workflow row (canvas_data) AND as
// normalized rows — the normalized rows drive runs/analytics, canvas_data
// preserves the exact editor state for round-trip rendering.

const nodeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  type: z.enum([
    "trigger",
    "ai_agent",
    "action",
    "condition",
    "router",
    "delay",
    "approval",
    "review",
  ]),
  stepNumber: z.number().int().positive().optional(),
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  config: z.record(z.unknown()).optional(),
  model: z.string().max(100).nullable().optional(),
  instructions: z.string().nullable().optional(),
  outputSchema: z.record(z.unknown()).optional(),
  confidenceThreshold: z.number().int().min(0).max(100).nullable().optional(),
  triggerType: z
    .enum(["schedule", "webhook", "file_upload", "email_inbound", "manual"])
    .nullable()
    .optional(),
  condition: z.string().nullable().optional(),
  trueBranch: z.string().max(255).nullable().optional(),
  falseBranch: z.string().max(255).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const edgeSchema = z.object({
  id: z.string().optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(100).nullable().optional(),
  condition: z.string().nullable().optional(),
});

const workflowInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Workflow name is required").max(255),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).default("draft"),
  canvasData: z.record(z.unknown()).nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

/** Recompute workflow stats from its node list (single source of truth). */
function computeWorkflowStats(nodes: z.infer<typeof nodeSchema>[]) {
  const aiAgentCount = nodes.filter((n) => n.type === "ai_agent").length;
  const humanStepCount = nodes.filter(
    (n) => n.type === "approval" || n.type === "review",
  ).length;
  const integrationCount = nodes.filter(
    (n) => n.type === "action" || n.type === "trigger",
  ).length;
  return {
    totalSteps: nodes.length,
    aiAgentCount,
    humanStepCount,
    integrationCount,
  };
}

/** Insert nodes + edges for a workflow, preserving the canvas geometry. */
async function saveNodesAndEdges(
  workflowId: string,
  nodes: z.infer<typeof nodeSchema>[],
  edges: z.infer<typeof edgeSchema>[],
) {
  if (nodes.length === 0) return;

  // Insert nodes, keeping the client id → DB uuid mapping so edges can be
  // resolved against the real row ids (canvas ids are client-generated).
  const inserted = await db
    .insert(workflowNodes)
    .values(
      nodes.map((n, i) => ({
        workflowId,
        name: n.name,
        type: n.type,
        stepNumber: n.stepNumber ?? i + 1,
        x: n.x != null ? String(n.x) : null,
        y: n.y != null ? String(n.y) : null,
        config: n.config ?? null,
        model: n.model ?? null,
        instructions: n.instructions ?? null,
        outputSchema: n.outputSchema ?? null,
        confidenceThreshold: n.confidenceThreshold ?? 85,
        triggerType: n.triggerType ?? null,
        condition: n.condition ?? null,
        trueBranch: n.trueBranch ?? null,
        falseBranch: n.falseBranch ?? null,
        metadata: n.metadata ?? null,
      })),
    )
    .returning({ id: workflowNodes.id });

  if (edges.length === 0 || inserted.length === 0) return;

  // Client ids map 1:1 to inserted rows in order (both arrays are the same
  // length and order — the canvas sends nodes in their canonical order).
  const idByClientId = new Map<string, string>();
  nodes.forEach((n, i) => {
    if (n.id && inserted[i]) idByClientId.set(n.id, inserted[i].id);
  });
  const resolve = (clientId: string): string => {
    const dbId = idByClientId.get(clientId);
    if (dbId) return dbId;
    // Fallback: first inserted node (keeps the edge valid rather than
    // failing the whole save).
    return inserted[0].id;
  };

  await db.insert(workflowEdges).values(
    edges.map((e) => ({
      workflowId,
      sourceNodeId: resolve(e.source),
      targetNodeId: resolve(e.target),
      label: e.label ?? null,
      condition: e.condition ?? null,
    })),
  );
}

export const workflowBuilderRouter = router({
  // Get workflow list
  getWorkflows: adminProtectedProcedure.query(async () => {
    const workflowsList = await db
      .select()
      .from(workflows)
      .orderBy(desc(workflows.updatedAt));

    return workflowsList.map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      status: w.status,
      version: w.version,
      lastPublishedAt: w.lastPublishedAt,
      totalSteps: w.totalSteps,
      aiAgentCount: w.aiAgentCount,
      humanStepCount: w.humanStepCount,
      integrationCount: w.integrationCount,
      avgDurationMinutes: w.avgDurationMinutes,
      successRate: w.successRate,
      totalRuns: w.totalRuns,
    }));
  }),

  // Get workflow detail
  getWorkflowDetail: adminProtectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }: { input: { workflowId: string } }) => {
      const { workflowId } = input;

      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // Get nodes
      const nodes = await db
        .select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, workflowId))
        .orderBy(workflowNodes.stepNumber);

      // Get edges
      const edges = await db
        .select()
        .from(workflowEdges)
        .where(eq(workflowEdges.workflowId, workflowId));

      // Get latest run
      const [latestRun] = await db
        .select()
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, workflowId))
        .orderBy(desc(workflowRuns.startedAt))
        .limit(1);

      // Get versions
      const versions = await db
        .select()
        .from(workflowVersions)
        .where(eq(workflowVersions.workflowId, workflowId))
        .orderBy(desc(workflowVersions.createdAt))
        .limit(10);

      return {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
          version: workflow.version,
          lastPublishedAt: workflow.lastPublishedAt,
          totalSteps: workflow.totalSteps,
          aiAgentCount: workflow.aiAgentCount,
          humanStepCount: workflow.humanStepCount,
          integrationCount: workflow.integrationCount,
          avgDurationMinutes: workflow.avgDurationMinutes,
          successRate: workflow.successRate,
          totalRuns: workflow.totalRuns,
          canvasData: workflow.canvasData,
          settings: workflow.settings,
        },
        nodes: nodes.map((n: any) => ({
          id: n.id,
          name: n.name,
          type: n.type,
          stepNumber: n.stepNumber,
          x: n.x ? parseFloat(n.x) : null,
          y: n.y ? parseFloat(n.y) : null,
          config: n.config,
          model: n.model,
          instructions: n.instructions,
          outputSchema: n.outputSchema,
          confidenceThreshold: n.confidenceThreshold,
          triggerType: n.triggerType,
          condition: n.condition,
          trueBranch: n.trueBranch,
          falseBranch: n.falseBranch,
        })),
        edges: edges.map((e: any) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          label: e.label,
          condition: e.condition,
        })),
        latestRun: latestRun
          ? {
              id: latestRun.id,
              status: latestRun.status,
              startedAt: latestRun.startedAt,
              completedAt: latestRun.completedAt,
              durationMinutes: latestRun.durationMinutes,
              completedSteps: latestRun.completedSteps,
              totalSteps: latestRun.totalSteps,
              confidence: latestRun.confidence,
              fieldsExtracted: latestRun.fieldsExtracted,
              fieldsTotal: latestRun.fieldsTotal,
            }
          : null,
        versions: versions.map((v: any) => ({
          id: v.id,
          version: v.version,
          description: v.description,
          publishedBy: v.publishedBy,
          createdAt: v.createdAt,
        })),
      };
    }),

  // Get workflow performance
  getPerformance: adminProtectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }: { input: { workflowId: string } }) => {
      const { workflowId } = input;

      // Get run stats
      const [stats] = await db
        .select({
          totalRuns: count(),
          avgDuration: sql<number>`coalesce(avg(${workflowRuns.durationMinutes}), 0)`,
          successCount: sql<number>`count(case when ${workflowRuns.status} = 'completed' then 1 end)`,
        })
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, workflowId));

      const totalRuns = stats?.totalRuns ?? 0;
      const successCount = stats?.successCount ?? 0;
      const successRate =
        totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;

      return {
        successRate,
        avgDuration: stats?.avgDuration
          ? parseFloat(String(stats.avgDuration)).toFixed(1)
          : "0",
        totalRuns,
      };
    }),

  // Get templates
  getTemplates: adminProtectedProcedure.query(async () => {
    const templates = await db
      .select()
      .from(workflowTemplates)
      .orderBy(desc(workflowTemplates.usageCount))
      .limit(10);

    return templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      usageCount: t.usageCount,
    }));
  }),

  // ─── CRUD ──────────────────────────────────────────────────────────────

  /** Create a workflow from the canvas (nodes + edges in one transaction). */
  createWorkflow: adminProtectedProcedure
    .input(workflowInputSchema.omit({ id: true }))
    .mutation(async ({ input, ctx }) => {
      const stats = computeWorkflowStats(input.nodes);
      const [workflow] = await db
        .insert(workflows)
        .values({
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          version: "1.0",
          totalSteps: stats.totalSteps,
          aiAgentCount: stats.aiAgentCount,
          humanStepCount: stats.humanStepCount,
          integrationCount: stats.integrationCount,
          canvasData: input.canvasData ?? null,
          settings: input.settings ?? null,
        })
        .returning();
      if (!workflow) throw new Error("Failed to create workflow");

      await saveNodesAndEdges(workflow.id, input.nodes, input.edges);

      logger.info(
        { workflowId: workflow.id, admin: ctx.adminUser?.id },
        "Workflow created",
      );
      return { id: workflow.id, success: true };
    }),

  /** Update a workflow: rename, change status, or replace the canvas. */
  updateWorkflow: adminProtectedProcedure
    .input(workflowInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (!input.id) throw new Error("Workflow id is required");
      const [existing] = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(eq(workflows.id, input.id))
        .limit(1);
      if (!existing) throw new Error("Workflow not found");

      const stats = computeWorkflowStats(input.nodes);
      const [updated] = await db
        .update(workflows)
        .set({
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          totalSteps: stats.totalSteps,
          aiAgentCount: stats.aiAgentCount,
          humanStepCount: stats.humanStepCount,
          integrationCount: stats.integrationCount,
          canvasData: input.canvasData ?? null,
          settings: input.settings ?? null,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, input.id))
        .returning();
      if (!updated) throw new Error("Failed to update workflow");

      // Replace nodes + edges atomically (canvas save = full round-trip).
      await db
        .delete(workflowEdges)
        .where(eq(workflowEdges.workflowId, input.id));
      await db
        .delete(workflowNodes)
        .where(eq(workflowNodes.workflowId, input.id));
      await saveNodesAndEdges(input.id, input.nodes, input.edges);

      logger.info(
        { workflowId: input.id, admin: ctx.adminUser?.id },
        "Workflow updated",
      );
      return { id: input.id, success: true };
    }),

  /** Publish a workflow — snapshots the canvas as a version and flips status. */
  publishWorkflow: adminProtectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        description: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, input.workflowId))
        .limit(1);
      if (!workflow) throw new Error("Workflow not found");

      // Bump the version: 1.0 → 1.1 → 1.2 …
      const base = (workflow.version ?? "1.0").split(".");
      const major = Number(base[0]) || 1;
      const minor = (Number(base[1]) || 0) + 1;
      const nextVersion = `${major}.${minor}`;

      const [nodes, edges] = await Promise.all([
        db
          .select()
          .from(workflowNodes)
          .where(eq(workflowNodes.workflowId, input.workflowId)),
        db
          .select()
          .from(workflowEdges)
          .where(eq(workflowEdges.workflowId, input.workflowId)),
      ]);

      await db.insert(workflowVersions).values({
        workflowId: input.workflowId,
        version: nextVersion,
        description: input.description ?? "Published from the workflow builder",
        snapshot: {
          canvasData: workflow.canvasData,
          settings: workflow.settings,
          nodes: nodes.map((n) => ({
            id: n.id,
            name: n.name,
            type: n.type,
            stepNumber: n.stepNumber,
            x: n.x ? parseFloat(n.x) : null,
            y: n.y ? parseFloat(n.y) : null,
            config: n.config,
            model: n.model,
            instructions: n.instructions,
            outputSchema: n.outputSchema,
            confidenceThreshold: n.confidenceThreshold,
            triggerType: n.triggerType,
            condition: n.condition,
            trueBranch: n.trueBranch,
            falseBranch: n.falseBranch,
          })),
          edges: edges.map((e) => ({
            source: e.sourceNodeId,
            target: e.targetNodeId,
            label: e.label,
            condition: e.condition,
          })),
        },
        publishedBy: ctx.adminUser?.email ?? "admin",
      });

      await db
        .update(workflows)
        .set({
          version: nextVersion,
          status: "active",
          lastPublishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, input.workflowId));

      logger.info(
        {
          workflowId: input.workflowId,
          version: nextVersion,
          admin: ctx.adminUser?.id,
        },
        "Workflow published",
      );
      return { id: input.workflowId, version: nextVersion, success: true };
    }),

  /** Archive/delete a workflow and its children. */
  deleteWorkflow: adminProtectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(eq(workflows.id, input.workflowId))
        .limit(1);
      if (!existing) throw new Error("Workflow not found");

      // Children first (FK ordering).
      await db
        .delete(workflowEdges)
        .where(eq(workflowEdges.workflowId, input.workflowId));
      await db
        .delete(workflowNodes)
        .where(eq(workflowNodes.workflowId, input.workflowId));
      await db
        .delete(workflowRuns)
        .where(eq(workflowRuns.workflowId, input.workflowId));
      await db
        .delete(workflowVersions)
        .where(eq(workflowVersions.workflowId, input.workflowId));
      await db.delete(workflows).where(eq(workflows.id, input.workflowId));

      logger.info(
        { workflowId: input.workflowId, admin: ctx.adminUser?.id },
        "Workflow deleted",
      );
      return { success: true };
    }),

  // Seed demo data
  seedDemoData: adminProtectedProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(workflowEdges);
    await db.delete(workflowNodes);
    await db.delete(workflowRuns);
    await db.delete(workflowVersions);
    await db.delete(workflowTemplates);
    await db.delete(workflows);

    const now = new Date();

    // Create main workflow
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

    // Create nodes
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

    // Create edges
    const edgesData = [
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[0].id,
        targetNodeId: insertedNodes[1].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[1].id,
        targetNodeId: insertedNodes[2].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[2].id,
        targetNodeId: insertedNodes[3].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[3].id,
        targetNodeId: insertedNodes[4].id,
        label: "No",
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[3].id,
        targetNodeId: insertedNodes[5].id,
        label: "Yes",
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[4].id,
        targetNodeId: insertedNodes[5].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[5].id,
        targetNodeId: insertedNodes[6].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[5].id,
        targetNodeId: insertedNodes[7].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[6].id,
        targetNodeId: insertedNodes[8].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[7].id,
        targetNodeId: insertedNodes[8].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[8].id,
        targetNodeId: insertedNodes[9].id,
      },
      {
        workflowId: mainWorkflow.id,
        sourceNodeId: insertedNodes[9].id,
        targetNodeId: insertedNodes[10].id,
      },
    ];
    await db.insert(workflowEdges).values(edgesData);

    // Create latest run
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

    // Create version
    await db.insert(workflowVersions).values({
      workflowId: mainWorkflow.id,
      version: "1.3",
      description:
        "Added reconciliation agent and improved extraction accuracy.",
      publishedBy: "Famara Touray",
    });

    // Create templates
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

    return { success: true };
  }),
});
