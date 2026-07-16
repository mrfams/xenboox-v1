import { StateGraph, START, END } from "@langchain/langgraph"
import { ControllerState } from "./state"
import {
  nodeParseInput,
  nodeReviewEntries,
  nodeReviewTrialBalance,
  nodeRunCloseChecklist,
  nodeEscalate,
} from "./nodes"

function routeAfterParse(state: typeof ControllerState.State) {
  const op = state.currentOperation?.type
  if (op === "review_trial_balance") return "review_trial_balance"
  if (op === "run_close_checklist") return "run_close_checklist"
  if (op === "reconcile_subledgers") return "run_close_checklist"
  return "review_entries"
}

function routeAfterReview(state: typeof ControllerState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

const graph = new StateGraph(ControllerState)
  .addNode("parse_input", nodeParseInput)
  .addNode("review_entries", nodeReviewEntries)
  .addNode("review_trial_balance", nodeReviewTrialBalance)
  .addNode("run_close_checklist", nodeRunCloseChecklist)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    review_entries: "review_entries",
    review_trial_balance: "review_trial_balance",
    run_close_checklist: "run_close_checklist",
  })
  .addConditionalEdges("review_entries", routeAfterReview, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("review_trial_balance", END)
  .addEdge("run_close_checklist", END)
  .addEdge("escalate", END)

export const controllerAgent = graph.compile()
