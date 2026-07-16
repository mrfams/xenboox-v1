import { REPORTING_SYSTEM_PROMPT } from "../../core/prompts"

export interface ReportingEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
  fiscalYearEnd: string
}

export function buildReportingSystemPrompt(ctx: ReportingEntityContext): string {
  return REPORTING_SYSTEM_PROMPT
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
    .replace(/\{\{FISCAL_YEAR_END\}\}/g, ctx.fiscalYearEnd)
}
