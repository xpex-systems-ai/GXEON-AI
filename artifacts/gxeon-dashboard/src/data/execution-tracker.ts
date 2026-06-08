export type ExecutionType = "Discovery" | "Proposal" | "Frontend" | "Dashboard" | "Automation" | "Documentation" | "Review" | "Delivery" | "Follow-up" | "Other";
export type ExecutionStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DELIVERED" | "VERIFIED" | "ARCHIVED";
export type ExecutionOwner = "Junior Sena" | "GXEON Operator" | "Codex" | "Copilot" | "Manual Review";
export type ExecutionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProofType = "GitHub PR" | "Vercel Preview" | "Screenshot" | "Proposal Draft" | "Client Note" | "Manual Evidence" | "Report" | "None";
export type ProofStatus = "MISSING" | "DRAFT" | "ATTACHED_REAL" | "READY_FOR_REVIEW" | "VERIFIED_REAL";

export type ExecutionRecord = {
  id: string;
  opportunity_id?: string;
  task_id: string;
  title: string;
  client_label: string;
  execution_type: ExecutionType;
  status: ExecutionStatus;
  progress_percent: number;
  owner: ExecutionOwner;
  priority: ExecutionPriority;
  estimated_value_brl: number;
  blocker?: string;
  next_action: string;
  proof_type: ProofType;
  proof_label: string;
  proof_status: ProofStatus;
  deliverable?: string;
  created_at: string;
  updated_at: string;
  data_mode: "real";
};

export type ExecutionSummary = {
  active_executions: number;
  blocked_executions: number;
  ready_for_review: number;
  delivered_real: number;
  estimated_value_in_execution_brl: number;
  average_progress: number;
  missing_proof_count: number;
};

export const executionStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DELIVERED", "VERIFIED", "ARCHIVED"];
export const executionBoardStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DELIVERED", "VERIFIED"];
export const activeExecutionStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW"];
export const proofStatuses: ProofStatus[] = ["MISSING", "DRAFT", "ATTACHED_REAL", "READY_FOR_REVIEW", "VERIFIED_REAL"];

export const realOperationalExecutions: ExecutionRecord[] = [];

export const activeOperationalExecutions: ExecutionRecord[] = [];

export function getExecutionStatusCounts(executions: ExecutionRecord[] = activeOperationalExecutions) {
  return executionStatuses.map((status) => ({
    status,
    count: executions.filter((execution) => execution.status === status).length,
    estimatedValueBrl: executions
      .filter((execution) => execution.status === status)
      .reduce((total, execution) => total + execution.estimated_value_brl, 0),
  }));
}

export function getProofStatusCounts(executions: ExecutionRecord[] = activeOperationalExecutions) {
  return proofStatuses.map((status) => ({
    status,
    count: executions.filter((execution) => execution.proof_status === status).length,
  }));
}

export function getExecutionsByStatus(status: ExecutionStatus, executions: ExecutionRecord[] = activeOperationalExecutions) {
  return executions.filter((execution) => execution.status === status);
}

export function getBlockedExecutions(executions: ExecutionRecord[] = activeOperationalExecutions) {
  return executions.filter((execution) => execution.status === "BLOCKED" || Boolean(execution.blocker));
}

export function getActiveExecutionValue(executions: ExecutionRecord[] = activeOperationalExecutions) {
  return executions
    .filter((execution) => activeExecutionStatuses.includes(execution.status))
    .reduce((total, execution) => total + execution.estimated_value_brl, 0);
}

export function getAverageExecutionProgress(executions: ExecutionRecord[] = activeOperationalExecutions) {
  if (executions.length === 0) return 0;
  return Math.round(executions.reduce((total, execution) => total + execution.progress_percent, 0) / executions.length);
}

export function getExecutionSummary(executions: ExecutionRecord[] = activeOperationalExecutions): ExecutionSummary {
  return {
    active_executions: executions.filter((execution) => activeExecutionStatuses.includes(execution.status)).length,
    blocked_executions: getBlockedExecutions(executions).length,
    ready_for_review: executions.filter((execution) => execution.status === "REVIEW" || execution.proof_status === "READY_FOR_REVIEW").length,
    delivered_real: 0,
    estimated_value_in_execution_brl: getActiveExecutionValue(executions),
    average_progress: getAverageExecutionProgress(executions),
    missing_proof_count: executions.filter((execution) => execution.proof_status === "MISSING").length,
  };
}
