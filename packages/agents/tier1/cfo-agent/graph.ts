import { StateGraph, START, END } from "@langchain/langgraph";
import { CfoState } from "./state";
import {
  nodeClassifyInput,
  nodeRouteToDepartments,
  nodeAwaitDepartmentSummaries,
  nodeSynthesizeAnswer,
  nodeRespondToHuman,
  nodeAnswerQuestion,
  nodeInitiateClose,
  nodeCollectDepartmentStatus,
  nodeProcessEscalation,
  nodeFrameEscalation,
  nodeGenerateSummary,
  nodeEscalateToHuman,
} from "./nodes";

// ─── Liveness State Machine Routing (§2 of Liveness Spec) ──────────────────

function routeAfterClassify(state: typeof CfoState.State) {
  const taskType = state.currentTask?.type;
  // Route to the right processing path based on classification
  if (taskType === "question") return "answer_question";
  if (taskType === "close_trigger") return "initiate_close";
  if (taskType === "escalation_review") return "process_escalation";
  if (taskType === "report_request") return "generate_summary";
  // Default: multi-department routing (instructions, close_flag, etc.)
  return "route_to_departments";
}

function routeAfterDepartments(state: typeof CfoState.State) {
  // If escalation was triggered by a department head, route to escalation framing
  if (state.livenessState === "ESCALATION_RECEIVED_FROM_DEPT_HEAD") {
    return "frame_escalation";
  }
  // Otherwise proceed to await summaries
  return "await_department_summaries";
}

function routeAfterAwait(state: typeof CfoState.State) {
  // Always proceed to synthesis after await phase
  // (waiting status is communicated through humanResponse, not blocking)
  return "synthesize_answer";
}

function routeAfterSynth(state: typeof CfoState.State) {
  // After synthesis, always respond to human
  return "respond_to_human";
}

function routeAfterCollect(state: typeof CfoState.State) {
  // Close flow: if ready for approval or errors, route accordingly
  if (state.closeState?.status === "awaiting_human_approval") return END;
  if (state.errors.length > 0) return "escalate_to_human";
  return END;
}

const graph = new StateGraph(CfoState)
  // ── Nodes ──────────────────────────────────────────────────────────────
  .addNode("classify_input", nodeClassifyInput)
  .addNode("route_to_departments", nodeRouteToDepartments)
  .addNode("await_department_summaries", nodeAwaitDepartmentSummaries)
  .addNode("synthesize_answer", nodeSynthesizeAnswer)
  .addNode("respond_to_human", nodeRespondToHuman)
  .addNode("answer_question", nodeAnswerQuestion)
  .addNode("initiate_close", nodeInitiateClose)
  .addNode("collect_department_status", nodeCollectDepartmentStatus)
  .addNode("process_escalation", nodeProcessEscalation)
  .addNode("frame_escalation", nodeFrameEscalation)
  .addNode("generate_summary", nodeGenerateSummary)
  .addNode("escalate_to_human", nodeEscalateToHuman)

  // ── Edges ──────────────────────────────────────────────────────────────
  .addEdge(START, "classify_input")

  // After classification, route to the correct path
  .addConditionalEdges("classify_input", routeAfterClassify, {
    route_to_departments: "route_to_departments",
    answer_question: "answer_question",
    initiate_close: "initiate_close",
    process_escalation: "process_escalation",
    generate_summary: "generate_summary",
  })

  // Departments flow: INSTRUCTION_RECEIVED → ROUTING → AWAITING → SYNTHESIZING → RESPONDING
  .addConditionalEdges("route_to_departments", routeAfterDepartments, {
    frame_escalation: "frame_escalation",
    await_department_summaries: "await_department_summaries",
  })
  .addConditionalEdges("await_department_summaries", routeAfterAwait, {
    synthesize_answer: "synthesize_answer",
  })
  .addConditionalEdges("synthesize_answer", routeAfterSynth, {
    respond_to_human: "respond_to_human",
  })
  .addEdge("respond_to_human", END)

  // Question flow
  .addEdge("answer_question", END)

  // Close flow
  .addEdge("initiate_close", "collect_department_status")
  .addConditionalEdges("collect_department_status", routeAfterCollect, {
    escalate_to_human: "escalate_to_human",
    [END]: END,
  })

  // Escalation flow: ESCALATION_RECEIVED → FRAMING → PRESENTED
  .addEdge("process_escalation", "frame_escalation")
  .addEdge("frame_escalation", "escalate_to_human")
  .addEdge("escalate_to_human", END)

  // Summary flow
  .addEdge("generate_summary", END);

export const cfoAgent = graph.compile();
