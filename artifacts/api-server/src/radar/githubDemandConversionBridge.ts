import { createOpportunityFromGitHubDemandCandidate } from "./githubDemandOpportunityBridge";
import type { GitHubDemandConversionPack } from "./githubDemandConversionTypes";

const nextRoutes = {
  inbox: "/ops/github-demand",
  tasks: "/ops/tasks",
  brain: "/ops/brain",
  broker: "/ops/broker",
  ledger: "/ops/ledger",
};

const safetyFlags = (pack: GitHubDemandConversionPack) => ({
  mode: "PREVIEW_ONLY" as const,
  manualReviewRequired: true as const,
  copyOnly: true as const,
  doNotAutoSend: true as const,
  githubWriteDisabled: true as const,
  externalContactDisabled: true as const,
  paymentProviderDisabled: true as const,
  rewardNotGuaranteed: true as const,
  noAutoPr: true as const,
  noAutoComment: true as const,
  persistence: pack.persistence,
});

export function createOpportunityPreviewFromConversionPack(pack: GitHubDemandConversionPack, operatorConfirmed: boolean) {
  const base = {
    actionType: "OPPORTUNITY_PREVIEW" as const,
    mode: "PREVIEW_ONLY" as const,
    source: "GITHUB_DEMAND_CONVERSION_PACK" as const,
    conversionPackId: pack.id,
    conversionPackTitle: pack.offerTitle,
    manualReviewRequired: true as const,
    operatorConfirmed,
    expectedValuePreviewOnly: pack.ledgerPreview.expectedValueBrl,
    taskPreviewRoute: pack.taskPreviewRoute.replace(":id", pack.id),
    nextRoutes,
    safetyFlags: safetyFlags(pack),
  };

  if (!operatorConfirmed) {
    return {
      ...base,
      status: "CONFIRMATION_REQUIRED" as const,
      opportunity: null,
      taskCreationRoute: null,
      nextManualAction: "Internal Opportunity was not created yet. Confirm operator approval to create internal preview.",
    };
  }

  const bridge = createOpportunityFromGitHubDemandCandidate(pack.candidate, true);
  return {
    ...bridge,
    ...base,
    status: "OPPORTUNITY_PREVIEW_CREATED" as const,
    opportunity: bridge.opportunity,
    taskCreationRoute: bridge.taskCreationRoute,
    nextManualAction: "Open Inbox/Broker manually, review the internal Opportunity preview, then decide the next GXEON-only step.",
  };
}

export function createTaskPreviewFromConversionPack(pack: GitHubDemandConversionPack) {
  return {
    actionType: "TASK_PREVIEW" as const,
    status: "TASK_PREVIEW_CREATED" as const,
    mode: "PREVIEW_ONLY" as const,
    source: "GITHUB_DEMAND_CONVERSION_PACK" as const,
    conversionPackId: pack.id,
    conversionPackTitle: pack.offerTitle,
    manualReviewRequired: true as const,
    githubWriteDisabled: true as const,
    externalContactDisabled: true as const,
    rewardNotGuaranteed: true as const,
    nextRoutes,
    safetyFlags: safetyFlags(pack),
    nextManualAction: "Open Tasks manually and copy the preview checklist into a GXEON internal task only after review.",
    taskPreview: {
      id: `task-preview-${pack.id}`,
      title: `Manual execution: ${pack.offerTitle}`,
      checklist: pack.technicalExecutionPlan,
      evidenceChecklist: pack.evidenceChecklist,
      deliveryChecklist: pack.deliveryChecklist,
      copyOnly: true as const,
      doNotAutoSend: true as const,
    },
  };
}

export function createBrainSprintPreviewFromConversionPack(pack: GitHubDemandConversionPack) {
  return {
    actionType: "BRAIN_SPRINT_PREVIEW" as const,
    status: "BRAIN_SPRINT_PREVIEW_CREATED" as const,
    mode: "PREVIEW_ONLY" as const,
    source: "GITHUB_DEMAND_CONVERSION_PACK" as const,
    conversionPackId: pack.id,
    conversionPackTitle: pack.offerTitle,
    manualReviewRequired: true as const,
    githubWriteDisabled: true as const,
    externalContactDisabled: true as const,
    rewardNotGuaranteed: true as const,
    nextRoutes,
    safetyFlags: safetyFlags(pack),
    recommendation: pack.brainRevenueSprintRecommendation,
    ledgerPreview: pack.ledgerPreview,
    nextBestAction: pack.nextBestAction,
    nextManualAction: "Open Brain/Ledger manually, review the sprint recommendation, and keep all revenue values as preview-only.",
  };
}
