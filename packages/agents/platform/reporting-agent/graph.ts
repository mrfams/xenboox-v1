import { StateGraph, START, END } from "@langchain/langgraph";
import { ReportingState } from "./state";
import {
  nodeParseInput,
  nodeGenerateProfitLoss,
  nodeGenerateBalanceSheet,
  nodeGenerateTrialBalance,
  nodeGenerateCashFlow,
  nodeGenerateBudgetVsActual,
  nodeGenerateNarrative,
  nodeEscalate,
} from "./nodes";

function routeAfterParse(state: typeof ReportingState.State) {
  const type = state.currentRequest?.type;
  if (type === "profit_loss") return "generate_profit_loss";
  if (type === "balance_sheet") return "generate_balance_sheet";
  if (type === "trial_balance") return "generate_trial_balance";
  if (type === "cash_flow") return "generate_cash_flow";
  if (type === "budget_vs_actual") return "generate_budget_vs_actual";
  if (type === "narrative_summary") return "generate_narrative";
  return "escalate";
}

function routeAfterGenerate(state: typeof ReportingState.State) {
  if (state.errors.length > 0) return "escalate";
  return END;
}

const graph = new StateGraph(ReportingState)
  .addNode("parse_input", nodeParseInput)
  .addNode("generate_profit_loss", nodeGenerateProfitLoss)
  .addNode("generate_balance_sheet", nodeGenerateBalanceSheet)
  .addNode("generate_trial_balance", nodeGenerateTrialBalance)
  .addNode("generate_cash_flow", nodeGenerateCashFlow)
  .addNode("generate_budget_vs_actual", nodeGenerateBudgetVsActual)
  .addNode("generate_narrative", nodeGenerateNarrative)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    generate_profit_loss: "generate_profit_loss",
    generate_balance_sheet: "generate_balance_sheet",
    generate_trial_balance: "generate_trial_balance",
    generate_cash_flow: "generate_cash_flow",
    generate_budget_vs_actual: "generate_budget_vs_actual",
    generate_narrative: "generate_narrative",
    escalate: "escalate",
  })
  .addConditionalEdges("generate_profit_loss", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_balance_sheet", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_trial_balance", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_cash_flow", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_budget_vs_actual", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("generate_narrative", routeAfterGenerate, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END);

export const reportingAgent = graph.compile();
