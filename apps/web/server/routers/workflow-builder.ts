import { z } from "zod";
import { router, adminProcedure } from "@/lib/trpc/server";
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

export const workflowBuilderRouter = router({
  // Get workflow list
  getWorkflows: adminProcedure.query(async () => {
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
  getWorkflowDetail: adminProcedure
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
  getPerformance: adminProcedure
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
  getTemplates: adminProcedure.query(async () => {
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

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
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
