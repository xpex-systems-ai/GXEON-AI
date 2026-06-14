import type { GitHubDemandCandidate, GitHubDemandPipelinePreview } from "./githubDemandTypes";

export type ConversionRoute = "BOUNTY_ATTEMPT" | "SERVICE_OFFER" | "REPO_AUDIT" | "DEPLOY_RESCUE" | "MCP_AGENT_INTEGRATION" | "DOCS_TEMPLATE" | "DATA_API_CONNECTOR" | "WATCHLIST";
export type ConversionLanguage = "PT_BR" | "EN_US" | "BOTH";
export type OfferTier = "EXPRESS_50" | "STANDARD_100" | "PRO_250" | "CUSTOM_450";
export type ConversionPackStatus = "READY_FOR_MANUAL_REVIEW" | "BLOCKED_RESEARCH_REQUIRED" | "OPPORTUNITY_PREVIEW_CREATED" | "TASK_PREVIEW_CREATED" | "BRAIN_SPRINT_PREVIEW_CREATED";

export type ConversionSafetyFlags = {
  mode: "PREVIEW_ONLY";
  copyOnly: true;
  doNotAutoSend: true;
  manualSendOnly: true;
  manualReviewRequired: true;
  githubWriteDisabled: true;
  externalContactDisabled: true;
  paymentProviderDisabled: true;
  rewardNotGuaranteed: true;
  noAutoPr: true;
  noAutoComment: true;
  persistence: "IN_MEMORY_P0";
};

export const conversionSafetyFlags: ConversionSafetyFlags = {
  mode: "PREVIEW_ONLY",
  copyOnly: true,
  doNotAutoSend: true,
  manualSendOnly: true,
  manualReviewRequired: true,
  githubWriteDisabled: true,
  externalContactDisabled: true,
  paymentProviderDisabled: true,
  rewardNotGuaranteed: true,
  noAutoPr: true,
  noAutoComment: true,
  persistence: "IN_MEMORY_P0",
};

export type ConversionOfferTier = { tier: OfferTier; label: string; brl: string; usd: string; useCase: string; suggested: boolean; notGuaranteed: true };
export type ConversionMessageDraft = { language: Exclude<ConversionLanguage, "BOTH">; label: "COPY_ONLY_DO_NOT_AUTO_SEND"; subject: string; text: string };
export type GitHubDemandConversionPack = ConversionSafetyFlags & {
  id: string;
  pipelinePreviewId?: string;
  candidateId: string;
  status: ConversionPackStatus;
  recommendedRoute: ConversionRoute;
  language: ConversionLanguage;
  source: "GITHUB_DEMAND_CONVERSION_PACK";
  candidate: GitHubDemandCandidate;
  pipelinePreview?: GitHubDemandPipelinePreview;
  createdAt: string;
  updatedAt: string;
  shortDiagnosis: string;
  offerTitle: string;
  suggestedPrice: { primaryTier: OfferTier; brlRange: string; usdRange: string; rationale: string; rewardNotGuaranteed: true };
  offerTiers: ConversionOfferTier[];
  scopeBoundary: { included: string[]; excluded: string[]; assumptions: string[] };
  manualMessageDrafts: { ptBr: ConversionMessageDraft; enUs: ConversionMessageDraft };
  technicalExecutionPlan: string[];
  evidenceChecklist: string[];
  deliveryChecklist: string[];
  riskWarnings: string[];
  ledgerPreview: { status: "PREVIEW_ONLY"; expectedValueBrl: number; expectedValueUsd: number; source: "GITHUB_DEMAND_CONVERSION_PACK"; amountNotGuaranteed: true; markRevenueReceivedDisabled: true };
  brainRevenueSprintRecommendation: { route: string; reason: string; targetBrl: number; previewRoute: string; manualReviewRequired: true };
  nextBestAction: string;
  opportunityPreviewRoute: string;
  taskPreviewRoute: string;
};
