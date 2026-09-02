import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const POLICIES_DIR = join(process.cwd(), "../../docs/policies");

describe("SOC 2 Type II Policy Documentation", () => {
  describe("Policy files exist", () => {
    const requiredPolicies = [
      {
        file: "information-security-policy.md",
        name: "Information Security Policy",
      },
      { file: "acceptable-use-policy.md", name: "Acceptable Use Policy" },
      { file: "business-continuity-plan.md", name: "Business Continuity Plan" },
      { file: "change-management-policy.md", name: "Change Management Policy" },
      {
        file: "data-classification-policy.md",
        name: "Data Classification and Handling Policy",
      },
    ];

    for (const policy of requiredPolicies) {
      it(`has ${policy.name} (${policy.file})`, () => {
        const filePath = join(POLICIES_DIR, policy.file);
        expect(existsSync(filePath)).toBe(true);

        const content = readFileSync(filePath, "utf-8");
        expect(content.length).toBeGreaterThan(500);
      });
    }

    it("has all policy files in docs/policies/", () => {
      const files = readdirSync(POLICIES_DIR).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Information Security Policy content", () => {
    const content = readFileSync(
      join(POLICIES_DIR, "information-security-policy.md"),
      "utf-8",
    );

    it("covers access control (CC6.1)", () => {
      expect(content.toLowerCase()).toContain("access control");
    });

    it("covers authentication (CC6.2)", () => {
      expect(content.toLowerCase()).toContain("authentication");
    });

    it("covers encryption (CC6.7)", () => {
      expect(content.toLowerCase()).toContain("encryption");
    });

    it("covers incident management (CC7.2)", () => {
      expect(content.toLowerCase()).toContain("incident");
    });

    it("covers monitoring and logging (CC7.1)", () => {
      expect(content.toLowerCase()).toContain("monitoring");
    });

    it("covers third-party risk (vendor management)", () => {
      expect(content.toLowerCase()).toContain("third-party");
    });

    it("has approval signature block", () => {
      expect(content).toContain("Approved by");
    });
  });

  describe("Business Continuity Plan content", () => {
    const content = readFileSync(
      join(POLICIES_DIR, "business-continuity-plan.md"),
      "utf-8",
    );

    it("defines RTO and RPO targets", () => {
      expect(content.toLowerCase()).toContain("rto");
      expect(content.toLowerCase()).toContain("rpo");
    });

    it("lists critical systems", () => {
      expect(content.toLowerCase()).toContain("neon");
      expect(content.toLowerCase()).toContain("vercel");
    });

    it("defines escalation path", () => {
      expect(content.toLowerCase()).toContain("escalation");
    });

    it("defines communication plan", () => {
      expect(content.toLowerCase()).toContain("communication");
    });

    it("defines disaster recovery drills", () => {
      expect(content.toLowerCase()).toContain("drill");
    });
  });

  describe("Change Management Policy content", () => {
    const content = readFileSync(
      join(POLICIES_DIR, "change-management-policy.md"),
      "utf-8",
    );

    it("defines change categories", () => {
      expect(content.toLowerCase()).toContain("standard");
      expect(content.toLowerCase()).toContain("emergency");
    });

    it("requires code review", () => {
      expect(content.toLowerCase()).toContain("review");
    });

    it("defines CI/CD pipeline controls", () => {
      expect(content.toLowerCase()).toContain("ci/cd");
    });

    it("defines rollback procedures", () => {
      expect(content.toLowerCase()).toContain("rollback");
    });
  });

  describe("Data Classification Policy content", () => {
    const content = readFileSync(
      join(POLICIES_DIR, "data-classification-policy.md"),
      "utf-8",
    );

    it("defines classification levels", () => {
      expect(content.toLowerCase()).toContain("confidential");
      expect(content.toLowerCase()).toContain("internal");
      expect(content.toLowerCase()).toContain("public");
    });

    it("covers financial data", () => {
      expect(content.toLowerCase()).toContain("financial");
    });

    it("covers PII handling", () => {
      expect(content.toLowerCase()).toContain("pii");
    });

    it("defines disposal methods", () => {
      expect(content.toLowerCase()).toContain("disposal");
    });

    it("covers GDPR compliance", () => {
      expect(content.toLowerCase()).toContain("gdpr");
    });
  });

  describe("SOC 2 Readiness Framework references policies", () => {
    const soc2 = readFileSync(
      join(process.cwd(), "../../docs/SOC2-READINESS.md"),
      "utf-8",
    );

    it("references information security policy", () => {
      expect(soc2.toLowerCase()).toContain("information security policy");
    });

    it("references acceptable use policy", () => {
      expect(soc2.toLowerCase()).toContain("acceptable use");
    });

    it("references business continuity plan", () => {
      expect(soc2.toLowerCase()).toContain("business continuity");
    });

    it("references change management", () => {
      expect(soc2.toLowerCase()).toContain("change management");
    });
  });
});
