import { StateGraph, START, END } from "@langchain/langgraph"
import { ReconciliationState } from "./state"
import {
  nodeParseInput,
  nodeMatchTransactions,
  nodeIngestStatement,
  nodeReconciliationReport,
  nodeFlagUnmatched,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof ReconciliationState.State) {
  if (state.errors.length > 0) return "escalate"
  const opType = state.currentOperation?.type
  if (opType === "match_transactions") return "match_transactions"
  if (opType === "ingest_statement") return "ingest_statement"
  if (opType === "reconciliation_report") return "reconciliation_report"
  if (opType === "flag_unmatched") return "flag_unmatched"
  return "escalate"
}

function routeAfterMatch(state: typeof ReconciliationState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterIngest(state: typeof ReconciliationState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterReport(state: typeof ReconciliationState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterFlag(state: typeof ReconciliationState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(ReconciliationState)
  .addNode("parse_input", nodeParseInput)
  .addNode("match_transactions", nodeMatchTransactions)
  .addNode("ingest_statement", nodeIngestStatement)
  .addNode("reconciliation_report", nodeReconciliationReport)
  .addNode("flag_unmatched", nodeFlagUnmatched)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    match_transactions: "match_transactions",
    ingest_statement: "ingest_statement",
    reconciliation_report: "reconciliation_report",
    flag_unmatched: "flag_unmatched",
    escalate: "escalate",
  })
  .addConditionalEdges("match_transactions", routeAfterMatch, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("ingest_statement", routeAfterIngest, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("reconciliation_report", routeAfterReport, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("flag_unmatched", routeAfterFlag, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const reconciliationAgent = graph.compile()
