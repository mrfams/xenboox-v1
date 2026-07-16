import { StateGraph, START, END } from "@langchain/langgraph"
import { PayrollWorkerState } from "./state"
import {
  nodeParseInput,
  nodeCalculatePaye,
  nodeCalculateSocialSecurity,
  nodeGeneratePayslip,
  nodeProcessPayrollBatch,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof PayrollWorkerState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "calculate_paye") return "calculate_paye"
  if (op === "calculate_social_security") return "calculate_social_security"
  if (op === "generate_payslip") return "generate_payslip"
  if (op === "process_payroll_batch") return "process_payroll_batch"
  return "escalate"
}

function routeAfterOperation(state: typeof PayrollWorkerState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(PayrollWorkerState)
  .addNode("parse_input", nodeParseInput)
  .addNode("calculate_paye", nodeCalculatePaye)
  .addNode("calculate_social_security", nodeCalculateSocialSecurity)
  .addNode("generate_payslip", nodeGeneratePayslip)
  .addNode("process_payroll_batch", nodeProcessPayrollBatch)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    calculate_paye: "calculate_paye",
    calculate_social_security: "calculate_social_security",
    generate_payslip: "generate_payslip",
    process_payroll_batch: "process_payroll_batch",
    escalate: "escalate",
  })
  .addConditionalEdges("calculate_paye", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("calculate_social_security", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_payslip", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("process_payroll_batch", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const payrollWorkerAgent = graph.compile()
