import { StateGraph, START, END } from "@langchain/langgraph"
import { TreasuryState } from "./state"
import {
  nodeParseInput,
  nodeGetCashPosition,
  nodeRunReconciliation,
  nodeGenerateDailyReport,
  nodeEscalate,
} from "./nodes"

function routeAfterParse(state: typeof TreasuryState.State) {
  const op = state.currentOperation?.type
  if (op === "reconcile") return "run_reconciliation"
  if (op === "daily_report") return "generate_daily_report"
  if (op === "close") return "escalate"
  return "get_cash_position"
}

function routeAfterOperation(state: typeof TreasuryState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

const graph = new StateGraph(TreasuryState)
  .addNode("parse_input", nodeParseInput)
  .addNode("get_cash_position", nodeGetCashPosition)
  .addNode("run_reconciliation", nodeRunReconciliation)
  .addNode("generate_daily_report", nodeGenerateDailyReport)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    get_cash_position: "get_cash_position",
    run_reconciliation: "run_reconciliation",
    generate_daily_report: "generate_daily_report",
    escalate: "escalate",
  })
  .addConditionalEdges("get_cash_position", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("run_reconciliation", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_daily_report", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const treasuryAgent = graph.compile()
