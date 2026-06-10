import type { OpportunityEvidencePlan, OpportunityRecord } from "./opportunityTypes";

function createId(opportunityId: string): string {
  return `evidence_${opportunityId}_${Date.now().toString(36)}`;
}

export function generateEvidencePlan(opportunity: OpportunityRecord): OpportunityEvidencePlan {
  return {
    id: createId(opportunity.id),
    opportunityId: opportunity.id,
    mode: "EVIDENCE_PLAN_ONLY",
    requirements: [
      "Before screenshot or initial state capture supplied by the operator.",
      "Error log, public issue context or acceptance criteria that can be verified without inventing evidence.",
      "Change summary and reviewer-visible implementation notes.",
      "After screenshot, deployment URL or preview URL only after operator-approved work exists.",
      "Acceptance note from operator or client before any completion claim.",
      "Rollback note describing how to revert changes if the operator rejects delivery.",
    ],
    examples: ["before screenshot", "after screenshot", "PR link", "deployment URL", "error log", "acceptance note", "rollback note"],
    noFakeEvidence: true,
    externalAction: false,
    manualApprovalRequired: true,
    createdAt: new Date().toISOString(),
  };
}
