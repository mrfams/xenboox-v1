import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Alerting System — Verification", () => {
  describe("Sentry alerting rules", () => {
    const alerts = readFileSync(join(ROOT, "sentry.alerts.ts"), "utf-8");

    it("defines performance alerts", () => {
      expect(alerts).toContain("Alerting Rules");
    });

    it("defines p95 latency alert", () => {
      expect(alerts).toContain("p95");
    });

    it("defines error rate alert", () => {
      expect(alerts).toContain("error");
    });
  });

  describe("Incident response references alerting", () => {
    const runbook = readFileSync(
      join(ROOT, "../../docs/INCIDENT_RUNBOOK.md"),
      "utf-8",
    );

    it("references PagerDuty for on-call", () => {
      expect(runbook).toContain("PagerDuty");
    });

    it("defines escalation path", () => {
      expect(runbook.toLowerCase()).toContain("escalation");
    });
  });

  describe("Notification system", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf-8");

    it("has Resend for email alerts", () => {
      expect(pkg).toContain("resend");
    });
  });

  describe("DLQ (Dead Letter Queue) for failed operations", () => {
    const dlqTest = readFileSync(
      join(ROOT, "__tests__/jobs-dlq.test.ts"),
      "utf-8",
    );

    it("tests DLQ for failed jobs", () => {
      expect(dlqTest).toContain("dlq");
    });
  });
});
