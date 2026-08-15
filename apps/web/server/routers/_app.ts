import { z } from "zod";

import { organizationRouter } from "./organization";
import { coaRouter } from "./coa";
import { fiscalRouter } from "./fiscal";
import { journalRouter } from "./journal";
import { apRouter } from "./ap";
import { arRouter } from "./ar";
import { treasuryRouter } from "./treasury";
import { cashRouter } from "./cash";
import { mobileMoneyRouter } from "./mobileMoney";
import { documentRouter } from "./document";
import { agentRouter } from "./agent";
import { chatRouter } from "./chat";
import { authRouter } from "./auth";
import { reportsRouter } from "./reports";
import { payrollRouter } from "./payroll";
import { fixedAssetsRouter } from "./fixedAssets";
import { inventoryRouter } from "./inventory";
import { adminRouter } from "./admin";
import { adminAccessRouter } from "./admin-access";
import { notificationsRouter } from "./notifications";
import { integrationsRouter } from "./integrations";
import { modelOpsRouter } from "./model-ops";
import { auditRouter } from "./audit";
import { ingestionRouter } from "./ingestion";
import { approvalsRouter } from "./approvals";
import { onboardingRouter } from "./onboarding";
import { taxComplianceRouter } from "./tax-compliance";
import { taxConfigRouter } from "./tax-config";
import { estimatesRouter } from "./estimates";
import { auditPipelineRouter } from "./audit-pipeline";
import { analyticsRouter } from "./analytics";
import { expenseRouter } from "./expense";
import { assetPipelineRouter } from "./asset-pipeline";
import { budgetRouter } from "./budget";
import { inventoryPipelineRouter } from "./inventory-pipeline";
import { consolidationRouter } from "./consolidation";
import { firmRouter } from "./firm";
import { jurisdictionRouter } from "./jurisdiction";
import { apiPlatformRouter } from "./api-platform";
import { brandingRouter } from "./branding";
import { benchmarkingRouter } from "./benchmarking";
import { permissionsAdminRouter } from "./permissions-admin";
import { complianceLivenessRouter } from "./compliance-liveness";
import { cfoLivenessRouter } from "./cfo-liveness";
import { invitationsRouter } from "./invitations";
import { dashboardRouter } from "./dashboard";
import { aiWorkspaceRouter } from "./ai-workspace";
import { inboxRouter } from "./inbox";
import { transactionsRouter } from "./transactions";
import { bankingRouter } from "./banking";
import { invoicingRouter } from "./invoicing";
import { customersRouter } from "./customers";
import { chartOfAccountsRouter } from "./chart-of-accounts";
import { billsRouter } from "./bills";
import { reconciliationRouter } from "./reconciliation";
import { expensesRouter } from "./expenses";
import { closeCenterRouter } from "./close-center";
import { opsConsoleRouter } from "./ops-console";
import { agentMonitorRouter } from "./agent-monitor";
import { liveRunsRouter } from "./live-runs";
import { llmRouter } from "./llm-router";
import { costAnalyticsRouter } from "./cost-analytics";
import { tokenUsageRouter } from "./token-usage";
import { promptLibraryRouter } from "./prompt-library";
import { reviewQueueRouter } from "./review-queue";
import { customerDiagnosticsRouter } from "./customer-diagnostics";
import { infrastructureRouter } from "./infrastructure";
import { logsTracesRouter } from "./logs-traces";
import { featureFlagsRouter } from "./feature-flags";
import { companyBrainRouter } from "./company-brain";
import { automationStudioRouter } from "./automation-studio";
import { settingsRouter } from "./settings";
import { artifactRouter } from "./artifact";
import { ssoRouter } from "./sso";
import { currencyRouter } from "./currency";

import { router, publicProcedure } from "@/lib/trpc/server";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),

  auth: authRouter,
  admin: adminRouter,
  adminAccess: adminAccessRouter,
  organization: organizationRouter,
  coa: coaRouter,
  fiscal: fiscalRouter,
  journal: journalRouter,
  ap: apRouter,
  ar: arRouter,
  treasury: treasuryRouter,
  cash: cashRouter,
  mobileMoney: mobileMoneyRouter,
  document: documentRouter,
  agent: agentRouter,
  chat: chatRouter,
  reports: reportsRouter,
  payroll: payrollRouter,
  fixedAssets: fixedAssetsRouter,
  inventory: inventoryRouter,
  notifications: notificationsRouter,
  integrations: integrationsRouter,
  modelOps: modelOpsRouter,
  audit: auditRouter,
  ingestion: ingestionRouter,
  approvals: approvalsRouter,
  onboarding: onboardingRouter,
  taxCompliance: taxComplianceRouter,
  taxConfig: taxConfigRouter,
  estimates: estimatesRouter,
  complianceLiveness: complianceLivenessRouter,
  cfoLiveness: cfoLivenessRouter,
  auditPipeline: auditPipelineRouter,
  expense: expenseRouter,
  analytics: analyticsRouter,
  assetPipeline: assetPipelineRouter,
  budget: budgetRouter,
  inventoryPipeline: inventoryPipelineRouter,
  consolidation: consolidationRouter,
  firm: firmRouter,
  jurisdiction: jurisdictionRouter,
  apiPlatform: apiPlatformRouter,
  branding: brandingRouter,
  benchmarking: benchmarkingRouter,
  permissionsAdmin: permissionsAdminRouter,
  invitations: invitationsRouter,
  dashboard: dashboardRouter,
  aiWorkspace: aiWorkspaceRouter,
  inbox: inboxRouter,
  transactions: transactionsRouter,
  banking: bankingRouter,
  invoicing: invoicingRouter,
  customers: customersRouter,
  chartOfAccounts: chartOfAccountsRouter,
  bills: billsRouter,
  reconciliation: reconciliationRouter,
  expenses: expensesRouter,
  closeCenter: closeCenterRouter,
  opsConsole: opsConsoleRouter,
  agentMonitor: agentMonitorRouter,
  liveRuns: liveRunsRouter,
  llmRouter: llmRouter,
  costAnalytics: costAnalyticsRouter,
  tokenUsage: tokenUsageRouter,
  promptLibrary: promptLibraryRouter,
  reviewQueue: reviewQueueRouter,
  customerDiagnostics: customerDiagnosticsRouter,
  infrastructure: infrastructureRouter,
  logsTraces: logsTracesRouter,
  featureFlags: featureFlagsRouter,
  companyBrain: companyBrainRouter,
  automationStudio: automationStudioRouter,
  settings: settingsRouter,
  artifact: artifactRouter,
  sso: ssoRouter,
  currency: currencyRouter,
});

export type AppRouter = typeof appRouter;
