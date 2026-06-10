import type { GitHubOpportunityCandidate, RadarOpportunityPreview } from "./radarService";

export type OpportunitySource = "radar_manual" | "radar_github" | "operator";
export type OpportunityStatus = "NEW" | "REVIEW" | "QUALIFIED" | "PROPOSAL_DRAFTED" | "TASK_READY" | "EVIDENCE_READY" | "EXECUTION_READY" | "DONE" | "LOST";
export type OpportunityRiskFlag = "no_budget_signal" | "possible_unpaid_open_source" | "unclear_requirements" | "high_complexity" | "stale_issue" | "sensitive_domain" | "external_contact_required" | "manual_qualification_required" | "client_data_not_verified" | "payment_not_connected" | "execution_not_authorized";

export type OpportunityPipelineCounts = {
  total: number;
  new: number;
  review: number;
  qualified: number;
  proposalDrafted: number;
  taskReady: number;
  evidenceReady: number;
  executionReady: number;
  done: number;
  lost: number;
};

export type OpportunityInboxStatus = {
  status: "OPPORTUNITY_INBOX_READY";
  persistence: "IN_MEMORY_P0";
  externalContact: false;
  autonomousExecution: false;
  paymentCapture: false;
  manualFirst: true;
  counts: OpportunityPipelineCounts;
  boundaries: string[];
};

export type OpportunityRecord = {
  id: string;
  source: OpportunitySource;
  status: OpportunityStatus;
  title: string;
  problemSummary: string;
  category: string;
  score: number;
  sourceUrl: string | null;
  repository: string | null;
  recommendedNextStep: string;
  riskFlags: OpportunityRiskFlag[];
  scoringExplanation: string[];
  offerTemplateId: string | null;
  manualApprovalRequired: true;
  externalAction: false;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityProposalPreview = {
  id: string;
  opportunityId: string;
  mode: "DRAFT_ONLY";
  title: string;
  problemSummary: string;
  recommendedSolution: string;
  deliverySteps: string[];
  estimatedEffort: string;
  suggestedPriceRange: { min: number; max: number; currency: "BRL" };
  riskNotes: string[];
  evidencePlanSummary: string;
  offerTemplateId: string | null;
  manualApprovalRequired: true;
  externalAction: false;
  createdAt: string;
};

export type OpportunityTaskPreview = {
  id: string;
  opportunityId: string;
  mode: "TASK_PREVIEW_ONLY";
  executionChecklist: string[];
  requiredConnectors: string[];
  approvalGates: string[];
  forbiddenActions: string[];
  rollbackRequirements: string[];
  evidenceRequirements: string[];
  manualApprovalRequired: true;
  externalAction: false;
  createdAt: string;
};

export type OpportunityEvidencePlan = {
  id: string;
  opportunityId: string;
  mode: "EVIDENCE_PLAN_ONLY";
  requirements: string[];
  examples: string[];
  noFakeEvidence: true;
  externalAction: false;
  manualApprovalRequired: true;
  createdAt: string;
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { success: boolean; data: T; error?: string; message?: string };
  if (!response.ok || !payload.success) throw new Error(payload.message ?? payload.error ?? `REQUEST_FAILED_${response.status}`);
  return payload.data;
}

async function jsonPost<T>(path: string, body: unknown): Promise<T> {
  return readJson<T>(await fetch(apiUrl(path), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

export async function fetchOpportunityStatus(signal?: AbortSignal) {
  return readJson<OpportunityInboxStatus>(await fetch(apiUrl("/api/opportunities/status"), { headers: { Accept: "application/json" }, signal }));
}

export async function fetchOpportunities(signal?: AbortSignal) {
  return readJson<{ opportunities: OpportunityRecord[]; counts: OpportunityPipelineCounts }>(await fetch(apiUrl("/api/opportunities"), { headers: { Accept: "application/json" }, signal }));
}

export function createOpportunityFromRadarManualPreview(preview: RadarOpportunityPreview, operatorConfirmed: boolean) {
  return jsonPost<{ opportunity: OpportunityRecord }>("/api/opportunities/from-radar-manual-preview", { preview, operatorConfirmed });
}

export function createOpportunityFromRadarGitHubPreview(candidate: GitHubOpportunityCandidate, operatorConfirmed: boolean) {
  return jsonPost<{ opportunity: OpportunityRecord }>("/api/opportunities/from-radar-github-preview", { candidate, operatorConfirmed });
}

export function qualifyOpportunity(id: string) {
  return jsonPost<{ opportunity: OpportunityRecord }>(`/api/opportunities/${id}/qualify`, {});
}

export function previewOpportunityProposal(id: string) {
  return jsonPost<{ proposal: OpportunityProposalPreview; opportunity: OpportunityRecord; mode: "DRAFT_ONLY" }>(`/api/opportunities/${id}/proposal-preview`, {});
}

export function previewOpportunityTask(id: string) {
  return jsonPost<{ task: OpportunityTaskPreview; opportunity: OpportunityRecord; mode: "PREVIEW_ONLY" }>(`/api/opportunities/${id}/task-preview`, {});
}

export function previewOpportunityEvidencePlan(id: string) {
  return jsonPost<{ evidencePlan: OpportunityEvidencePlan; opportunity: OpportunityRecord; mode: "EVIDENCE_PLAN_ONLY" }>(`/api/opportunities/${id}/evidence-plan`, {});
}
