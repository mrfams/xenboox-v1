import { StateGraph, START, END } from "@langchain/langgraph"
import { PayrollManagerState } from "./state"
import {
  nodeParseInput,
  nodeProcessPayroll,
  nodeValidatePayroll,
  nodeDispatchToWorker,
  nodeCloseConfirmation,
  nodeEscalate,
} from "./nodes"

function routeAfterParse(state: typeof PayrollManagerState.State) {
  const op = state.currentOperation?.type
  if (op === "validate_payroll") return "validate_payroll"
  if (op === "close_confirmation") return "close_confirmation"
  return "process_payroll"
}

function routeAfterProcess(state: typeof PayrollManagerState.State) {
  if (state.errors.length > 0) return "escalate"
  return "dispatch_to_worker"
}

function routeAfterDispatch(state: typeof PayrollManagerState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

const graph = new StateGraph(PayrollManagerState)
  .addNode("parse_input", nodeParseInput)
  .addNode("process_payroll", nodeProcessPayroll)
  .addNode("validate_payroll", nodeValidatePayroll)
  .addNode("dispatch_to_worker", nodeDispatchToWorker)
  .addNode("close_confirmation", nodeCloseConfirmation)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    process_payroll: "process_payroll",
    validate_payroll: "validate_payroll",
    close_confirmation: "close_confirmation",
  })
  .addConditionalEdges("process_payroll", routeAfterProcess, {
    escalate: "escalate",
    dispatch_to_worker: "dispatch_to_worker",
  })
  .addConditionalEdges("dispatch_to_worker", routeAfterDispatch, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("validate_payroll", END)
  .addEdge("close_confirmation", END)
  .addEdge("escalate", END)

export const payrollManagerAgent = graph.compile()
