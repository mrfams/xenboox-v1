import { CFO_SYSTEM_PROMPT } from "../../core/prompts"

export interface CfoEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
  fiscalYearEnd: string
  orgType: string
  timezone: string
  lastCloseDate: string
}

export function buildCfoSystemPrompt(ctx: CfoEntityContext): string {
  return CFO_SYSTEM_PROMPT
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
    .replace(/\{\{FISCAL_YEAR_END\}\}/g, ctx.fiscalYearEnd)
    .replace(/\{\{ORG_TYPE\}\}/g, ctx.orgType)
    .replace(/\{\{TIMEZONE\}\}/g, ctx.timezone)
    .replace(/\{\{LAST_CLOSE_DATE\}\}/g, ctx.lastCloseDate)
}
