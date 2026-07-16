import { StateGraph, START, END } from "@langchain/langgraph"
import { BudgetState } from "./state"
import {
  nodeParseInput,
  nodeVarianceAnalysis,
  nodeBudgetVsActual,
  nodeCreateBudget,
  nodeBudgetForecast,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof BudgetState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "variance_analysis") return "variance_analysis"
  if (op === "budget_vs_actual") return "budget_vs_actual"
  if (op === "create_budget") return "create_budget"
  if (op === "budget_forecast") return "budget_forecast"
  return "escalate"
}

function routeAfterOperation(state: typeof BudgetState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(BudgetState)
  .addNode("parse_input", nodeParseInput)
  .addNode("variance_analysis", nodeVarianceAnalysis)
  .addNode("budget_vs_actual", nodeBudgetVsActual)
  .addNode("create_budget", nodeCreateBudget)
  .addNode("budget_forecast", nodeBudgetForecast)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    variance_analysis: "variance_analysis",
    budget_vs_actual: "budget_vs_actual",
    create_budget: "create_budget",
    budget_forecast: "budget_forecast",
    escalate: "escalate",
  })
  .addConditionalEdges("variance_analysis", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("budget_vs_actual", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("create_budget", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("budget_forecast", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const budgetAgent = graph.compile()
