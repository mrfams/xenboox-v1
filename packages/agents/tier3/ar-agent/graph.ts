import { StateGraph, START, END } from "@langchain/langgraph"
import { ArState } from "./state"
import {
  nodeParseInput,
  nodeGenerateAgingReport,
  nodeGetOverdueAlerts,
  nodeMatchPayment,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof ArState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "aging_report") return "aging_report"
  if (op === "overdue_alerts") return "overdue_alerts"
  if (op === "match_payment") return "match_payment"
  return "escalate"
}

function routeAfterOperation(state: typeof ArState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(ArState)
  .addNode("parse_input", nodeParseInput)
  .addNode("aging_report", nodeGenerateAgingReport)
  .addNode("overdue_alerts", nodeGetOverdueAlerts)
  .addNode("match_payment", nodeMatchPayment)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    aging_report: "aging_report",
    overdue_alerts: "overdue_alerts",
    match_payment: "match_payment",
    escalate: "escalate",
  })
  .addConditionalEdges("aging_report", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("overdue_alerts", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("match_payment", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const arAgent = graph.compile()
