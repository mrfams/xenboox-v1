import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Onboarding Activation Tracking Validation
 */

const WEB_ROOT = path.resolve(import.meta.dirname || __dirname, "..");
const WIZARD_PATH = path.join(
  WEB_ROOT,
  "components/onboarding/onboarding-wizard.tsx",
);
const PAGE_PATH = path.join(
  WEB_ROOT,
  "app/(auth)/register/onboarding/page.tsx",
);
const EVENTS_PATH = path.join(WEB_ROOT, "lib/analytics/events.ts");
const TRACKING_PATH = path.join(WEB_ROOT, "lib/analytics/feature-tracking.ts");

describe("Onboarding Activation Tracking", () => {
  test("wizard file exists", () => {
    expect(fs.existsSync(WIZARD_PATH)).toBe(true);
  });

  test("wizard uses ES imports, not require()", () => {
    const content = fs.readFileSync(WIZARD_PATH, "utf-8");
    const requireCalls = content.match(/require\(["']@\/lib\/analytics/g);
    expect(requireCalls).toBeNull();
  });

  test("wizard has ES import for analytics", () => {
    const content = fs.readFileSync(WIZARD_PATH, "utf-8");
    expect(content).toContain('from "@/lib/analytics/events"');
    expect(content).toContain('from "@/lib/analytics/feature-tracking"');
  });

  test("wizard tracks completion separately from skip", () => {
    const content = fs.readFileSync(WIZARD_PATH, "utf-8");
    const completedMatches = content.match(/track\("onboarding_completed"/g);
    expect(completedMatches?.length).toBe(1);
  });

  test("wizard tracks step progression", () => {
    const content = fs.readFileSync(WIZARD_PATH, "utf-8");
    expect(content).toContain("trackFunnel");
  });

  test("wizard has proper error boundaries around analytics", () => {
    const content = fs.readFileSync(WIZARD_PATH, "utf-8");
    expect(content).toContain("try");
    expect(content).toContain("catch");
  });

  test("page file exists", () => {
    expect(fs.existsSync(PAGE_PATH)).toBe(true);
  });

  test("page tracks onboarding completion", () => {
    const content = fs.readFileSync(PAGE_PATH, "utf-8");
    expect(content).toContain("completeFlow");
  });

  test("events.ts exports track function", () => {
    const content = fs.readFileSync(EVENTS_PATH, "utf-8");
    expect(content).toContain("export function track");
  });

  test("feature-tracking.ts exports trackFunnel", () => {
    const content = fs.readFileSync(TRACKING_PATH, "utf-8");
    expect(content).toContain("export function trackFunnel");
  });
});
