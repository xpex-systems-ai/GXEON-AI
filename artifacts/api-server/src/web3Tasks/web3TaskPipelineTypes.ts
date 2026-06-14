import type { Web3TaskPreview, Web3TaskRiskFlag } from "./web3TaskTypes";

export type Web3PipelineLinkMode = "PREVIEW_ONLY";
export type Web3PipelineLinkStatus = "READY_FOR_REVIEW" | "QUALIFIED_FOR_TASK_QUEUE" | "BLOCKED_BY_RISK" | "NEEDS_OPERATOR_REVIEW" | "CANCELLED";
export type Web3MonetizationUrgency = "IMMEDIATE" | "FAST" | "NORMAL" | "LOW";
export type Web3ExecutionLane = "CONTENT" | "DEV" | "AUDIT" | "RESEARCH" | "COMMUNITY" | "SKIP";

export const web3PipelineSafetyFlags = {
  mode: "PREVIEW_ONLY" as const,
  manualExecutionRequired: true as const,
  externalSubmissionDisabled: true as const,
  walletConnectionRequired: false as const,
  rewardNotGuaranteed: true as const,
  operatorApprovalRequired: true as const,
};

export type Web3TaskOpportunityPreview = typeof web3PipelineSafetyFlags & {
  id: string;
  web3TaskPreviewId: string;
  title: string;
  sourceUrl: string;
  summary: string;
  estimatedRewardUsd: number | null;
  estimatedRewardBrl: number | null;
  opportunityScore: number;
  riskScore: number;
  urgencyScore: number;
  payoutClarityScore: number;
  aiAssistScore: number;
  urgencyLabel: Web3MonetizationUrgency;
  suggestedExecutionLane: Web3ExecutionLane;
  qualificationReasons: string[];
  blockedActions: string[];
  createdAt: string;
};

export type Web3TaskQueuePreview = typeof web3PipelineSafetyFlags & {
  id: string;
  web3TaskPreviewId: string;
  opportunityPreviewId: string;
  title: string;
  summary: string;
  status: "TASK_PREVIEW_READY" | "TASK_PREVIEW_BLOCKED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggestedExecutionLane: Web3ExecutionLane;
  evidenceChecklist: string[];
  submissionPreparationChecklist: string[];
  nextManualAction: string;
  blockedActions: string[];
  approvalGates: string[];
  createdAt: string;
};

export type Web3TaskPipelineLinkRecord = typeof web3PipelineSafetyFlags & {
  id: string;
  status: Web3PipelineLinkStatus;
  web3TaskPreviewId: string;
  opportunityPreviewId: string | null;
  taskPreviewId: string | null;
  brokerDecisionId?: string;
  executionPreviewId?: string;
  estimatedRewardUsd: number | null;
  estimatedRewardBrl: number | null;
  opportunityScore: number;
  riskScore: number;
  urgencyScore: number;
  payoutClarityScore: number;
  aiAssistScore: number;
  urgencyLabel: Web3MonetizationUrgency;
  suggestedExecutionLane: Web3ExecutionLane;
  qualificationReasons: string[];
  blockingReasons: string[];
  criticalRiskFlags: Web3TaskRiskFlag[];
  opportunityPreview: Web3TaskOpportunityPreview | null;
  taskPreview: Web3TaskQueuePreview | null;
  brokerPreparation?: unknown;
  sourcePreview: Web3TaskPreview;
  createdAt: string;
  updatedAt: string;
};
