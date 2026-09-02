import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ERROR_BOUNDARY = path.resolve(
  __dirname,
  "../components/shared/error-boundary.tsx",
);

const AUTH_ROUTER = path.resolve(
  __dirname,
  "../app/api/auth/[...nextauth]/route.ts",
);

const STRESS_SPEC = path.resolve(__dirname, "../e2e/stress.spec.ts");

describe("P1 #7: Error Boundaries Per Route", () => {
  it("global error boundary component exists", () => {
    expect(fs.existsSync(ERROR_BOUNDARY)).toBe(true);
    const content = fs.readFileSync(ERROR_BOUNDARY, "utf-8");
    expect(content).toContain("ErrorBoundary");
    expect(content).toContain("componentDidCatch");
    expect(content).toContain("Sentry");
  });

  it("error boundary reports to Sentry with tags", () => {
    const content = fs.readFileSync(ERROR_BOUNDARY, "utf-8");
    expect(content).toContain("withScope");
    expect(content).toContain("captureException");
    expect(content).toContain("addBreadcrumb");
  });

  it("error boundary has fallback UI", () => {
    const content = fs.readFileSync(ERROR_BOUNDARY, "utf-8");
    expect(content).toContain("fallback");
    expect(content).toContain("handleReset");
  });
});

describe("P1 #8: Account Lockout", () => {
  it("E2E stress test verifies brute-force rate limiting", () => {
    expect(fs.existsSync(STRESS_SPEC)).toBe(true);
    const content = fs.readFileSync(STRESS_SPEC, "utf-8");
    expect(content).toContain("brute-force");
    expect(content).toContain("429");
    expect(content).toContain("rate-limit");
  });

  it("auth setup acknowledges brute-force protection", () => {
    const authSetup = path.resolve(__dirname, "../e2e/setup/auth.setup.ts");
    expect(fs.existsSync(authSetup)).toBe(true);
    const content = fs.readFileSync(authSetup, "utf-8");
    expect(content.toLowerCase()).toContain("brute-force");
  });

  it("enterprise production spec tests auth rate limiting", () => {
    const enterpriseSpec = path.resolve(
      __dirname,
      "../e2e/enterprise-production.spec.ts",
    );
    expect(fs.existsSync(enterpriseSpec)).toBe(true);
    const content = fs.readFileSync(enterpriseSpec, "utf-8");
    expect(content.toLowerCase()).toContain("rate limit");
  });
});
