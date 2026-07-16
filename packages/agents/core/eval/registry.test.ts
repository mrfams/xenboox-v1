import { describe, it, expect } from "vitest"
import { AGENT_REGISTRY, TASK_TO_AGENT, DEPARTMENT_AGENTS, ALL_DEPARTMENTS } from "../registry"
import {
  classifyUserMessage,
  checkEscalation,
  type AgentResult,
} from "../orchestrator"

// ─── Registry Completeness ───────────────────────────────────────

describe("AGENT_REGISTRY", () => {
  it("has exactly 18 agents", () => {
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(18)
  })

  it("every agent has required fields", () => {
    for (const [id, agent] of Object.entries(AGENT_REGISTRY)) {
      expect(agent.agentId).toBe(id)
      expect(agent.tier).toMatch(/^(tier1|tier2|tier3|platform)$/)
      expect(agent.department).toBeDefined()
      expect(agent.taskTypes).toBeInstanceOf(Array)
    }
  })

  it("has exactly 1 tier1 agent (CFO)", () => {
    const tier1 = Object.values(AGENT_REGISTRY).filter((a) => a.tier === "tier1")
    expect(tier1).toHaveLength(1)
    expect(tier1[0].agentId).toBe("cfo")
  })

  it("has at least 4 tier2 agents", () => {
    const tier2 = Object.values(AGENT_REGISTRY).filter((a) => a.tier === "tier2")
    expect(tier2.length).toBeGreaterThanOrEqual(4)
  })

  it("has tier3 and platform agents", () => {
    const tier3 = Object.values(AGENT_REGISTRY).filter((a) => a.tier === "tier3")
    const platform = Object.values(AGENT_REGISTRY).filter((a) => a.tier === "platform")
    expect(tier3.length).toBeGreaterThan(0)
    expect(platform.length).toBeGreaterThan(0)
  })
})

// ─── Task-to-Agent Mapping ──────────────────────────────────────

describe("TASK_TO_AGENT", () => {
  it("maps all known task types", () => {
    const taskTypes = Object.values(AGENT_REGISTRY).flatMap((a) => a.taskTypes)
    for (const taskType of taskTypes) {
      expect(TASK_TO_AGENT[taskType]).toBeTruthy()
    }
  })
})

// ─── Department Agents ──────────────────────────────────────────

describe("DEPARTMENT_AGENTS", () => {
  it("has all 4 departments", () => {
    expect(Object.keys(DEPARTMENT_AGENTS)).toHaveLength(4)
    expect(ALL_DEPARTMENTS).toHaveLength(4)
  })

  it("each department maps to a valid agentId", () => {
    for (const [dept, agentId] of Object.entries(DEPARTMENT_AGENTS)) {
      expect(AGENT_REGISTRY[agentId]).toBeDefined()
    }
  })
})

// ─── Orchestrator Classification ──────────────────────────────────

describe("classifyUserMessage — comprehensive", () => {
  const messages = [
    "close the month",
    "process payroll for June",
    "review VAT filing",
    "bank reconciliation status",
    "run depreciation",
    "check inventory stock levels",
    "generate P&L statement",
    "what is our cash position?",
    "hello",
    "help me with something",
  ]

  for (const msg of messages) {
    it(`classifies "${msg}"`, () => {
      const result = classifyUserMessage(msg)
      expect(result).toBeTruthy()
      expect(typeof result).toBe("string")
    })
  }
})

// ─── Escalation Thresholds ────────────────────────────────────────

describe("checkEscalation — boundary values", () => {
  const makeResult = (confidence: number): AgentResult => ({
    taskId: "eval",
    agentId: "cfo",
    tier: "tier1",
    confidence,
    reasoning: "test",
    result: null,
    errors: [],
    auditTrail: [],
    duration: 100,
  })

  const boundaries = [
    { confidence: 0, expected: "escalate_to_human" },
    { confidence: 0.3, expected: "escalate_to_human" },
    { confidence: 0.59, expected: "escalate_to_human" },
    { confidence: 0.6, expected: "escalate_to_supervisor" },
    { confidence: 0.7, expected: "escalate_to_supervisor" },
    { confidence: 0.79, expected: "escalate_to_supervisor" },
    { confidence: 0.8, expected: "proceed" },
    { confidence: 0.9, expected: "proceed" },
    { confidence: 1.0, expected: "proceed" },
  ]

  for (const { confidence, expected } of boundaries) {
    it(`confidence=${confidence} → ${expected}`, () => {
      expect(checkEscalation(makeResult(confidence)).action).toBe(expected)
    })
  }
})
