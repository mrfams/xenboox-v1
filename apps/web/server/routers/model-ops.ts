import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  modelAssignments,
  modelRegistry,
  modelEvaluations,
  modelCostTracking,
} from "@xenboox/db/schema";
import {
  invalidateAssignment,
  runGate1,
  runGate3,
  runGate4,
  rollbackModel,
} from "@xenboox/agents";

import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  adminProcedure,
} from "@/lib/trpc/server";

// ─── Schemas ────────────────────────────────────

const ProviderIdEnum = z.enum([
  "anthropic",
  "bedrock",
  "vertex",
  "openai",
  "fireworks",
  "together",
  "deepinfra",
  "openrouter",
]);

const TaskTypeEnum = z.enum([
  "strategic_planning",
  "financial_analysis",
  "executive_summary",
  "risk_assessment",
  "approval_decision",
  "cash_flow_forecast",
  "payroll_calculation",
  "compliance_check",
  "reconciliation_review",
  "invoice_matching",
  "payment_scheduling",
  "journal_posting",
  "cash_reconciliation",
  "tax_calculation",
  "filing_preparation",
  "report_generation",
  "ocr_field_extraction",
  "document_classification",
  "structured_extraction",
  "budget_variance_analysis",
  "anomaly_detection",
  "chat_response",
  "summarization",
  "translation",
]);

// ─── Model Registry ─────────────────────────────

