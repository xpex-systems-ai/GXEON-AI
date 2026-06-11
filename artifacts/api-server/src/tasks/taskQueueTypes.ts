import type { OpportunityRiskFlag } from "../opportunities/opportunityTypes";

export type TaskQueueStatus = "TASK_READY" | "APPROVAL_REQUIRED" | "APPROVED_FOR_MANUAL_EXECUTION" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type TaskQueuePriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskQueueRecord = {
  id: string;
  opportunityId: string;
  proposalPreviewId?: string;
  taskPreviewId?: string;
  evidencePlanId?: string;
  status: TaskQueueStatus;
  priority: TaskQueuePriority;
  title: string;
  summary: string;
  category: string;
  score: number;
  riskFlags: OpportunityRiskFlag[];
  nextStep: string;
  sourceUrl: string | null;
  repository: string | null;
  executionChecklist: string[];
  requiredConnectors: string[];
  approvalGates: string[];
  forbiddenActions: string[];
  evidenceRequirements: string[];
  rollbackRequirements: string[];
  manualApprovalRequired: true;
  autonomousExecution: false;
  externalAction: false;
  paymentAction: false;
  operatorConfirmed: true;
  createdAt: string;
  updatedAt: string;
};

export type TaskQueueCounts = Record<TaskQueueStatus, number> & {
  total: number;
  open: number;
  blocked: number;
  approvedForManualExecution: number;
  done: number;
  cancelled: number;
};

export type CreateTaskFromOpportunityRequest = {
  operatorConfirmed?: boolean;
  duplicate?: boolean;
  proposalPreviewId?: string;
  taskPreviewId?: string;
  evidencePlanId?: string;
};

export type TaskQueueReadinessStatus = {
  status: "P1_TASK_QUEUE_READY";
  persistence: "IN_MEMORY_P1";
  manualFirst: true;
  manualApprovalRequired: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  executionEndpointExposed: false;
  counts: TaskQueueCounts;
  safeTransitions: Record<TaskQueueStatus, TaskQueueStatus[]>;
  boundaries: string[];
};
