import { StateGraph, START, END } from "@langchain/langgraph"
import { ApState } from "./state"
import {
  nodeParseInput,
  nodeProcessInvoice,
  nodeGenerateAgingReport,
  nodeGetPaymentSchedule,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof ApState.State) {
  if (state.errors.length > 0) return "escalate"
  const opType = state.currentOperation?.type
  if (opType === "process_invoice" || opType === "validate_invoice") return "process_invoice"
  if (opType === "aging_report") return "aging_report"
  if (opType === "payment_schedule") return "payment_schedule"
  return "escalate"
}

function routeAfterProcess(state: typeof ApState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterAging(state: typeof ApState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterSchedule(state: typeof ApState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(ApState)
  .addNode("parse_input", nodeParseInput)
  .addNode("process_invoice", nodeProcessInvoice)
  .addNode("aging_report", nodeGenerateAgingReport)
  .addNode("payment_schedule", nodeGetPaymentSchedule)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    process_invoice: "process_invoice",
    aging_report: "aging_report",
    payment_schedule: "payment_schedule",
    escalate: "escalate",
  })
  .addConditionalEdges("process_invoice", routeAfterProcess, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("aging_report", routeAfterAging, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("payment_schedule", routeAfterSchedule, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const apAgent = graph.compile()
