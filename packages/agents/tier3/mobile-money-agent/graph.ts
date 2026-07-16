import { StateGraph, START, END } from "@langchain/langgraph"
import { MobileMoneyState } from "./state"
import {
  nodeParseInput,
  nodeIngestStatement,
  nodeMatchTransactions,
  nodeReconcileWallet,
  nodeTrackFees,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof MobileMoneyState.State) {
  if (state.errors.length > 0) return "escalate"
  const opType = state.currentOperation?.type
  if (opType === "ingest_statement") return "ingest_statement"
  if (opType === "match_transactions") return "match_transactions"
  if (opType === "reconcile_wallet") return "reconcile_wallet"
  if (opType === "track_fees") return "track_fees"
  return "escalate"
}

function routeAfterIngest(state: typeof MobileMoneyState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterMatch(state: typeof MobileMoneyState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterReconcile(state: typeof MobileMoneyState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterFees(state: typeof MobileMoneyState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(MobileMoneyState)
  .addNode("parse_input", nodeParseInput)
  .addNode("ingest_statement", nodeIngestStatement)
  .addNode("match_transactions", nodeMatchTransactions)
  .addNode("reconcile_wallet", nodeReconcileWallet)
  .addNode("track_fees", nodeTrackFees)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    ingest_statement: "ingest_statement",
    match_transactions: "match_transactions",
    reconcile_wallet: "reconcile_wallet",
    track_fees: "track_fees",
    escalate: "escalate",
  })
  .addConditionalEdges("ingest_statement", routeAfterIngest, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("match_transactions", routeAfterMatch, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("reconcile_wallet", routeAfterReconcile, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("track_fees", routeAfterFees, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const mobileMoneyAgent = graph.compile()
