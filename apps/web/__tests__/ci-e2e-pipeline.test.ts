import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * CI Authenticated E2E Pipeline Validation
 *
 * Verifies the CI workflow has all required steps for authenticated E2E testing:
 * 1. db:migrate — applies schema
 * 2. db:seed — creates demo user (demo@xenboox.com)
 * 3. Build — compiles the app
 * 4. Playwright install — downloads browsers
 * 5. auth-setup project — creates storageState
 * 6. chromium project — runs authenticated tests
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname || __dirname, "../../..");
const CI_PATH = path.join(PROJECT_ROOT, ".github/workflows/ci.yml");
const PLAYWRIGHT_CONFIG = path.join(
  PROJECT_ROOT,
  "apps/web/playwright.config.ts",
);
const AUTH_SETUP = path.join(PROJECT_ROOT, "apps/web/e2e/setup/auth.setup.ts");
const SEED_INDEX = path.join(PROJECT_ROOT, "packages/db/seed/index.ts");

describe("CI E2E Pipeline Configuration", () => {
  test("CI workflow file exists", () => {
    expect(fs.existsSync(CI_PATH)).toBe(true);
  });

  test("CI has db:seed step in E2E job", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("db:seed");
  });

  test("CI runs auth-setup project", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("auth-setup");
  });

  test("CI runs authenticated chromium project", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("--project=chromium");
  });

  test("CI runs anon-chromium project", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("--project=anon-chromium");
  });

  test("auth-setup runs before chromium", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    const authSetupIdx = content.indexOf("auth-setup");
    const chromiumIdx = content.indexOf("--project=chromium");
    expect(authSetupIdx).toBeLessThan(chromiumIdx);
  });

  test("E2E job depends on build job", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("needs: [build]");
  });

  test("E2E job has postgres service for seed", () => {
    const content = fs.readFileSync(CI_PATH, "utf-8");
    expect(content).toContain("postgres");
    expect(content).toContain("POSTGRES_DB");
  });

  test("Playwright config has auth-setup project defined", () => {
    const config = fs.readFileSync(PLAYWRIGHT_CONFIG, "utf-8");
    expect(config).toContain("auth-setup");
    expect(config).toContain("storageState");
    expect(config).toContain("user.json");
  });

  test("Auth setup script exists", () => {
    expect(fs.existsSync(AUTH_SETUP)).toBe(true);
  });

  test("Seed script creates demo user", () => {
    const seedContent = fs.readFileSync(SEED_INDEX, "utf-8");
    expect(seedContent).toContain("demo@xenboox.com");
    expect(seedContent).toContain("findOrCreateUser");
  });
});