export const modelOpsRouter = router({
  // ─── List all registered models ──────────────────
  listModels: rlsProtectedProcedure.query(async () => {
    return db.query.modelRegistry.findMany({
      orderBy: [desc(modelRegistry.createdAt)],
    });
  }),

  // ─── Register a new model ────────────────────────
  registerModel: adminProcedure
    .input(
      z.object({
        modelId: z.string().min(1),
        displayName: z.string().min(1),
        provider: ProviderIdEnum,
        capabilities: z.object({
          supportsTools: z.boolean(),
          supportsVision: z.boolean(),
          supportsStreaming: z.boolean(),
          maxContextTokens: z.number(),
          maxOutputTokens: z.number(),
        }),
        costPerMillionInputTokens: z.string(),
        costPerMillionOutputTokens: z.string(),
        endpoints: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input }) => {
      await db.insert(modelRegistry).values({
        modelId: input.modelId,
        displayName: input.displayName,
        provider: input.provider,
        capabilities: input.capabilities,
        costPerMillionInputTokens: input.costPerMillionInputTokens,
        costPerMillionOutputTokens: input.costPerMillionOutputTokens,
        endpoints: input.endpoints,
        isActive: true,
        isDeprecated: false,
      });
      return { success: true };
    }),

  // ─── Update a model ──────────────────────────────
  updateModel: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        displayName: z.string().optional(),
        capabilities: z
          .object({
            supportsTools: z.boolean(),
            supportsVision: z.boolean(),
            supportsStreaming: z.boolean(),
            maxContextTokens: z.number(),
            maxOutputTokens: z.number(),
          })
          .optional(),
        costPerMillionInputTokens: z.string().optional(),
        costPerMillionOutputTokens: z.string().optional(),
        isActive: z.boolean().optional(),
        isDeprecated: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const update: Record<string, unknown> = {};
      if (input.displayName !== undefined)
        update.displayName = input.displayName;
      if (input.capabilities !== undefined)
        update.capabilities = input.capabilities;
      if (input.costPerMillionInputTokens !== undefined)
        update.costPerMillionInputTokens = input.costPerMillionInputTokens;
      if (input.costPerMillionOutputTokens !== undefined)
        update.costPerMillionOutputTokens = input.costPerMillionOutputTokens;
      if (input.isActive !== undefined) update.isActive = input.isActive;
      if (input.isDeprecated !== undefined)
        update.isDeprecated = input.isDeprecated;
      await db
        .update(modelRegistry)
        .set(update)
        .where(eq(modelRegistry.id, input.id));
      return { success: true };
    }),

  // ─── Model Assignments ───────────────────────────

  listAssignments: rlsProtectedProcedure.query(async () => {
    return db.query.modelAssignments.findMany({
      orderBy: [desc(modelAssignments.updatedAt)],
    });
  }),

  getAssignment: rlsProtectedProcedure
    .input(z.object({ agentName: z.string(), taskType: TaskTypeEnum }))
    .query(async ({ input }) => {
      return db.query.modelAssignments.findFirst({
        where: and(
          eq(modelAssignments.agentName, input.agentName),
          eq(modelAssignments.taskType, input.taskType),
        ),
      });
    }),

  createAssignment: adminProcedure
    .input(
      z.object({
        agentName: z.string().min(1),
        taskType: TaskTypeEnum,
        liveModelId: z.string().min(1),
        liveProvider: ProviderIdEnum,
        fallbackModelId: z.string().optional().nullable(),
        fallbackProvider: ProviderIdEnum.optional().nullable(),
        trafficSplit: z.record(z.number()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [assignment] = await db
        .insert(modelAssignments)
        .values({
          agentName: input.agentName,
          taskType: input.taskType,
          liveModelId: input.liveModelId,
          liveProvider: input.liveProvider,
          fallbackModelId: input.fallbackModelId ?? null,
          fallbackProvider: input.fallbackProvider ?? null,
          trafficSplit: input.trafficSplit ?? {},
          isActive: true,
          evaluationGate: "none",
          createdBy: ctx.session!.user!.id!,
        })
        .returning();
      invalidateAssignment(input.agentName, input.taskType);
      return assignment;
    }),

  updateAssignment: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        liveModelId: z.string().optional(),
        liveProvider: ProviderIdEnum.optional(),
        fallbackModelId: z.string().optional().nullable(),
        fallbackProvider: ProviderIdEnum.optional().nullable(),
        trafficSplit: z.record(z.number()).optional(),
        isActive: z.boolean().optional(),
        evaluationGate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const update: Record<string, unknown> = {};
      if (input.liveModelId !== undefined)
        update.liveModelId = input.liveModelId;
      if (input.liveProvider !== undefined)
        update.liveProvider = input.liveProvider;
      if (input.fallbackModelId !== undefined)
        update.fallbackModelId = input.fallbackModelId;
      if (input.fallbackProvider !== undefined)
        update.fallbackProvider = input.fallbackProvider;
      if (input.trafficSplit !== undefined)
        update.trafficSplit = input.trafficSplit;
      if (input.isActive !== undefined) update.isActive = input.isActive;
      if (input.evaluationGate !== undefined)
        update.evaluationGate = input.evaluationGate;

      const assignment = await db.query.modelAssignments.findFirst({
        where: eq(modelAssignments.id, input.id),
      });
      if (assignment) {
        invalidateAssignment(assignment.agentName, assignment.taskType);
      }

      await db
        .update(modelAssignments)
        .set(update)
        .where(eq(modelAssignments.id, input.id));
      return { success: true };
    }),

  // ─── Evaluation Pipeline ─────────────────────────

  listEvaluations: rlsProtectedProcedure.query(async () => {
    return db.query.modelEvaluations.findMany({
      orderBy: [desc(modelEvaluations.createdAt)],
      limit: 50,
    });
  }),

  triggerGate1: adminProcedure
    .input(
      z.object({
        candidateModelId: z.string(),
        candidateProvider: ProviderIdEnum,
        agentName: z.string(),
        taskType: TaskTypeEnum,
      }),
    )
    .mutation(async ({ input }) => {
      const result = await runGate1({
        candidateModelId: input.candidateModelId,
        candidateProvider: input.candidateProvider,
        agentName: input.agentName,
        taskType: input.taskType,
      });
      return result;
    }),

  triggerGate3: adminProcedure
    .input(
      z.object({
        candidateModelId: z.string(),
        candidateProvider: ProviderIdEnum,
        agentName: z.string(),
        taskType: TaskTypeEnum,
        trafficPercent: z.number().min(1).max(50).default(5),
      }),
    )
    .mutation(async ({ input }) => {
      return runGate3({
        candidateModelId: input.candidateModelId,
        candidateProvider: input.candidateProvider,
        agentName: input.agentName,
        taskType: input.taskType,
        trafficPercent: input.trafficPercent,
      });
    }),

  triggerGate4: adminProcedure
    .input(
      z.object({
        candidateModelId: z.string(),
        candidateProvider: ProviderIdEnum,
        agentName: z.string(),
        taskType: TaskTypeEnum,
      }),
    )
    .mutation(async ({ input }) => {
      await runGate4({
        candidateModelId: input.candidateModelId,
        candidateProvider: input.candidateProvider,
        agentName: input.agentName,
        taskType: input.taskType,
      });
      invalidateAssignment(input.agentName, input.taskType);
      return { success: true };
    }),

  rollback: adminProcedure
    .input(
      z.object({
        agentName: z.string(),
        taskType: TaskTypeEnum,
      }),
    )
    .mutation(async ({ input }) => {
      await rollbackModel({
        agentName: input.agentName,
        taskType: input.taskType,
      });
      invalidateAssignment(input.agentName, input.taskType);
      return { success: true };
    }),

  // ─── Cost Tracking ───────────────────────────────

  listCostTracking: rlsProtectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid().optional(),
        agentName: z.string().optional(),
        limit: z.number().default(100),
      }),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.entityId)
        conditions.push(eq(modelCostTracking.entityId, input.entityId));
      if (input.agentName)
        conditions.push(eq(modelCostTracking.agentName, input.agentName));
      return db.query.modelCostTracking.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(modelCostTracking.date)],
        limit: input.limit,
      });
    }),
});
