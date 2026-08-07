export { reportingAgent } from "./reporting-agent/graph";
export { ReportingState } from "./reporting-agent/state";
export type {
  ReportingStateType,
  ProfitAndLoss,
  BalanceSheet,
  TrialBalance,
  CashFlow,
  CashFlowLine,
  BudgetVsActual,
  BudgetVsActualLine,
  Narrative,
} from "./reporting-agent/state";
export { buildReportingSystemPrompt } from "./reporting-agent/prompts";
export {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
  generateCashFlow,
  generateBudgetVsActual,
  generateNarrative,
} from "./reporting-agent/tools";

export { documentAgent } from "./document-agent/graph";
export { DocumentState } from "./document-agent/state";
export type { DocumentStateType } from "./document-agent/state";
export { buildDocumentSystemPrompt } from "./document-agent/prompts";
export {
  ingestDocument,
  extractDocumentText,
  classifyDocumentAgent as classifyDocument,
  extractStructuredDataAgent as extractStructuredData,
  linkToTransaction,
} from "./document-agent/tools";

export { budgetAgent } from "./budget-agent/graph";
export { BudgetState } from "./budget-agent/state";
export type {
  BudgetStateType,
  BudgetItem,
  BudgetSummary,
} from "./budget-agent/state";
export { budgetSystemPromptV1 } from "./budget-agent/prompts";
export {
  getVarianceAnalysis,
  getBudgetVsActual,
  getBudgetAccounts,
} from "./budget-agent/tools";

export { analyticsAgent } from "./analytics-agent/graph";
export { AnalyticsState } from "./analytics-agent/state";
export type {
  AnalyticsStateType,
  FinancialRatio,
  AnalyticsSummary,
} from "./analytics-agent/state";
export { analyticsSystemPromptV1 } from "./analytics-agent/prompts";
export {
  getFinancialRatios,
  getKpiDashboard,
  getTrendAnalysis,
  getCashFlowAnalysis,
} from "./analytics-agent/tools";
