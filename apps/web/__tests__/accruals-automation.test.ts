import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CLOSE_PIPELINE_PATH = path.resolve(
  __dirname,
  "../../../packages/agents/core/close-pipeline.ts",
);

const TASK_CATALOG_PATH = path.resolve(
  __dirname,
  "../../../packages/db/seed/close-task-catalog.ts",
);

const CONTROLLER_PROMPT_PATH = path.resolve(
  __dirname,
  "../../../packages/agents/core/prompts/controller-system-prompt-v5.ts",
);

describe("P1 #3: Accruals Automation", () => {
  it("close pipeline includes accruals step", () => {
    const content = fs.readFileSync(CLOSE_PIPELINE_PATH, "utf-8");
    expect(content).toContain("accruals");
    expect(content).toContain("deferral");
  });

  it("close task catalog has review_accruals, post_accruals, and prepaid amortization tasks", () => {
    const content = fs.readFileSync(TASK_CATALOG_PATH, "utf-8");
    expect(content).toContain("review_accruals");
    expect(content).toContain("post_accruals");
    expect(content).toContain("Prepaid expense");
  });

  it("controller agent prompt instructs accruals and prepaid amortization", () => {
    const content = fs.readFileSync(CONTROLLER_PROMPT_PATH, "utf-8");
    expect(content).toContain("accruals");
    expect(content).toContain("prepaid");
  });

  it("DB schema supports prepaid and accrued_liability account subtypes", () => {
    const schemaPath = path.resolve(
      __dirname,
      "../../../packages/db/schema/accounting.ts",
    );
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("prepaid");
    expect(content).toContain("accrued_liability");
  });

  it("seed data includes accrual journal entries", () => {
    const seedPath = path.resolve(
      __dirname,
      "../../../packages/db/seed/seed-current-month.ts",
    );
    const content = fs.readFileSync(seedPath, "utf-8");
    expect(content).toContain("accrual");
  });

  it("month-end close flow requires accruals_posted and prepaids_amortized", () => {
    const flowPath = path.resolve(
      __dirname,
      "../../../packages/agents/flows/month-end-close-happy-path-flow.yaml",
    );
    const content = fs.readFileSync(flowPath, "utf-8");
    expect(content).toContain("accruals_posted: true");
    expect(content).toContain("prepaids_amortized: true");
  });
});
