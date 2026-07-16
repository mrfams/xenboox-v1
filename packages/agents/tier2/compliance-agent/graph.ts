import { StateGraph, START, END } from "@langchain/langgraph"
import { ComplianceState } from "./state"
import {
  nodeParseInput,
  nodeReviewTaxPosition,
  nodeCheckFilingStatus,
  nodeCloseConfirmation,
  nodeEscalate,
} from "./nodes"

function routeAfterParse(state: typeof ComplianceState.State) {
  const op = state.currentOperation?.type
  if (op === "filing_status") return "filing_status"
  if (op === "close_confirmation") return "close_confirmation"
  return "tax_review"
}

function routeAfterWork(state: typeof ComplianceState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

const graph = new StateGraph(ComplianceState)
  .addNode("parse_input", nodeParseInput)
  .addNode("tax_review", nodeReviewTaxPosition)
  .addNode("filing_status", nodeCheckFilingStatus)
  .addNode("close_confirmation", nodeCloseConfirmation)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    tax_review: "tax_review",
    filing_status: "filing_status",
    close_confirmation: "close_confirmation",
  })
  .addConditionalEdges("tax_review", routeAfterWork, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("filing_status", END)
  .addEdge("close_confirmation", END)
  .addEdge("escalate", END)

export const complianceAgent = graph.compile()
