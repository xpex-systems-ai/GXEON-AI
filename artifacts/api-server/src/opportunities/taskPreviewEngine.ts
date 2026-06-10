import { generateEvidencePlan } from "./evidencePlanEngine";
import type { OpportunityRecord, OpportunityTaskPreview } from "./opportunityTypes";

function createId(opportunityId: string): string {
  return `task_${opportunityId}_${Date.now().toString(36)}`;
}

export function generateTaskPreview(opportunity: OpportunityRecord): OpportunityTaskPreview {
  const evidencePlan = generateEvidencePlan(opportunity);
  return {
    id: createId(opportunity.id),
    opportunityId: opportunity.id,
    mode: "TASK_PREVIEW_ONLY",
    executionChecklist: [
      `Review opportunity ${opportunity.id} and confirm it remains manually approved for planning only.`,
      "Validate scope, repository/project access and acceptance criteria with the operator.",
      "Prepare a minimal change plan and rollback plan before touching any system.",
      "Run local/build validation and capture real evidence after operator-approved execution.",
      "Stop before external delivery, billing or client contact unless a separate human approval is recorded.",
    ],
    requiredConnectors: ["GitHub", "Vercel", "Railway", "Supabase", "Microsoft365 optional"],
    approvalGates: [
      "Operator qualifies the opportunity.",
      "Operator approves proposal content before any send.",
      "Operator approves task execution scope and target systems.",
      "Operator approves evidence package and completion claim.",
    ],
    forbiddenActions: [
      "Do not contact external users.",
      "Do not create GitHub issues, comments, branches or pull requests in external repositories from this preview.",
      "Do not send email or Microsoft 365 messages.",
      "Do not create checkout sessions, invoices, charges or payment captures.",
      "Do not claim revenue, clients or evidence that has not been externally confirmed.",
    ],
    rollbackRequirements: [
      "Document the files, settings or deployment targets that would change.",
      "Define a revert path before approved execution.",
      "Capture rollback evidence if any operator-approved change is reverted.",
    ],
    evidenceRequirements: evidencePlan.requirements,
    manualApprovalRequired: true,
    externalAction: false,
    createdAt: new Date().toISOString(),
  };
}
