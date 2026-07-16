import { StateGraph, START, END } from "@langchain/langgraph"
import { CfoState } from "./state"
import {
  nodeClassifyInput,
  nodeRouteInstruction,
  nodeAnswerQuestion,
  nodeInitiateClose,
  nodeCollectDepartmentStatus,
  nodeProcessEscalation,
  nodeGenerateSummary,
  nodeEscalateToHuman,
} from "./nodes"

function routeAfterClassify(state: typeof CfoState.State) {
  const taskType = state.currentTask?.type
  if (taskType === "question") return "answer_question"
  if (taskType === "close_trigger") return "initiate_close"
  if (taskType === "escalation_review") return "process_escalation"
  if (taskType === "report_request") return "generate_summary"
  return "route_instruction"
}

function routeAfterRoute(state: typeof CfoState.State) {
  if (state.errors.length > 0 || state.confidence < 0.4) return "escalate_to_human"
  return END
}

function routeAfterCollect(state: typeof CfoState.State) {
  if (state.closeState?.status === "awaiting_human_approval") return END
  if (state.errors.length > 0) return "escalate_to_human"
  return END
}

const graph = new StateGraph(CfoState)
  .addNode("classify_input", nodeClassifyInput)
  .addNode("route_instruction", nodeRouteInstruction)
  .addNode("answer_question", nodeAnswerQuestion)
  .addNode("initiate_close", nodeInitiateClose)
  .addNode("collect_department_status", nodeCollectDepartmentStatus)
  .addNode("process_escalation", nodeProcessEscalation)
  .addNode("generate_summary", nodeGenerateSummary)
  .addNode("escalate_to_human", nodeEscalateToHuman)
  .addEdge(START, "classify_input")
  .addConditionalEdges("classify_input", routeAfterClassify, {
    route_instruction: "route_instruction",
    answer_question: "answer_question",
    initiate_close: "initiate_close",
    process_escalation: "process_escalation",
    generate_summary: "generate_summary",
  })
  .addConditionalEdges("route_instruction", routeAfterRoute, {
    escalate_to_human: "escalate_to_human",
    [END]: END,
  })
  .addEdge("answer_question", END)
  .addEdge("initiate_close", "collect_department_status")
  .addConditionalEdges("collect_department_status", routeAfterCollect, {
    escalate_to_human: "escalate_to_human",
    [END]: END,
  })
  .addEdge("process_escalation", END)
  .addEdge("generate_summary", END)
  .addEdge("escalate_to_human", END)

export const cfoAgent = graph.compile()
