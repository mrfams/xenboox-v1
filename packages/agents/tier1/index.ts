export { cfoAgent } from "./cfo-agent/graph";
export { CfoState } from "./cfo-agent/state";
export type {
  CfoStateType,
  LivenessState,
  SourceRef,
  DepartmentResponse,
  EscalationFrame,
  DepartmentConfirmation,
  EscalationItem,
} from "./cfo-agent/state";
export { buildCfoSystemPrompt } from "./cfo-agent/prompts";
export {
  classifyInstruction,
  routeToDepartment,
  routeToDepartments,
  evaluateCloseReadiness,
  createSourceRef,
  synthesizeResponse,
  frameEscalation,
  isWaitingOnDepartments,
  getDepartmentDisplayName,
  ALL_DEPARTMENT_NAMES,
} from "./cfo-agent/tools";
export type { InstructionType, Department } from "./cfo-agent/tools";
