import { describe, it, expect } from "vitest";
import {
  classifyInstruction,
  routeToDepartment,
  routeToDepartments,
  evaluateCloseReadiness,
  createSourceRef,
  synthesizeResponse,
  frameEscalation,
  isWaitingOnDepartments,
  getDepartmentDisplayName,
  ALL_DEPARTMENT_NAMES,
} from "../tier1/cfo-agent/tools";

// ─── classifyInstruction ──────────────────────────────────────────

describe("classifyInstruction", () => {
  it("classifies close trigger (must start with close/month.end/period.end AND contain close/run/process)", () => {
    expect(classifyInstruction("close the month")).toBe("close_trigger");
  });

  it("classifies approval", () => {
    expect(classifyInstruction("yes, proceed")).toBe("approval");
    expect(classifyInstruction("approve")).toBe("approval");
    expect(classifyInstruction("reject")).toBe("approval");
    expect(classifyInstruction("confirmed")).toBe("approval");
  });

  it("classifies question (matches what/how/when/show/etc.)", () => {
    expect(classifyInstruction("what is our cash balance?")).toBe("question");
    expect(classifyInstruction("show me the report")).toBe("question");
    expect(classifyInstruction("list all suppliers")).toBe("question");
  });

  it("classifies close flag", () => {
    expect(classifyInstruction("there is an error in the entries")).toBe(
      "close_flag",
    );
    expect(classifyInstruction("wrong amount posted")).toBe("close_flag");
    expect(classifyInstruction("fix the mistake")).toBe("close_flag");
  });

  it("defaults to instruction", () => {
    expect(classifyInstruction("post this journal entry")).toBe("instruction");
    expect(classifyInstruction("create a new invoice")).toBe("instruction");
  });
});

// ─── routeToDepartment ────────────────────────────────────────────

describe("routeToDepartment", () => {
  it("routes payroll to payroll_manager", () => {
    expect(routeToDepartment("process payroll for June")).toBe(
      "payroll_manager",
    );
    expect(routeToDepartment("calculate salary")).toBe("payroll_manager");
  });

  it("routes cash/treasury to treasury", () => {
    expect(routeToDepartment("check bank balance")).toBe("treasury");
    expect(routeToDepartment("reconcile mobile money")).toBe("treasury");
    expect(routeToDepartment("process expense claim")).toBe("treasury");
  });

  it("routes tax to compliance", () => {
    expect(routeToDepartment("file VAT return")).toBe("compliance");
    expect(routeToDepartment("review tax compliance")).toBe("compliance");
    expect(routeToDepartment("check regulatory status")).toBe("compliance");
  });

  it("routes GL/journal to controller (default)", () => {
    expect(routeToDepartment("post journal entry")).toBe("controller");
    expect(routeToDepartment("review trial balance")).toBe("controller");
    expect(routeToDepartment("check AP aging")).toBe("controller");
  });
});

// ─── evaluateCloseReadiness ───────────────────────────────────────

describe("evaluateCloseReadiness", () => {
  const confirmedDept = (confidence: number) => ({
    confirmed: true,
    confidence,
    summary: "Ready",
    confirmedAt: new Date().toISOString(),
  });

  const unconfirmedDept = () => ({
    confirmed: false,
    confidence: null,
    summary: "Not checked",
    confirmedAt: null,
  });

  it("returns ready when all departments confirmed with high confidence", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.85),
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    });
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.overallConfidence).toBeGreaterThan(0.8);
  });

  it("returns not ready when a department is unconfirmed", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: unconfirmedDept(),
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Treasury has not confirmed");
  });

  it("returns not ready when confidence is below threshold", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.7), // below 0.8
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("confidence"))).toBe(true);
  });

  it("calculates overall confidence as average", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.8),
      payrollManager: confirmedDept(0.7),
      compliance: confirmedDept(0.6),
    });
    expect(result.overallConfidence).toBeCloseTo(0.75, 2);
  });
});

// ─── routeToDepartments (multi-department) ────────────────────────────

