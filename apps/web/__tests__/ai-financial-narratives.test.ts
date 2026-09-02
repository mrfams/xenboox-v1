import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * AI Financial Narratives Validation
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname || __dirname, "../../..");
const NARRATIVE_PATH = path.join(
  PROJECT_ROOT,
  "apps/web/server/routers/dashboard/get-ai-narrative.ts",
);
const REPORTS_PATH = path.join(
  PROJECT_ROOT,
  "apps/web/server/routers/reports.ts",
);

describe("AI Financial Narratives", () => {
  test("getAiNarrative endpoint exists", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("getAiNarrative");
  });

  test("getAiNarrative uses entity scoping", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("ctx.entityId!");
  });

  test("getAiNarrative has rate limiting", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("checkNarrativeRateLimit");
  });

  test("getAiNarrative has Redis caching", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("redis.setex");
    expect(content).toContain("redis.get");
  });

  test("getAiNarrative has injection defense", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("INJECTION_DEFENSE_SUFFIX");
  });

  test("getAiNarrative has PII redaction", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("redactPii");
  });

  test("getAiNarrative has fallback when LLM fails", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("Fallback to assembled narrative");
  });

  test("getAiNarrative extracts highlights and concerns", () => {
    const content = fs.readFileSync(NARRATIVE_PATH, "utf-8");
    expect(content).toContain("highlights");
    expect(content).toContain("concerns");
  });

  test("getReportNarrative exists in reports router", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("getReportNarrative");
  });

  test("getReportNarrative uses entity scoping", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("ctx.entityId!");
  });

  test("getReportNarrative returns structured data", () => {
    const content = fs.readFileSync(REPORTS_PATH, "utf-8");
    expect(content).toContain("narrative:");
    expect(content).toContain("metrics:");
    expect(content).toContain("flags:");
  });
});
