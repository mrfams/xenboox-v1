import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const TESTS_DIR = join(ROOT, "__tests__");
const DOCS_DIR = join(ROOT, "../../docs");

describe("Penetration Testing — Security Control Verification", () => {
  describe("OWASP Top 10 sweep test exists and covers all categories", () => {
    const owaspTest = readFileSync(
      join(TESTS_DIR, "owasp-top10-sweep.test.ts"),
      "utf-8",
    );

    it("covers A01 — Broken Access Control", () => {
      expect(owaspTest).toContain("A01");
      expect(owaspTest).toContain("Access Control");
    });

    it("covers A02 — Cryptographic Failures", () => {
      expect(owaspTest).toContain("A02");
      expect(owaspTest).toContain("Cryptographic");
    });

    it("covers A03 — Injection", () => {
      expect(owaspTest).toContain("A03");
      expect(owaspTest).toContain("Injection");
    });

    it("covers A04 — Insecure Design", () => {
      expect(owaspTest).toContain("A04");
      expect(owaspTest).toContain("Insecure Design");
    });

    it("covers A05 — Security Misconfiguration", () => {
      expect(owaspTest).toContain("A05");
      expect(owaspTest).toContain("Misconfiguration");
    });

    it("covers A06 — Vulnerable Components", () => {
      expect(owaspTest).toContain("A06");
      expect(owaspTest).toContain("Vulnerable");
    });

    it("covers A07 — Authentication Failures", () => {
      expect(owaspTest).toContain("A07");
      expect(owaspTest).toContain("Authentication");
    });

    it("covers A08 — Data Integrity Failures", () => {
      expect(owaspTest).toContain("A08");
      expect(owaspTest).toContain("Integrity");
    });

    it("covers A09 — Logging Failures", () => {
      expect(owaspTest).toContain("A09");
      expect(owaspTest).toContain("Logging");
    });

    it("covers A10 — SSRF", () => {
      expect(owaspTest).toContain("A10");
      expect(owaspTest).toContain("Forgery");
    });
  });

  describe("Specialist security test suites exist", () => {
    const testFiles = readdirSync(TESTS_DIR).filter((f) =>
      f.endsWith(".test.ts"),
    );

    it("has RBAC sweep test", () => {
      expect(testFiles.some((f) => f.includes("rbac-sweep"))).toBe(true);
    });

    it("has IDOR/RLS sweep test", () => {
      expect(testFiles.some((f) => f.includes("idor-rls-sweep"))).toBe(true);
    });

    it("has security headers test", () => {
      expect(testFiles.some((f) => f.includes("security-headers"))).toBe(true);
    });

    it("has XSS test", () => {
      expect(testFiles.some((f) => f.includes("xss"))).toBe(true);
    });

    it("has rate limiter test", () => {
      expect(testFiles.some((f) => f.includes("rate-limit"))).toBe(true);
    });

    it("has logger redaction test", () => {
      expect(testFiles.some((f) => f.includes("logger-redaction"))).toBe(true);
    });

    it("has password policy test", () => {
      expect(testFiles.some((f) => f.includes("password-policy"))).toBe(true);
    });

    it("has webhook verification test", () => {
      expect(testFiles.some((f) => f.includes("webhook"))).toBe(true);
    });
  });

  describe("Security documentation exists", () => {
    it("has security verification doc", () => {
      expect(existsSync(join(DOCS_DIR, "SECURITY_VERIFICATION.md"))).toBe(true);
    });

    it("has incident response doc", () => {
      expect(existsSync(join(DOCS_DIR, "security/incident-response.md"))).toBe(
        true,
      );
    });

    it("has SOC 2 readiness framework", () => {
      expect(existsSync(join(DOCS_DIR, "SOC2-READINESS.md"))).toBe(true);
    });

    it("has GDPR/DPA template", () => {
      expect(existsSync(join(DOCS_DIR, "GDPR-DPA-TEMPLATE.md"))).toBe(true);
    });
  });

  describe("Security controls in code", () => {
    it("middleware applies security headers", () => {
      const middleware = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
      expect(middleware).toContain("applySecurityHeaders");
      // Headers defined in lib/security/headers.ts
      const headers = readFileSync(
        join(ROOT, "lib/security/headers.ts"),
        "utf-8",
      );
      expect(headers).toContain("X-Frame-Options");
      expect(headers).toContain("X-Content-Type-Options");
    });

    it("middleware validates origin on mutations", () => {
      const middleware = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
      expect(middleware).toContain("validateOrigin");
    });

    it("encryption uses AES-256-GCM", () => {
      const enc = readFileSync(
        join(ROOT, "../../packages/db/lib/encryption.ts"),
        "utf-8",
      );
      expect(enc).toContain("aes-256-gcm");
    });

    it("rate limiting is configured", () => {
      const middleware = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
      expect(middleware).toContain("getRateLimiter");
    });

    it("admin cookies have httpOnly and secure flags", () => {
      const admin = readFileSync(join(ROOT, "lib/auth/admin.ts"), "utf-8");
      expect(admin).toContain("httpOnly: true");
      expect(admin).toContain("secure:");
    });
  });

  describe("CI security gates", () => {
    const securityYml = readFileSync(
      join(DOCS_DIR, "../.github/workflows/security.yml"),
      "utf-8",
    );

    it("runs dependency audit", () => {
      expect(securityYml).toContain("audit");
    });

    it("runs secret scanning (gitleaks)", () => {
      expect(securityYml).toContain("gitleaks");
    });

    it("runs SAST (semgrep or codeql)", () => {
      expect(securityYml.toLowerCase()).toMatch(/semgrep|codeql/);
    });
  });
});
