import { StateGraph, START, END } from "@langchain/langgraph";
import { ExpenseState } from "./state";
import {
  nodeParseInput,
  nodeExtractReceipt,
  nodeCheckPolicy,
  nodeRouteApproval,
  nodeEscalate,
} from "./nodes";

function routeAfterParse(state: typeof ExpenseState.State) {
  if (state.errors.length > 0) return "escalate";
  const opType = state.currentOperation?.type;
  if (opType === "extract_receipt") return "extract_receipt";
  if (opType === "check_policy_compliance") return "check_policy";
  if (opType === "route_for_approval") return "route_approval";
  return "escalate";
}

function routeAfterOperation(state: typeof ExpenseState.State) {
  if (state.errors.length > 0) return "escalate";
  return END;
}

const workflow = new StateGraph(ExpenseState)
  .addNode("parse_input", nodeParseInput)
  .addNode("extract_receipt", nodeExtractReceipt)
  .addNode("check_policy", nodeCheckPolicy)
  .addNode("route_approval", nodeRouteApproval)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    extract_receipt: "extract_receipt",
    check_policy: "check_policy",
    route_approval: "route_approval",
    escalate: "escalate",
  })
  .addConditionalEdges("extract_receipt", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("check_policy", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("route_approval", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END);

export const expenseAgent = workflow.compile();
