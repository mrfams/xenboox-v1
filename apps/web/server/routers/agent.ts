import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
} from "@/lib/trpc/server";
import {
  processChatInput,
  seedDefaultThresholds,
  runCFOPipeline,
  createInputEvent,
} from "@xenboox/agents/core/pipeline";
import type { AgentTaskType } from "@xenboox/agents/core/orchestrator";
import { getRateLimiter } from "@/lib/security/rate-limiter";

const agentTaskTypeSchema = z.enum([
  "chat",
  "question",
  "close_trigger",
  "review_entry",
  "trial_balance",
  "close_checklist",
  "cash_position",
  "reconciliation",
  "daily_report",
  "process_payroll",
  "tax_review",
  "filing_status",
  "process_ap_invoice",
  "ap_aging",
  "ar_aging",
  "overdue_alerts",
  "match_payment",
  "depreciation",
  "asset_register",
  "cogs",
  "inventory_summary",
  "report",
  "narrative",
]);

export const agentRouter = router({
  chat: rlsProtectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(10000),
        entityName: z.string().default("Organization"),
        currency: z.string().default("GMD"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const rl = getRateLimiter();
        const { success } = await rl.checkAgentRateLimit(
          ctx.session!.user!.id!,
        );
        if (!success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Rate limit exceeded. Maximum 10 agent requests per minute.",
          });
        }

        // Seed default thresholds (safe, idempotent)
        seedDefaultThresholds().catch((e) =>
          console.warn("[agent] Failed to seed confidence thresholds:", e),
        );

        // Use the full CFO Agent Pipeline
        const result = await processChatInput({
          userId: ctx.session!.user!.id!,
          orgId: ctx.entityId!,
          entityId: ctx.entityId!,
          entityName: input.entityName,
          currency: input.currency,
          message: input.message,
          channel: "web_chat",
        });

        return {
          response: result.response,
          agentId: result.agentId,
          confidence: result.confidence,
          errors: result.errors,
          decision: result.decision,
          escalationItems: result.escalationItems,
        };
      } catch (error) {
        handleMutationError(error, "Agent processing failed");
      }
    }),

  invoke: rlsProtectedProcedure
    .input(
      z.object({
        taskType: agentTaskTypeSchema,
        input: z.record(z.unknown()).default({}),
        entityName: z.string().default("Organization"),
        currency: z.string().default("GMD"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const rl = getRateLimiter();
        const { success } = await rl.checkAgentRateLimit(
          ctx.session!.user!.id!,
        );
        if (!success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Rate limit exceeded. Maximum 10 agent requests per minute.",
          });
        }

        // Use the full CFO Agent Pipeline for invoke as well
        const event = createInputEvent({
          channel: "web_chat",
          userId: ctx.session!.user!.id!,
          orgId: ctx.entityId!,
          entityId: ctx.entityId!,
          entityName: input.entityName,
          currency: input.currency,
          rawContent: JSON.stringify(input.input),
        });

        const pipelineResult = await runCFOPipeline(event);

        return {
          agentId: pipelineResult.auditEntry.agentId,
          confidence:
            pipelineResult.summaries.reduce((sum, s) => sum + s.confidence, 0) /
            Math.max(pipelineResult.summaries.length, 1),
          reasoning: pipelineResult.response,
          result: pipelineResult.summaries,
          humanResponse: pipelineResult.response,
          errors: pipelineResult.summaries.flatMap((s) =>
            s.escalations.map((e) => e.description),
          ),
          decision: pipelineResult.decision.action,
          duration: pipelineResult.durationMs,
        };
      } catch (error) {
        handleMutationError(error, "Agent invocation failed");
      }
    }),

  status: rlsProtectedProcedure.query(async ({ ctx }) => {
    // In production, this should query the agent registry for deployed/available agents
    // Currently returns the full list of defined agents as a static fallback
    const agentsAvailable = [
      "cfo",
      "controller",
      "treasury",
      "payroll_manager",
      "compliance",
      "ledger",
      "ap",
      "ar",
      "asset",
      "inventory",
      "reporting",
    ];

    return {
      entityId: ctx.entityId,
      agentsAvailable,
      version: "0.1.0",
    };
  }),
});
