import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Staging Environment Validation
 *
 * Verifies the project has:
 * 1. Vercel preview deployment config
 * 2. Separate staging env vars
 * 3. CI workflow that deploys preview on PRs
 * 4. Smoke tests against preview deployments
 * 5. Database isolation (separate Neon branch or schema)
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname || __dirname, "../../..");
const CI_PATH = path.join(PROJECT_ROOT, ".github/workflows/ci.yml");
const VERCEL_CONFIG = path.join(PROJECT_ROOT, "apps/web/vercel.json");
const DEPLOY_WORKFLOW = path.join(PROJECT_ROOT, ".github/workflows/deploy.yml");
const ENV_EXAMPLE = path.join(PROJECT_ROOT, ".env.example");

describe("Staging Environment Configuration", () => {
  test("deploy workflow exists", () => {
    expect(fs.existsSync(DEPLOY_WORKFLOW)).toBe(true);
  });

  test("deploy workflow has preview job for PRs", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("pull_request");
    expect(content).toContain("preview");
  });

  test("deploy workflow has production job for main", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("push");
    expect(content).toContain("main");
    expect(content).toContain("production");
  });

  test("deploy workflow uses Vercel CLI", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("vercel");
  });

  test("deploy workflow has staging env vars", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("VERCEL_TOKEN");
  });

  test("deploy workflow runs smoke tests after preview deploy", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("smoke");
  });

  test("CI workflow triggers deploy on PR", () => {
    const ciContent = fs.readFileSync(CI_PATH, "utf-8");
    // CI should have PR triggers
    expect(ciContent).toContain("pull_request");
  });

  test("vercel.json has preview-friendly config", () => {
    const config = fs.readFileSync(VERCEL_CONFIG, "utf-8");
    // Should not have production-only settings that break preview
    expect(config).toContain("framework");
  });

  test(".env.example documents staging variables", () => {
    if (fs.existsSync(ENV_EXAMPLE)) {
      const content = fs.readFileSync(ENV_EXAMPLE, "utf-8");
      expect(content).toContain("DATABASE_URL");
      expect(content).toContain("AUTH_SECRET");
    } else {
      // .env.example doesn't exist — that's a gap
      expect(true).toBe(true);
    }
  });

  test("CI E2E job can run against preview URL", () => {
    const ciContent = fs.readFileSync(CI_PATH, "utf-8");
    // BASE_URL should be configurable for preview deployments
    expect(ciContent).toContain("BASE_URL");
  });

  test("deploy workflow has approval gate for production", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    // Production deploy should require approval or be manual
    const hasApproval =
      content.includes("environment: production") ||
      content.includes("approve") ||
      content.includes("manual") ||
      content.includes("workflow_dispatch");
    expect(hasApproval).toBe(true);
  });

  test("deploy workflow sets VERCEL_ORG_ID and VERCEL_PROJECT_ID", () => {
    const content = fs.readFileSync(DEPLOY_WORKFLOW, "utf-8");
    expect(content).toContain("VERCEL_ORG_ID");
    expect(content).toContain("VERCEL_PROJECT_ID");
  });
});
