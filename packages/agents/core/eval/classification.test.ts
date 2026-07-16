import { describe, it, expect } from "vitest"
import {
  classifyUserMessage,
  checkEscalation,
  type AgentResult,
} from "../orchestrator"

// ─── Golden Dataset: Message Classification ───────────────────────
// These test actual behavior of the regex-based classifier.
// Known limitations are documented with comments.

const classificationTests: Array<{ input: string; expected: string; note?: string }> = [
  // Close triggers — must start with close/month/period AND contain close/run/process
  { input: "close the month", expected: "close_trigger" },
  { input: "month end close for June", expected: "close_trigger" },
  { input: "period end close process", expected: "close_trigger" },

  // Payroll — matches /payroll|salary/
  { input: "process payroll for June", expected: "process_payroll" },
  { input: "calculate salary for all employees", expected: "process_payroll" },
  { input: "payroll run for July 2026", expected: "process_payroll" },

  // Tax — matches /vat|tax|filing/
  { input: "review VAT filing", expected: "tax_review" },
  { input: "check tax compliance", expected: "tax_review" },
  { input: "file our tax returns", expected: "tax_review" },

  // Cash/Treasury — matches /cash|bank|reconcil/
  { input: "bank reconciliation status", expected: "cash_position" },
  { input: "our cash position is low", expected: "cash_position" },

  // Depreciation — matches /depreciat|asset/
  { input: "run depreciation", expected: "depreciation" },
  { input: "calculate asset depreciation", expected: "depreciation" },

  // Inventory — matches /inventory|stock|cogs/ but NOT /summary/
  { input: "check inventory stock levels", expected: "inventory_summary" },

  // Reports — matches /p&l|income.*statement/
  { input: "generate P&L statement", expected: "report" },
  { input: "income statement", expected: "report" },

  // Chat (default) — no specific match
  { input: "hello", expected: "chat" },
  { input: "help me with something", expected: "chat" },
  { input: "good morning", expected: "chat" },

  // Known quirks — question regex catches these first
  { input: "what can you do?", expected: "question", note: "question regex matches 'what'" },
  { input: "show me the balance sheet", expected: "question", note: "question regex matches 'show'" },
  { input: "inventory status report", expected: "question", note: "question regex matches 'report'" },
  { input: "what is our bank balance", expected: "question", note: "question regex matches 'what'" },
  { input: "generate payslips", expected: "chat", note: "no regex matches this" },
  { input: "run the close", expected: "chat", note: "doesn't start with close/month/period" },
]

describe("classifyUserMessage — golden dataset", () => {
  for (const { input, expected, note } of classificationTests) {
    const label = note ? `${input}" → ${expected} (${note})` : `${input}" → ${expected}`
    it(label, () => {
      expect(classifyUserMessage(input)).toBe(expected)
    })
  }
})

// ─── Escalation Logic ────────────────────────────────────────────

describe("checkEscalation — confidence thresholds", () => {
  const makeResult = (confidence: number): AgentResult => ({
    taskId: "eval-test",
    agentId: "cfo",
    tier: "tier1",
    confidence,
    reasoning: "evaluation test",
    result: null,
    errors: [],
    auditTrail: [],
    duration: 100,
  })

  it("proceeds at confidence >= 0.8", () => {
    expect(checkEscalation(makeResult(0.8)).action).toBe("proceed")
    expect(checkEscalation(makeResult(0.9)).action).toBe("proceed")
    expect(checkEscalation(makeResult(1.0)).action).toBe("proceed")
  })

  it("escalates to supervisor at confidence 0.6-0.79", () => {
    expect(checkEscalation(makeResult(0.6)).action).toBe("escalate_to_supervisor")
    expect(checkEscalation(makeResult(0.7)).action).toBe("escalate_to_supervisor")
    expect(checkEscalation(makeResult(0.79)).action).toBe("escalate_to_supervisor")
  })

  it("escalates to human at confidence < 0.6", () => {
    expect(checkEscalation(makeResult(0.0)).action).toBe("escalate_to_human")
    expect(checkEscalation(makeResult(0.3)).action).toBe("escalate_to_human")
    expect(checkEscalation(makeResult(0.59)).action).toBe("escalate_to_human")
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────

describe("classifyUserMessage — edge cases", () => {
  it("handles empty string", () => {
    expect(classifyUserMessage("")).toBe("chat")
  })

  it("handles messages with extra whitespace", () => {
    expect(classifyUserMessage("  close   the   month  ")).toBe("close_trigger")
  })

  it("handles mixed case", () => {
    expect(classifyUserMessage("CLOSE THE MONTH")).toBe("close_trigger")
    expect(classifyUserMessage("Process Payroll")).toBe("process_payroll")
  })
})
