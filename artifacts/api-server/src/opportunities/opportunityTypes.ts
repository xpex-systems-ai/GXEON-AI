import type { GitHubOpportunityCandidate, GitHubOpportunityRiskFlag, GitHubOpportunityScore } from "../radar/githubOpportunityTypes";
import type { RadarOpportunityPreview } from "../radar/radarManualIntake";

export type OpportunitySource = "radar_manual" | "radar_github" | "operator";

export type OpportunityStatus = "NEW" | "REVIEW" | "QUALIFIED" | "PROPOSAL_DRAFTED" | "TASK_READY" | "EVIDENCE_READY" | "EXECUTION_READY" | "DONE" | "LOST";

export type OpportunityRiskFlag =
  | "no_budget_signal"
  | "possible_unpaid_open_source"
  | "unclear_requirements"
  | "high_complexity"
  | "stale_issue"
  | "sensitive_domain"
  | "external_contact_required"
  | "manual_qualification_required"
  | "client_data_not_verified"
  | "payment_not_connected"
  | "execution_not_authorized";

export type OpportunityOfferTemplateId = "deploy_fix" | "simple_dashboard" | "automation_flow" | "analytics_setup" | "checkout_setup" | "landing_page";

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
  offerTemplateId: OpportunityOfferTemplateId | null;
  sourceSnapshot: RadarOpportunityPreview | GitHubOpportunityCandidate | Record<string, unknown>;
  manualApprovalRequired: true;
  externalAction: false;
  createdAt: string;
  updatedAt: string;
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
  offerTemplateId: OpportunityOfferTemplateId | null;
  manualApprovalRequired: true;
  externalAction: false;
  createdAt: string;
};

export type OpportunityTaskPreview = {
  id: string;
  opportunityId: string;
  mode: "TASK_PREVIEW_ONLY";
  executionChecklist: string[];
  requiredConnectors: Array<"GitHub" | "Vercel" | "Railway" | "Supabase" | "Microsoft365 optional">;
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

export type CreateOpportunityFromManualPreviewInput = {
  preview: RadarOpportunityPreview;
  operatorConfirmed: boolean;
};

export type CreateOpportunityFromGitHubPreviewInput = {
  candidate: GitHubOpportunityCandidate & { opportunityScore?: GitHubOpportunityScore };
  operatorConfirmed: boolean;
};

export function normalizeGitHubRiskFlag(flag: GitHubOpportunityRiskFlag): OpportunityRiskFlag {
  return flag;
}
