export type AgentEconomyMode = "PREVIEW_ONLY";
export type AgentEconomySourceType = "MCP_ECOSYSTEM" | "MODEL_ROUTING" | "MODEL_AND_DATASET_HUB" | "REPOSITORY_ECOSYSTEM" | "AGENT_FRAMEWORK" | "RAG_AND_AGENT_FRAMEWORK" | "MULTI_AGENT_FRAMEWORK" | "LOCAL_MODEL_RUNTIME" | "OPERATOR_INPUT";
export type IntegrationCandidateCategory = "MCP_SERVER" | "MODEL_ROUTER" | "CONNECTOR" | "AGENT_FRAMEWORK" | "RAG_TOOL" | "BROWSER_AGENT" | "GITHUB_TOOL" | "DATABASE_TOOL" | "DEPLOYMENT_TOOL" | "SECURITY_TOOL" | "UNKNOWN";
export type IntegrationDecision = "INTEGRATE_NOW" | "WATCHLIST" | "NEEDS_SECURITY_REVIEW" | "SKIP" | "BLOCKED";
export type IntegrationRiskFlag = "UNKNOWN_LICENSE" | "NO_MAINTENANCE_SIGNAL" | "SHELL_EXECUTION_REQUIRED" | "CURL_BASH_INSTALL" | "SECRET_OR_TOKEN_REQUIRED" | "PRIVATE_KEY_REQUIRED" | "BROWSER_CONTROL_RISK" | "GITHUB_WRITE_RISK" | "PAYMENT_ACTION_RISK" | "DATABASE_WRITE_RISK" | "UNKNOWN_OWNER" | "UNSAFE_INSTALL_SCRIPT" | "PROMPT_INJECTION_SURFACE" | "TOOL_POISONING_RISK" | "EXTERNAL_API_COST_RISK";
export type IntegrationCandidateStatus = "PREVIEW_CREATED" | "CONNECTOR_PREVIEW_CREATED" | "TASK_QUEUE_PREVIEW_READY" | "NEEDS_MANUAL_REVIEW" | "BLOCKED";

export type AgentEconomySource = { id: string; label: string; type: AgentEconomySourceType; bestFor: string[]; manualOnly: true; riskNotes: string[]; monetizationAngles: string[] };
export type IntegrationCandidateInput = { title?: string; url?: string; sourceId?: string; categoryHint?: IntegrationCandidateCategory | string; licenseHint?: string; maintenanceHint?: string; notes?: string; monetizationAngle?: string; repositoryMetadata?: Record<string, unknown> };
export type ConnectorPreview = { suggestedIntegrationType: "READ_ONLY_CONNECTOR" | "MCP_GATEWAY_CANDIDATE" | "MODEL_ROUTER_CANDIDATE" | "AGENT_FRAMEWORK_CANDIDATE" | "SECURITY_REVIEW_REQUIRED"; implementationPlan: string[]; safetyChecklist: string[]; monetizationAngles: string[]; nextManualAction: string };
export type TaskPreview = { title: string; mode: AgentEconomyMode; internalOnly: true; taskQueueMutationDisabled: true; brokerPreparation: string[]; validationPlan: string[]; releaseGateNotes: string[]; ledgerPreviewNotes: string[]; nextManualAction: string };
export type IntegrationCandidatePreview = {
  id: string; createdAt: string; updatedAt: string; mode: AgentEconomyMode; title: string; url: string | null; sourceId: string; sourceLabel: string; category: IntegrationCandidateCategory; status: IntegrationCandidateStatus; decision: IntegrationDecision;
  manualApprovalRequired: true; installDisabled: true; executionDisabled: true; secretStorageDisabled: true; externalApiCallsDisabled: true; monetizationNotGuaranteed: true;
  integrationValueScore: number; securityRiskScore: number; licenseConfidenceScore: number; monetizationPotentialScore: number; implementationComplexityScore: number; finalGxeonFitScore: number;
  riskFlags: IntegrationRiskFlag[]; valueSignals: string[]; licenseHint: string; maintenanceHint: string; notes: string; monetizationAngles: string[]; recommendedNextManualAction: string; connectorPreview?: ConnectorPreview; taskPreview?: TaskPreview;
};
export const previewBoundary = { mode: "PREVIEW_ONLY" as const, manualApprovalRequired: true as const, installDisabled: true as const, executionDisabled: true as const, secretStorageDisabled: true as const, externalApiCallsDisabled: true as const, monetizationNotGuaranteed: true as const };
