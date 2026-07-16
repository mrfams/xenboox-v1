import { StateGraph, START, END } from "@langchain/langgraph"
import { AnalyticsState } from "./state"
import {
  nodeParseInput,
  nodeFinancialRatios,
  nodeKpiDashboard,
  nodeTrendAnalysis,
  nodeCashFlowAnalysis,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof AnalyticsState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "financial_ratios") return "financial_ratios"
  if (op === "kpi_dashboard") return "kpi_dashboard"
  if (op === "trend_analysis") return "trend_analysis"
  if (op === "cash_flow_analysis") return "cash_flow_analysis"
  return "escalate"
}

function routeAfterOperation(state: typeof AnalyticsState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(AnalyticsState)
  .addNode("parse_input", nodeParseInput)
  .addNode("financial_ratios", nodeFinancialRatios)
  .addNode("kpi_dashboard", nodeKpiDashboard)
  .addNode("trend_analysis", nodeTrendAnalysis)
  .addNode("cash_flow_analysis", nodeCashFlowAnalysis)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    financial_ratios: "financial_ratios",
    kpi_dashboard: "kpi_dashboard",
    trend_analysis: "trend_analysis",
    cash_flow_analysis: "cash_flow_analysis",
    escalate: "escalate",
  })
  .addConditionalEdges("financial_ratios", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("kpi_dashboard", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("trend_analysis", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("cash_flow_analysis", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const analyticsAgent = graph.compile()
