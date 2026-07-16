import { AP_SYSTEM_PROMPT } from "../../core/prompts"

export interface ApEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
}

export function buildApSystemPrompt(ctx: ApEntityContext): string {
  return AP_SYSTEM_PROMPT
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
}
