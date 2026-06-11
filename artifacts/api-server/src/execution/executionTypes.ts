import type { BrokerDecisionPreview } from "../broker/brokerTypes";

export type ExecutionMode = "PREVIEW_ONLY";

export type ExecutionPreviewStatus =
  | "NOT_STARTED"
  | "READY_FOR_OPERATOR"
  | "BLOCKED"
  | "IN_MANUAL_PROGRESS"
  | "READY_FOR_REVIEW"
  | "CANCELLED";

export type ExecutionChecklistItem = {
  id: string;
  label: string;
  required: true;
  completed: false;
  source: "BROKER" | "EXECUTION_CENTER" | "OPERATOR_GATE";
};

export type ExecutionEvidenceRequirement = {
  id: string;
  label: string;
  required: true;
  collected: false;
  reason: string;
};

export type ExecutionSafetyBoundary = {
  mode: ExecutionMode;
  executionDisabled: true;
  approvalRequired: true;
  evidenceRequired: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
};

export type ExecutionPreviewCreateInput = {
  brokerDecisionId?: string;
  brokerDecision?: BrokerDecisionPreview;
  title?: string;
  taskId?: string | null;
  recommendedAgentIds?: string[];
  riskEnergy?: number;
  blockedActions?: string[];
  approvalGates?: string[];
  operatorNextAction?: string;
};

export type ExecutionPreviewRecord = ExecutionSafetyBoundary & {
  id: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title: string;
  status: ExecutionPreviewStatus;
  recommendedAgentIds: string[];
  riskEnergy: number;
  blockedActions: string[];
  approvalGates: string[];
  checklist: ExecutionChecklistItem[];
  evidenceRequirements: ExecutionEvidenceRequirement[];
  blockers: string[];
  rollbackPlan: string[];
  operatorNextAction: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionCenterStatus = ExecutionSafetyBoundary & {
  status: "EXECUTION_CENTER_P0_READY";
  recordsInMemory: number;
  allowedStatuses: ExecutionPreviewStatus[];
  boundaries: string[];
};
