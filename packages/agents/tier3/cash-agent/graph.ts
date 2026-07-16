import { StateGraph, START, END } from "@langchain/langgraph"
import { CashState } from "./state"
import {
  nodeParseInput,
  nodeDailyCashPosition,
  nodeIssueImprest,
  nodeRetireImprest,
  nodeCountCash,
  nodeDetectDiscrepancies,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof CashState.State) {
  if (state.errors.length > 0) return "escalate"
  const opType = state.currentOperation?.type
  if (opType === "daily_cash_position") return "daily_cash_position"
  if (opType === "issue_imprest") return "issue_imprest"
  if (opType === "retire_imprest") return "retire_imprest"
  if (opType === "count_cash") return "count_cash"
  if (opType === "detect_discrepancy") return "detect_discrepancy"
  return "escalate"
}

function routeAfterOperation(state: typeof CashState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(CashState)
  .addNode("parse_input", nodeParseInput)
  .addNode("daily_cash_position", nodeDailyCashPosition)
  .addNode("issue_imprest", nodeIssueImprest)
  .addNode("retire_imprest", nodeRetireImprest)
  .addNode("count_cash", nodeCountCash)
  .addNode("detect_discrepancy", nodeDetectDiscrepancies)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    daily_cash_position: "daily_cash_position",
    issue_imprest: "issue_imprest",
    retire_imprest: "retire_imprest",
    count_cash: "count_cash",
    detect_discrepancy: "detect_discrepancy",
    escalate: "escalate",
  })
  .addConditionalEdges("daily_cash_position", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("issue_imprest", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("retire_imprest", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("count_cash", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("detect_discrepancy", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const cashAgent = graph.compile()
