import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { orchestrate, classifyUserMessage } from "@xenboox/agents/core/orchestrator"
import type { AgentTaskType, AgentResult } from "@xenboox/agents/core/orchestrator"

const agentTaskTypeSchema = z.enum([
  "chat", "question", "close_trigger",
  "review_entry", "trial_balance", "close_checklist",
  "cash_position", "reconciliation", "daily_report",
  "process_payroll", "tax_review", "filing_status",
  "process_ap_invoice", "ap_aging",
  "ar_aging", "overdue_alerts", "match_payment",
  "depreciation", "asset_register",
  "cogs", "inventory_summary",
  "report", "narrative",
])

export const agentRouter = router({
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(10000),
      entityName: z.string().default("Organization"),
      currency: z.string().default("GMD"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const taskType = classifyUserMessage(input.message)

        const result = await orchestrate({
          taskType,
          entityId: ctx.entityId!,
          entityName: input.entityName,
          currency: input.currency,
          input: { description: input.message },
        })

        return {
          taskId: result.taskId,
          response: result.humanResponse ?? result.reasoning,
          agentId: result.agentId,
          confidence: result.confidence,
          errors: result.errors,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Agent processing failed" })
      }
    }),

  invoke: protectedProcedure
    .input(z.object({
      taskType: agentTaskTypeSchema,
      input: z.record(z.unknown()).default({}),
      entityName: z.string().default("Organization"),
      currency: z.string().default("GMD"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await orchestrate({
          taskType: input.taskType as AgentTaskType,
          entityId: ctx.entityId!,
          entityName: input.entityName,
          currency: input.currency,
          input: input.input,
        })

        return {
          taskId: result.taskId,
          agentId: result.agentId,
          tier: result.tier,
          confidence: result.confidence,
          reasoning: result.reasoning,
          result: result.result,
          humanResponse: result.humanResponse,
          errors: result.errors,
          duration: result.duration,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Agent invocation failed" })
      }
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    // In production, this should query the agent registry for deployed/available agents
    // Currently returns the full list of defined agents as a static fallback
    const agentsAvailable = [
      "cfo", "controller", "treasury", "payroll_manager", "compliance",
      "ledger", "ap", "ar", "asset", "inventory", "reporting",
    ]

    return {
      entityId: ctx.entityId,
      agentsAvailable,
      version: "0.1.0",
    }
  }),
})
