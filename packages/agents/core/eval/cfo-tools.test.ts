import { describe, it, expect } from "vitest"
import { classifyInstruction, routeToDepartment, evaluateCloseReadiness } from "../../tier1/cfo-agent/tools"

// ─── CFO Tool: classifyInstruction ────────────────────────────────

const instructionTests: Array<{ input: string; expected: string; note?: string }> = [
  { input: "close the month", expected: "close_trigger" },
  { input: "yes, proceed", expected: "approval" },
  { input: "approve", expected: "approval" },
  { input: "reject", expected: "approval" },
  { input: "confirmed", expected: "approval" },
  { input: "what is our cash balance?", expected: "question" },
  { input: "show me the report", expected: "question" },
  { input: "list all suppliers", expected: "question" },
  { input: "there is an error in the entries", expected: "close_flag" },
  { input: "wrong amount posted", expected: "close_flag" },
  { input: "fix the mistake", expected: "close_flag" },
  { input: "post this journal entry", expected: "instruction" },
  { input: "create a new invoice", expected: "instruction" },
]

describe("classifyInstruction — golden dataset", () => {
  for (const { input, expected } of instructionTests) {
    it(`"${input}" → ${expected}`, () => {
      expect(classifyInstruction(input)).toBe(expected)
    })
  }
})

// ─── CFO Tool: routeToDepartment ──────────────────────────────────

const routingTests: Array<{ input: string; expected: string; note?: string }> = [
  { input: "process payroll for June", expected: "payroll_manager" },
  { input: "calculate salary", expected: "payroll_manager" },
  { input: "check bank balance", expected: "treasury" },
  { input: "reconcile mobile money", expected: "treasury" },
  { input: "process expense claim", expected: "treasury" },
  { input: "file VAT return", expected: "compliance" },
  { input: "review tax compliance", expected: "compliance" },
  { input: "check regulatory status", expected: "compliance" },
  { input: "post journal entry", expected: "controller" },
  { input: "review trial balance", expected: "controller" },
  { input: "check AP aging", expected: "controller" },
  { input: "generate payslips", expected: "controller", note: "no payroll keyword match, defaults to controller" },
]

describe("routeToDepartment — golden dataset", () => {
  for (const { input, expected, note } of routingTests) {
    const label = note ? `"${input}" → ${expected} (${note})` : `"${input}" → ${expected}`
    it(label, () => {
      expect(routeToDepartment(input)).toBe(expected)
    })
  }
})

// ─── CFO Tool: evaluateCloseReadiness ─────────────────────────────

describe("evaluateCloseReadiness", () => {
  const confirmed = (confidence: number) => ({
    confirmed: true,
    confidence,
    summary: "Ready",
    confirmedAt: new Date().toISOString(),
  })

  const unconfirmed = () => ({
    confirmed: false,
    confidence: null,
    summary: "Not checked",
    confirmedAt: null,
  })

  it("returns ready when all departments confirmed with high confidence", () => {
    const result = evaluateCloseReadiness({
      controller: confirmed(0.9),
      treasury: confirmed(0.85),
      payrollManager: confirmed(0.95),
      compliance: confirmed(0.88),
    })
    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
    expect(result.overallConfidence).toBeGreaterThan(0.8)
  })

  it("returns not ready when a department is unconfirmed", () => {
    const result = evaluateCloseReadiness({
      controller: confirmed(0.9),
      treasury: unconfirmed(),
      payrollManager: confirmed(0.95),
      compliance: confirmed(0.88),
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain("Treasury has not confirmed")
  })

  it("returns not ready when confidence is below threshold", () => {
    const result = evaluateCloseReadiness({
      controller: confirmed(0.9),
      treasury: confirmed(0.7),
      payrollManager: confirmed(0.95),
      compliance: confirmed(0.88),
    })
    expect(result.ready).toBe(false)
    expect(result.blockers.some((b) => b.includes("confidence"))).toBe(true)
  })

  it("calculates overall confidence as average", () => {
    const result = evaluateCloseReadiness({
      controller: confirmed(0.9),
      treasury: confirmed(0.8),
      payrollManager: confirmed(0.7),
      compliance: confirmed(0.6),
    })
    expect(result.overallConfidence).toBeCloseTo(0.75, 2)
  })

  it("handles all unconfirmed", () => {
    const result = evaluateCloseReadiness({
      controller: unconfirmed(),
      treasury: unconfirmed(),
      payrollManager: unconfirmed(),
      compliance: unconfirmed(),
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toHaveLength(4)
  })
})
