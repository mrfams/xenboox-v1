import { LEDGER_SYSTEM_PROMPT } from "../../core/prompts"

export interface LedgerEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
  coaSize: number
}

export function buildLedgerSystemPrompt(ctx: LedgerEntityContext): string {
  return LEDGER_SYSTEM_PROMPT.replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
    .replace(/\{\{COA_SIZE\}\}/g, String(ctx.coaSize))
}