describe("routeToDepartments", () => {
  it("routes payroll keywords to payroll_manager", () => {
    const depts = routeToDepartments("process payroll for June");
    expect(depts).toContain("payroll_manager");
  });

  it("routes treasury keywords to treasury", () => {
    const depts = routeToDepartments("check bank balance");
    expect(depts).toContain("treasury");
  });

  it("routes compliance keywords to compliance", () => {
    const depts = routeToDepartments("file VAT return");
    expect(depts).toContain("compliance");
  });

  it("routes GL/journal keywords to controller", () => {
    const depts = routeToDepartments("post journal entry");
    expect(depts).toContain("controller");
  });

  it("returns multiple departments when instruction spans domains", () => {
    const depts = routeToDepartments("run payroll and file taxes");
    expect(depts).toContain("payroll_manager");
    expect(depts).toContain("compliance");
    expect(depts.length).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates departments", () => {
    const depts = routeToDepartments("payroll salary wages");
    const payrollCount = depts.filter((d) => d === "payroll_manager").length;
    expect(payrollCount).toBe(1);
  });

  it("defaults to controller when nothing matches", () => {
    const depts = routeToDepartments("hello world");
    expect(depts).toEqual(["controller"]);
  });

  it("routes AP/AR/invoice to controller", () => {
    expect(routeToDepartments("check AP aging")).toContain("controller");
    expect(routeToDepartments("create invoice")).toContain("controller");
    expect(routeToDepartments("list suppliers")).toContain("controller");
  });

  it("routes assets/inventory to controller", () => {
    expect(routeToDepartments("run depreciation")).toContain("controller");
    expect(routeToDepartments("check inventory")).toContain("controller");
  });
});

// ─── getDepartmentDisplayName ────────────────────────────────────────

describe("getDepartmentDisplayName", () => {
  it("returns human-readable names", () => {
    expect(getDepartmentDisplayName("controller")).toBe("Controller");
    expect(getDepartmentDisplayName("treasury")).toBe("Treasury");
    expect(getDepartmentDisplayName("payroll_manager")).toBe("Payroll Manager");
    expect(getDepartmentDisplayName("compliance")).toBe("Compliance");
  });
});

// ─── ALL_DEPARTMENT_NAMES ────────────────────────────────────────────

describe("ALL_DEPARTMENT_NAMES", () => {
  it("contains all four departments", () => {
    expect(ALL_DEPARTMENT_NAMES).toHaveLength(4);
    expect(ALL_DEPARTMENT_NAMES).toContain("controller");
    expect(ALL_DEPARTMENT_NAMES).toContain("treasury");
    expect(ALL_DEPARTMENT_NAMES).toContain("payroll_manager");
    expect(ALL_DEPARTMENT_NAMES).toContain("compliance");
  });
});

// ─── createSourceRef ─────────────────────────────────────────────────

describe("createSourceRef", () => {
  it("creates a source ref with all fields", () => {
    const ref = createSourceRef({
      claim: "Profit was $4,200",
      sourceDepartment: "controller",
      sourceSummaryExcerpt: "Confirmed trial balance shows $4,200 profit",
      confidence: 0.95,
    });
    expect(ref.claim).toBe("Profit was $4,200");
    expect(ref.sourceDepartment).toBe("controller");
    expect(ref.confidence).toBe(0.95);
  });
});

// ─── synthesizeResponse ──────────────────────────────────────────────

