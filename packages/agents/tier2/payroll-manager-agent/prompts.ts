import { PAYROLL_MANAGER_SYSTEM_PROMPT } from "../../core/prompts"

export interface PayrollManagerEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
}

export function buildPayrollManagerSystemPrompt(ctx: PayrollManagerEntityContext): string {
  return PAYROLL_MANAGER_SYSTEM_PROMPT
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
}
