import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = path.resolve(__dirname, "../../../docs");
const RUNBOOKS_DIR = path.join(DOCS_DIR, "runbooks");
const DRILLS_DIR = path.join(RUNBOOKS_DIR, "drills");

describe("P1 #5: Incident Response Plan", () => {
  it("main incident runbook exists", () => {
    const runbook = path.join(DOCS_DIR, "INCIDENT_RUNBOOK.md");
    expect(fs.existsSync(runbook)).toBe(true);
    const content = fs.readFileSync(runbook, "utf-8");
    expect(content).toContain("severity");
    expect(content).toContain("On-Call");
    expect(content).toContain("Escalation");
    expect(content).toContain("postmortem");
  });

  it("security incident response plan exists", () => {
    const secIR = path.join(DOCS_DIR, "security", "incident-response.md");
    expect(fs.existsSync(secIR)).toBe(true);
    const content = fs.readFileSync(secIR, "utf-8");
    expect(content).toContain("detection");
    expect(content).toContain("containment");
    expect(content).toContain("eradication");
    expect(content).toContain("recovery");
  });

  it("scenario runbooks exist for critical infrastructure", () => {
    const required = [
      "db-failover.md",
      "redis-down.md",
      "llm-outage.md",
      "security-incident.md",
      "r2-outage.md",
      "email-outage.md",
      "job-backlog.md",
    ];
    for (const file of required) {
      expect(fs.existsSync(path.join(RUNBOOKS_DIR, file))).toBe(true);
    }
  });

  it("drill scripts exist for chaos testing", () => {
    const drills = fs.readdirSync(DRILLS_DIR);
    expect(drills.length).toBeGreaterThanOrEqual(5);
    expect(drills.some((d) => d.includes("redis"))).toBe(true);
    expect(drills.some((d) => d.includes("llm"))).toBe(true);
  });

  it("on-call rotation document exists", () => {
    const oncall = path.join(DOCS_DIR, "ON_CALL_ROTATION.md");
    expect(fs.existsSync(oncall)).toBe(true);
    const content = fs.readFileSync(oncall, "utf-8");
    expect(content).toContain("P1");
    expect(content).toContain("P2");
    expect(content).toContain("response time");
  });

  it("Sentry alert rules are defined", () => {
    const alertsPath = path.resolve(__dirname, "../sentry.alerts.ts");
    expect(fs.existsSync(alertsPath)).toBe(true);
    const content = fs.readFileSync(alertsPath, "utf-8");
    expect(content).toContain("runbook");
    expect(content).toContain("threshold");
  });

  it("postmortem template exists", () => {
    const postmortem = path.join(DOCS_DIR, "POSTMORTEM_TEMPLATE.md");
    expect(fs.existsSync(postmortem)).toBe(true);
    const content = fs.readFileSync(postmortem, "utf-8");
    expect(content).toContain("Timeline");
    expect(content).toContain("Root Cause");
    expect(content).toContain("Action Items");
  });

  it("monitoring document defines alert severity levels", () => {
    const monitoring = path.join(DOCS_DIR, "MONITORING.md");
    expect(fs.existsSync(monitoring)).toBe(true);
    const content = fs.readFileSync(monitoring, "utf-8");
    expect(content).toContain("P0");
    expect(content).toContain("P1");
    expect(content).toContain("PagerDuty");
  });
});
