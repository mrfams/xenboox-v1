import { StateGraph, START, END } from "@langchain/langgraph"
import { TreasuryState } from "./state"
import {
  nodeParseInput,
  nodeGetCashPosition,
  nodeRunReconciliation,
  nodeRunCashCheck,
  nodeRunMobileMoneyReconciliation,
  nodeProcessExpenses,
  nodeGenerateDailyReport,
  nodeEscalate,
} from "./nodes"

function routeAfterParse(state: typeof TreasuryState.State) {
  const op = state.currentOperation?.type
  if (op === "reconcile") return "run_reconciliation"
  if (op === "daily_report") return "generate_daily_report"
  if (op === "cash_count") return "run_cash_check"
  if (op === "mm_reconcile") return "run_mm_reconciliation"
  if (op === "submit_expense") return "process_expenses"
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
  .addNode("run_cash_check", nodeRunCashCheck)
  .addNode("run_mm_reconciliation", nodeRunMobileMoneyReconciliation)
  .addNode("process_expenses", nodeProcessExpenses)
  .addNode("generate_daily_report", nodeGenerateDailyReport)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    get_cash_position: "get_cash_position",
    run_reconciliation: "run_reconciliation",
    run_cash_check: "run_cash_check",
    run_mm_reconciliation: "run_mm_reconciliation",
    process_expenses: "process_expenses",
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
  .addConditionalEdges("run_cash_check", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("run_mm_reconciliation", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("process_expenses", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const treasuryAgent = graph.compile()
