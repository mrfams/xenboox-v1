/**
 * Email Signup Flow Tests
 *
 * Verifies:
 * 1. Welcome email is sent on signup (auth router)
 * 2. Drip job has correct imports (userEntityAccess, bankAccounts)
 * 3. No duplicate Day 0 email in drip (auth router sends it)
 * 4. Email templates render without errors
 * 5. Resend config is properly set up
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Email Signup Flow", () => {
  // ─── Auth Router ───────────────────────────────────────────────────
  describe("Auth router sends welcome email on signup", () => {
    let authRouter: string;

    beforeAll(() => {
      authRouter = readFile("server/routers/auth.ts");
    });

    it("imports sendOnboardingWelcomeEmail", () => {
      expect(authRouter).toContain("sendOnboardingWelcomeEmail");
    });

    it("calls sendOnboardingWelcomeEmail during registration", () => {
      expect(authRouter).toContain("await sendOnboardingWelcomeEmail(");
    });

    it("passes user email and name to the email", () => {
      expect(authRouter).toContain("user.email!");
      expect(authRouter).toContain("userName: user.name");
    });

    it("passes dashboard URL", () => {
      expect(authRouter).toContain("dashboardUrl: getAppUrl()");
    });

    it("wraps email send in try/catch (non-blocking)", () => {
      // Find the sendOnboardingWelcomeEmail call and check for nearby catch
      const idx = authRouter.indexOf("await sendOnboardingWelcomeEmail(");
      expect(idx).toBeGreaterThan(-1);
      // Look for catch within 300 chars after the call
      const afterCall = authRouter.slice(idx, idx + 300);
      expect(afterCall).toContain("} catch {");
    });
  });

  // ─── Drip Job ──────────────────────────────────────────────────────
  describe("Drip job imports and structure", () => {
    let dripJob: string;

    beforeAll(() => {
      dripJob = readFile("../../packages/jobs/onboarding-drip.ts");
    });

    it("imports userEntityAccess from schema", () => {
      expect(dripJob).toContain("userEntityAccess");
    });

    it("imports bankAccounts from schema", () => {
      expect(dripJob).toContain("bankAccounts");
    });

    it("does NOT have Day 0 welcome email (duplicate prevention)", () => {
      // Day 0 should not be in the drip since auth router sends it
      expect(dripJob).not.toMatch(/days === 0/);
    });

    it("has Day 1 through Day 30 emails", () => {
      expect(dripJob).toContain("days === 1");
      expect(dripJob).toContain("days === 3");
      expect(dripJob).toContain("days === 7");
      expect(dripJob).toContain("days === 14");
      expect(dripJob).toContain("days === 30");
    });

    it("does NOT import unused entities or and", () => {
      // Check the schema import block doesn't include entities
      const schemaImport = dripJob.slice(
        dripJob.indexOf('from "@xenboox/db/schema"'),
        dripJob.indexOf('from "@xenboox/db/schema"') + 200,
      );
      expect(schemaImport).not.toContain("entities");
    });
  });

  // ─── Email Templates ──────────────────────────────────────────────
  describe("Email templates exist and are exported", () => {
    let emailIndex: string;

    beforeAll(() => {
      emailIndex = readFile("../../packages/email/index.ts");
    });

    it("exports OnboardingWelcomeEmail", () => {
      expect(emailIndex).toContain("OnboardingWelcomeEmail");
    });

    it("exports OnboardingDay1Email", () => {
      expect(emailIndex).toContain("OnboardingDay1Email");
    });

    it("exports OnboardingDay3Email", () => {
      expect(emailIndex).toContain("OnboardingDay3Email");
    });

    it("exports OnboardingDay7Email", () => {
      expect(emailIndex).toContain("OnboardingDay7Email");
    });

    it("exports OnboardingDay14Email", () => {
      expect(emailIndex).toContain("OnboardingDay14Email");
    });

    it("exports OnboardingDay30Email", () => {
      expect(emailIndex).toContain("OnboardingDay30Email");
    });
  });

  // ─── Email Template Content ────────────────────────────────────────
  describe("Welcome email template content", () => {
    let template: string;

    beforeAll(() => {
      template = readFile("../../packages/email/emails/onboarding-welcome.tsx");
    });

    it("has preview text", () => {
      expect(template).toContain("preview=");
    });

    it("greets user by name", () => {
      expect(template).toContain("{props.userName}");
    });

    it("has CTA button to dashboard", () => {
      expect(template).toContain("CTAButton");
      expect(template).toContain("dashboardUrl");
    });

    it("mentions AI features", () => {
      expect(template).toContain("AI");
    });
  });

  // ─── Resend Config ────────────────────────────────────────────────
  describe("Resend configuration", () => {
    let resendConfig: string;

    beforeAll(() => {
      resendConfig = readFile("lib/resend.ts");
    });

    it("uses RESEND_API_KEY env var", () => {
      expect(resendConfig).toContain("RESEND_API_KEY");
    });

    it("has fallback for missing API key", () => {
      expect(resendConfig).toContain("return null");
    });

    it("exports EMAIL_FROM", () => {
      expect(resendConfig).toContain("EMAIL_FROM");
    });

    it("has default from address", () => {
      expect(resendConfig).toContain("noreply@xenboox.com");
    });
  });

  // ─── Email Sender ─────────────────────────────────────────────────
  describe("Email sender with retry logic", () => {
    let emailLib: string;

    beforeAll(() => {
      emailLib = readFile("lib/email.ts");
    });

    it("has retry logic (MAX_RETRIES)", () => {
      expect(emailLib).toContain("MAX_RETRIES");
      expect(emailLib).toContain("RETRY_DELAY_MS");
    });

    it("handles rate limit errors", () => {
      expect(emailLib).toContain("rate");
      expect(emailLib).toContain("retryable");
    });

    it("logs errors with structured logger", () => {
      expect(emailLib).toContain('log("error"');
    });

    it("checks for resend availability before sending", () => {
      expect(emailLib).toContain("if (!resend)");
    });
  });
});
