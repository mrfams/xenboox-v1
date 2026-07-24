import { z } from "zod";
import { router, publicProcedure } from "@/lib/trpc/server";
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
import { notificationsRouter } from "./notifications";
import { integrationsRouter } from "./integrations";
import { modelOpsRouter } from "./model-ops";
import { auditRouter } from "./audit";
import { ingestionRouter } from "./ingestion";
import { approvalsRouter } from "./approvals";
import { onboardingRouter } from "./onboarding";
import { taxComplianceRouter } from "./tax-compliance";
import { auditPipelineRouter } from "./audit-pipeline";
import { expenseRouter } from "./expense";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),

  auth: authRouter,
  admin: adminRouter,
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
  auditPipeline: auditPipelineRouter,
  expense: expenseRouter,
});

export type AppRouter = typeof appRouter;
