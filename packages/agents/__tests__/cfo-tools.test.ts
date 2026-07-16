import { describe, it, expect } from "vitest"
import { classifyInstruction, routeToDepartment, evaluateCloseReadiness } from "../tier1/cfo-agent/tools"

// ─── classifyInstruction ──────────────────────────────────────────

describe("classifyInstruction", () => {
  it("classifies close trigger (must start with close/month.end/period.end AND contain close/run/process)", () => {
    expect(classifyInstruction("close the month")).toBe("close_trigger")
  })

  it("classifies approval", () => {
    expect(classifyInstruction("yes, proceed")).toBe("approval")
    expect(classifyInstruction("approve")).toBe("approval")
    expect(classifyInstruction("reject")).toBe("approval")
    expect(classifyInstruction("confirmed")).toBe("approval")
  })

  it("classifies question (matches what/how/when/show/etc.)", () => {
    expect(classifyInstruction("what is our cash balance?")).toBe("question")
    expect(classifyInstruction("show me the report")).toBe("question")
    expect(classifyInstruction("list all suppliers")).toBe("question")
  })

  it("classifies close flag", () => {
    expect(classifyInstruction("there is an error in the entries")).toBe("close_flag")
    expect(classifyInstruction("wrong amount posted")).toBe("close_flag")
    expect(classifyInstruction("fix the mistake")).toBe("close_flag")
  })

  it("defaults to instruction", () => {
    expect(classifyInstruction("post this journal entry")).toBe("instruction")
    expect(classifyInstruction("create a new invoice")).toBe("instruction")
  })
})

// ─── routeToDepartment ────────────────────────────────────────────

describe("routeToDepartment", () => {
  it("routes payroll to payroll_manager", () => {
    expect(routeToDepartment("process payroll for June")).toBe("payroll_manager")
    expect(routeToDepartment("calculate salary")).toBe("payroll_manager")
  })

  it("routes cash/treasury to treasury", () => {
    expect(routeToDepartment("check bank balance")).toBe("treasury")
    expect(routeToDepartment("reconcile mobile money")).toBe("treasury")
    expect(routeToDepartment("process expense claim")).toBe("treasury")
  })

  it("routes tax to compliance", () => {
    expect(routeToDepartment("file VAT return")).toBe("compliance")
    expect(routeToDepartment("review tax compliance")).toBe("compliance")
    expect(routeToDepartment("check regulatory status")).toBe("compliance")
  })

  it("routes GL/journal to controller (default)", () => {
    expect(routeToDepartment("post journal entry")).toBe("controller")
    expect(routeToDepartment("review trial balance")).toBe("controller")
    expect(routeToDepartment("check AP aging")).toBe("controller")
  })
})

// ─── evaluateCloseReadiness ───────────────────────────────────────

describe("evaluateCloseReadiness", () => {
  const confirmedDept = (confidence: number) => ({
    confirmed: true,
    confidence,
    summary: "Ready",
    confirmedAt: new Date().toISOString(),
  })

  const unconfirmedDept = () => ({
    confirmed: false,
    confidence: null,
    summary: "Not checked",
    confirmedAt: null,
  })

  it("returns ready when all departments confirmed with high confidence", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.85),
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    })
    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
    expect(result.overallConfidence).toBeGreaterThan(0.8)
  })

  it("returns not ready when a department is unconfirmed", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: unconfirmedDept(),
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain("Treasury has not confirmed")
  })

  it("returns not ready when confidence is below threshold", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.7), // below 0.8
      payrollManager: confirmedDept(0.95),
      compliance: confirmedDept(0.88),
    })
    expect(result.ready).toBe(false)
    expect(result.blockers.some((b) => b.includes("confidence"))).toBe(true)
  })

  it("calculates overall confidence as average", () => {
    const result = evaluateCloseReadiness({
      controller: confirmedDept(0.9),
      treasury: confirmedDept(0.8),
      payrollManager: confirmedDept(0.7),
      compliance: confirmedDept(0.6),
    })
    expect(result.overallConfidence).toBeCloseTo(0.75, 2)
  })
})
