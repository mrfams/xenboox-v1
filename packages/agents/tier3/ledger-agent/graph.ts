import { StateGraph, START, END } from "@langchain/langgraph"
import { LedgerState } from "./state"
import {
  nodeParseInput,
  nodeValidateEntry,
  nodePostEntry,
  nodeTrialBalance,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterValidation(state: typeof LedgerState.State) {
  if (state.errors.length > 0) return "escalate"
  if (state.currentOperation?.type === "trial_balance") return "trial_balance"
  if (state.currentOperation?.type === "post_entry") return "post_entry"
  return END
}

function routeAfterPost(state: typeof LedgerState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(LedgerState)
  .addNode("parse_input", nodeParseInput)
  .addNode("validate_entry", nodeValidateEntry)
  .addNode("post_entry", nodePostEntry)
  .addNode("trial_balance", nodeTrialBalance)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addEdge("parse_input", "validate_entry")
  .addConditionalEdges("validate_entry", routeAfterValidation, {
    post_entry: "post_entry",
    trial_balance: "trial_balance",
    escalate: "escalate",
  })
  .addConditionalEdges("post_entry", routeAfterPost, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("trial_balance", END)
  .addEdge("escalate", END)

export const ledgerAgent = graph.compile()
