import type { GitHubDemandConversionPack } from "./githubDemandConversionTypes";

export type ExecutionPackStatus = "DRAFT" | "READY_FOR_OPERATOR" | "TASK_PREVIEW_CREATED" | "BROKER_ROUTE_PREPARED" | "EXECUTION_PREVIEW_CREATED" | "VALIDATION_PREVIEW_CREATED" | "RELEASE_PREVIEW_CREATED" | "LEDGER_PREVIEW_CREATED" | "ARCHIVED";
export type ExecutionPackRoute = "SERVICE_DELIVERY" | "BOUNTY_ATTEMPT" | "REPO_AUDIT" | "DEPLOY_RESCUE" | "DOCS_TEMPLATE" | "MCP_AGENT_INTEGRATION" | "DATA_API_CONNECTOR";
export type ExecutionPreviewKind = "TASK_PREVIEW" | "BROKER_ROUTE_PREVIEW" | "EXECUTION_CENTER_PREVIEW" | "VALIDATION_PREVIEW" | "RELEASE_PREVIEW" | "LEDGER_PREVIEW";

export type ExecutionSafetyFlags = {
  mode: "PREVIEW_ONLY";
  copyOnly: true;
  manualReviewRequired: true;
  githubWriteDisabled: true;
  externalContactDisabled: true;
  paymentProviderDisabled: true;
  rewardNotGuaranteed: true;
  runtimeExecutionDisabled: true;
  noRepoClone: true;
  noExternalCodeExecution: true;
  persistence: "IN_MEMORY_P0";
};

export const executionSafetyFlags: ExecutionSafetyFlags = {
  mode: "PREVIEW_ONLY",
  copyOnly: true,
  manualReviewRequired: true,
  githubWriteDisabled: true,
  externalContactDisabled: true,
  paymentProviderDisabled: true,
  rewardNotGuaranteed: true,
  runtimeExecutionDisabled: true,
  noRepoClone: true,
  noExternalCodeExecution: true,
  persistence: "IN_MEMORY_P0",
};

export type ExecutionPackAction = { actionType: ExecutionPreviewKind | "EXECUTION_PACK_CREATED"; status: ExecutionPackStatus | "PREVIEW_CREATED"; timestamp: string; previewId?: string };
export type GitHubDemandExecutionPack = ExecutionSafetyFlags & {
  id: string;
  conversionPackId: string;
  candidateId: string;
  status: ExecutionPackStatus;
  route: ExecutionPackRoute;
  source: "GITHUB_DEMAND_EXECUTION_PACK";
  conversionPack: GitHubDemandConversionPack;
  createdAt: string;
  updatedAt: string;
  operatorSummary: string;
  offerTitle: string;
  suggestedValue: string;
  suggestedTimebox: string;
  suggestedPriceReminder: string;
  technicalChecklist: string[];
  evidenceChecklist: string[];
  deliveryArtifacts: string[];
  validationChecklist: string[];
  manualReviewChecklist: string[];
  riskWarnings: string[];
  scopeIncluded: string[];
  scopeExcluded: string[];
  rollbackBoundaries: string[];
  clientPaymentBoundary: string[];
  ledgerPreview: { status: "PREVIEW_ONLY"; expectedValueBrl: number; expectedValueUsd: number; amountNotGuaranteed: true; markRevenueReceivedDisabled: true; paymentProviderDisabled: true };
  brainSprintReference: { targetBrl: number; route: string; reason: string; manualReviewRequired: true };
  taskPreviewPayload: { title: string; checklist: string[]; copyOnly: true; mode: "PREVIEW_ONLY" };
  brokerRouteHint: { route: ExecutionPackRoute; priority: "MANUAL_OPERATOR_REVIEW"; previewOnly: true };
  nextManualAction: string;
  actionHistory: ExecutionPackAction[];
};

export type ExecutionPackActionResult = {
  actionType: ExecutionPreviewKind | "EXECUTION_PACK_CREATED";
  status: ExecutionPackStatus;
  packId: string;
  mode: "PREVIEW_ONLY";
  safetyFlags: ExecutionSafetyFlags;
  nextManualAction: string;
  preview: Record<string, unknown>;
};
