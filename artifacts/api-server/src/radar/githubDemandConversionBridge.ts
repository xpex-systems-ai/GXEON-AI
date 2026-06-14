import { createOpportunityFromGitHubDemandCandidate } from "./githubDemandOpportunityBridge";
import type { GitHubDemandConversionPack } from "./githubDemandConversionTypes";

export function createOpportunityPreviewFromConversionPack(pack: GitHubDemandConversionPack, operatorConfirmed = false) {
  if (!operatorConfirmed) return { mode: "PREVIEW_ONLY", source: "GITHUB_DEMAND_CONVERSION_PACK", manualReviewRequired: true, operatorConfirmed: false, expectedValuePreviewOnly: pack.ledgerPreview.expectedValueBrl, taskPreviewRoute: pack.taskPreviewRoute.replace(":id", pack.id), taskCreationRoute: null, opportunity: null, safetyFlags: pack };
  const bridge = createOpportunityFromGitHubDemandCandidate(pack.candidate, true);
  return { ...bridge, source: "GITHUB_DEMAND_CONVERSION_PACK", expectedValuePreviewOnly: pack.ledgerPreview.expectedValueBrl, manualReviewRequired: true, taskPreviewRoute: pack.taskPreviewRoute.replace(":id", pack.id), taskCreationRoute: bridge.taskCreationRoute, safetyFlags: pack };
}
export function createTaskPreviewFromConversionPack(pack: GitHubDemandConversionPack) { return { mode: "PREVIEW_ONLY", source: "GITHUB_DEMAND_CONVERSION_PACK", manualReviewRequired: true, githubWriteDisabled: true, externalContactDisabled: true, rewardNotGuaranteed: true, taskPreview: { title: `Manual execution: ${pack.offerTitle}`, checklist: pack.technicalExecutionPlan, evidenceChecklist: pack.evidenceChecklist, deliveryChecklist: pack.deliveryChecklist, copyOnly: true, doNotAutoSend: true } }; }
export function createBrainSprintPreviewFromConversionPack(pack: GitHubDemandConversionPack) { return { mode: "PREVIEW_ONLY", source: "GITHUB_DEMAND_CONVERSION_PACK", manualReviewRequired: true, rewardNotGuaranteed: true, recommendation: pack.brainRevenueSprintRecommendation, ledgerPreview: pack.ledgerPreview, nextBestAction: pack.nextBestAction }; }
