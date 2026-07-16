import { StateGraph, START, END } from "@langchain/langgraph"
import { InventoryState } from "./state"
import {
  nodeParseInput,
  nodeCalculateCogs,
  nodeValuationAdjustment,
  nodeGetInventorySummary,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof InventoryState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "calculate_cogs") return "calculate_cogs"
  if (op === "valuation_adjustment") return "valuation_adjustment"
  if (op === "inventory_summary") return "inventory_summary"
  return "escalate"
}

function routeAfterOperation(state: typeof InventoryState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(InventoryState)
  .addNode("parse_input", nodeParseInput)
  .addNode("calculate_cogs", nodeCalculateCogs)
  .addNode("valuation_adjustment", nodeValuationAdjustment)
  .addNode("inventory_summary", nodeGetInventorySummary)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    calculate_cogs: "calculate_cogs",
    valuation_adjustment: "valuation_adjustment",
    inventory_summary: "inventory_summary",
    escalate: "escalate",
  })
  .addConditionalEdges("calculate_cogs", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("valuation_adjustment", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("inventory_summary", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const inventoryAgent = graph.compile()
