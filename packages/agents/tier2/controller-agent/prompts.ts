import { CONTROLLER_SYSTEM_PROMPT } from "../../core/prompts"

export interface ControllerEntityContext {
  entityName: string
  entityId: string
  currency: string
  currentPeriod: string
  fiscalYearEnd: string
  coaVersion: string
  periodsStatus: string
}

export function buildControllerSystemPrompt(ctx: ControllerEntityContext): string {
  return CONTROLLER_SYSTEM_PROMPT
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
    .replace(/\{\{FISCAL_YEAR_END\}\}/g, ctx.fiscalYearEnd)
    .replace(/\{\{COA_VERSION\}\}/g, ctx.coaVersion)
    .replace(/\{\{PERIODS_STATUS\}\}/g, ctx.periodsStatus)
}