describe("synthesizeResponse", () => {
  const receivedDept = (department: string, summary: string) => ({
    department,
    status: "received" as const,
    summary,
    confidence: 0.9,
    receivedAt: new Date().toISOString(),
    sourceRefs: [
      createSourceRef({
        claim: summary.slice(0, 50),
        sourceDepartment: department,
        sourceSummaryExcerpt: summary.slice(0, 100),
        confidence: 0.9,
      }),
    ],
  });

  const pendingDept = (department: string) => ({
    department,
    status: "pending" as const,
    summary: null,
    confidence: null,
    receivedAt: null,
    sourceRefs: [],
  });

  it("composes response from multiple received departments", () => {
    const result = synthesizeResponse({
      departmentResponses: [
        receivedDept("controller", "Trial balance confirmed: profit $4,200"),
        receivedDept("treasury", "Cash position: $52,000"),
      ],
      originalInstruction: "financial summary",
    });
    expect(result.answer).toContain("Controller");
    expect(result.answer).toContain("Treasury");
    expect(result.answer).toContain("profit");
    expect(result.answer).toContain("$52,000");
    expect(result.sourceRefs).toHaveLength(2);
  });

  it("includes pending department names when waiting", () => {
    const result = synthesizeResponse({
      departmentResponses: [
        receivedDept("controller", "Trial balance confirmed"),
        pendingDept("compliance"),
      ],
      originalInstruction: "full status",
    });
    expect(result.answer).toContain("Controller");
    expect(result.answer).toContain("Still waiting");
    expect(result.answer).toContain("Compliance");
  });

  it("does not fabricate claims — only composes given data", () => {
    const result = synthesizeResponse({
      departmentResponses: [
        receivedDept("controller", "Only this data exists"),
      ],
      originalInstruction: "tell me about everything",
    });
    expect(result.answer).toContain("Only this data exists");
    expect(result.answer).not.toContain("Treasury");
    expect(result.answer).not.toContain("Payroll");
  });
});

// ─── frameEscalation ─────────────────────────────────────────────────

describe("frameEscalation", () => {
  it("creates an escalation frame with triggering data", () => {
    const frame = frameEscalation({
      triggeringAgent: "treasury",
      triggeringDataRef:
        "Cash position dropped by $2,000 below typical month-end",
      originalInput: "Is cash sufficient for month-end?",
      departmentAssessment: "Cash position $2,000 lower than expected",
      recommendation: "Please advise if this is expected",
    });
    expect(frame.triggeringAgent).toBe("treasury");
    expect(frame.triggeringDataRef).toContain("$2,000");
    expect(frame.id).toBeTruthy();
    expect(frame.resolvedAt).toBeNull();
  });

  it("sets timeSensitivity when provided", () => {
    const frame = frameEscalation({
      triggeringAgent: "compliance",
      triggeringDataRef: "VAT filing deadline tomorrow",
      originalInput: "Check filing status",
      departmentAssessment: "Filing overdue",
      recommendation: "Immediate action needed",
      timeSensitivity: "critical",
    });
    expect(frame.timeSensitivity).toBe("critical");
  });
});

// ─── isWaitingOnDepartments ──────────────────────────────────────────

describe("isWaitingOnDepartments", () => {
  const pending = (department: string) => ({
    department,
    status: "pending" as const,
    summary: null,
    confidence: null,
    receivedAt: null,
    sourceRefs: [],
  });

  const received = (department: string) => ({
    department,
    status: "received" as const,
    summary: "ok",
    confidence: 0.9,
    receivedAt: new Date().toISOString(),
    sourceRefs: [],
  });

  const timedOut = (department: string) => ({
    department,
    status: "timed_out" as const,
    summary: null,
    confidence: null,
    receivedAt: null,
    sourceRefs: [],
  });

  it("returns waiting=true when departments are pending", () => {
    const result = isWaitingOnDepartments([
      received("controller"),
      pending("compliance"),
    ]);
    expect(result.waiting).toBe(true);
    expect(result.waitingOn).toContain("Compliance");
    expect(result.received).toContain("Controller");
  });

  it("returns waiting=false when all departments received", () => {
    const result = isWaitingOnDepartments([
      received("controller"),
      received("treasury"),
    ]);
    expect(result.waiting).toBe(false);
  });

  it("reports timed out departments separately", () => {
    const result = isWaitingOnDepartments([
      received("controller"),
      timedOut("payroll_manager"),
    ]);
    expect(result.waiting).toBe(false);
    expect(result.timedOut).toContain("Payroll Manager");
  });
});
