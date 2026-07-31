export { cfoAgent } from "./graph";
export { CfoState } from "./state";
export type {
  CfoStateType,
  LivenessState,
  SourceRef,
  DepartmentResponse,
  EscalationFrame,
  DepartmentConfirmation,
  EscalationItem,
} from "./state";
export { buildCfoSystemPrompt } from "./prompts";
export type { CfoEntityContext } from "./prompts";
export {
  classifyInstruction,
  routeToDepartment,
  routeToDepartments,
  evaluateCloseReadiness,
  createEscalation,
  getEntityFinancialSummary,
  createSourceRef,
  synthesizeResponse,
  frameEscalation,
  isWaitingOnDepartments,
  getDepartmentDisplayName,
  ALL_DEPARTMENT_NAMES,
} from "./tools";
export type { InstructionType, Department } from "./tools";
