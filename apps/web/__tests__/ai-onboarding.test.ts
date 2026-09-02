/**
 * AI-Native Onboarding Tests
 *
 * Verifies:
 * 1. AiOnboarding component exists with conversational UI
 * 2. Chat bubbles, typing indicator, input field
 * 3. Setup progress with 3 steps
 * 4. Result cards showing what was set up
 * 5. OnboardingWizard uses AiOnboarding (not old wizard steps)
 * 6. Skip and Go to Dashboard buttons exist
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("AI-Native Onboarding", () => {
  // ─── AiOnboarding Component ────────────────────────────────────────
  describe("AiOnboarding component", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("exports AiOnboarding function component", () => {
      expect(component).toContain("export function AiOnboarding");
    });

    it("has conversational chat UI (ChatBubble component)", () => {
      expect(component).toContain("function ChatBubble");
      expect(component).toContain('role: \"ai\"');
      expect(component).toContain('role: \"user\"');
    });

    it("has typing indicator (dots animation)", () => {
      expect(component).toContain("function TypingIndicator");
      expect(component).toContain("animate-bounce");
    });

    it("has text input for user responses", () => {
      expect(component).toContain("placeholder=");
      expect(component).toContain("business name");
    });

    it("has send button", () => {
      expect(component).toContain("Send");
      expect(component).toContain('type="submit"');
    });

    it("has AI avatar (Bot icon)", () => {
      expect(component).toContain("Bot");
    });

    it("has user avatar (User icon)", () => {
      expect(component).toContain("User");
    });
  });

  // ─── Setup Automation ──────────────────────────────────────────────
  describe("Setup automation", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("has SetupProgress component with 3 steps", () => {
      expect(component).toContain("function SetupProgress");
      // Should have Chart of Accounts, Tax Configuration, Entity Setup
      expect(component).toContain("Chart of Accounts");
      expect(component).toContain("Tax Configuration");
      expect(component).toContain("Entity Setup");
    });

    it("calls organization.create mutation", () => {
      expect(component).toContain("organization.create");
    });

    it("calls organization.createEntity mutation", () => {
      expect(component).toContain("organization.createEntity");
    });

    it("calls onboarding.completeFlow mutation", () => {
      expect(component).toContain("onboarding.completeFlow");
    });

    it("sets entity ID after creation", () => {
      expect(component).toContain("setEntityId");
    });
  });

  // ─── Preview & Results ─────────────────────────────────────────────
  describe("Setup preview", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("has SetupResultCards showing what was configured", () => {
      expect(component).toContain("function SetupResultCards");
      expect(component).toContain("Chart of Accounts");
      expect(component).toContain("Tax Rules");
      expect(component).toContain("Entity");
    });

    it("result cards show industry-specific info", () => {
      expect(component).toContain("-optimized accounts");
    });
  });

  // ─── Navigation ────────────────────────────────────────────────────
  describe("Navigation", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("has Go to Dashboard button", () => {
      expect(component).toContain("Go to Dashboard");
    });

    it("has Skip setup link", () => {
      expect(component).toContain("Skip setup");
    });

    it("handles keyboard submit (form onSubmit)", () => {
      expect(component).toContain("onSubmit");
    });
  });

  // ─── OnboardingWizard Integration ──────────────────────────────────
  describe("OnboardingWizard uses AiOnboarding", () => {
    let wizard: string;

    beforeAll(() => {
      wizard = readFile("components/onboarding/onboarding-wizard.tsx");
    });

    it("imports AiOnboarding component", () => {
      expect(wizard).toContain("import { AiOnboarding }");
      expect(wizard).toContain("ai-onboarding");
    });

    it("renders AiOnboarding in the wizard", () => {
      expect(wizard).toContain("<AiOnboarding");
    });

    it("no longer renders old step components (WelcomeStep, CoAStep, etc.)", () => {
      // The wizard should not conditionally render old steps
      expect(wizard).not.toContain('currentStep === "welcome"');
      expect(wizard).not.toContain('currentStep === "chart-of-accounts"');
      expect(wizard).not.toContain('currentStep === "bank-connection"');
    });

    it("wizard dialog is full-height (not card-based)", () => {
      expect(wizard).toContain("h-[90vh]");
    });

    it("wizard uses isLoaded guard", () => {
      expect(wizard).toContain("isLoaded");
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────
  describe("Accessibility", () => {
    let component: string;

    beforeAll(() => {
      component = readFile("components/onboarding/ai-onboarding.tsx");
    });

    it("input has placeholder text", () => {
      expect(component).toContain("placeholder=");
    });

    it("send button has icon (not just color)", () => {
      expect(component).toContain("Send");
    });

    it("messages end ref for scroll", () => {
      expect(component).toContain("messagesEndRef");
    });
  });
});
