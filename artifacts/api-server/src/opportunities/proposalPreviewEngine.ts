import { offerTemplates } from "../monetization/offerRegistry";
import { generateEvidencePlan } from "./evidencePlanEngine";
import { mapCategoryToOfferTemplate } from "./opportunityInbox";
import type { OpportunityOfferTemplateId, OpportunityProposalPreview, OpportunityRecord } from "./opportunityTypes";

const fallbackPrice = { min: 500, max: 1500, currency: "BRL" as const };

function createId(opportunityId: string): string {
  return `proposal_${opportunityId}_${Date.now().toString(36)}`;
}

function solutionFor(templateId: OpportunityOfferTemplateId | null, opportunity: OpportunityRecord): string {
  switch (templateId) {
    case "deploy_fix": return "Diagnose the deployment or production failure, prepare a minimal safe fix and validate the deployment result after manual approval.";
    case "simple_dashboard": return "Create a focused operational dashboard around the approved data contract and validate it with operator-provided acceptance criteria.";
    case "automation_flow": return "Design a manual-safe automation flow with explicit approval checkpoints, test evidence and a kill-switch before any production use.";
    case "analytics_setup": return "Define the tracking plan, implement approved events and provide validation evidence through screenshots or dashboard links.";
    case "checkout_setup": return "Prepare checkout readiness in test/sandbox planning mode only, without creating live checkout sessions or capturing payment.";
    case "landing_page": return "Draft and implement an operator-approved landing page or public-facing improvement with before/after evidence.";
    default: return `Prepare a scoped manual microtask proposal for ${opportunity.category} with clear approval gates and evidence requirements.`;
  }
}

export function generateProposalPreview(opportunity: OpportunityRecord): OpportunityProposalPreview {
  const offerTemplateId = opportunity.offerTemplateId ?? mapCategoryToOfferTemplate(opportunity.category);
  const template = offerTemplates.find((item) => item.id === offerTemplateId);
  const evidencePlan = generateEvidencePlan(opportunity);

  return {
    id: createId(opportunity.id),
    opportunityId: opportunity.id,
    mode: "DRAFT_ONLY",
    title: `Draft proposal: ${opportunity.title}`,
    problemSummary: opportunity.problemSummary,
    recommendedSolution: solutionFor(offerTemplateId, opportunity),
    deliverySteps: [
      "Confirm scope, access boundaries and acceptance criteria with the operator.",
      "Create an internal implementation plan without contacting external users.",
      "Perform only manually approved work in approved systems.",
      "Collect real evidence and rollback notes before delivery approval.",
    ],
    estimatedEffort: template?.deliveryWindow ?? "1-5 business days after manual scope approval",
    suggestedPriceRange: template?.priceRange ?? fallbackPrice,
    riskNotes: opportunity.riskFlags.length ? opportunity.riskFlags.map((flag) => flag.replaceAll("_", " ")) : ["Manual qualification required before execution."],
    evidencePlanSummary: evidencePlan.requirements.slice(0, 4).join(" "),
    offerTemplateId,
    manualApprovalRequired: true,
    externalAction: false,
    createdAt: new Date().toISOString(),
  };
}
