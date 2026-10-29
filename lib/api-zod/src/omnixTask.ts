import { z } from "zod";
import { omnixReadScopes } from "./omnixCapabilities";

const id = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const reference = z.object({ id, organizationId: id, caseId: id, sha256: digest }).strict();
const responsible = z.discriminatedUnion("status", [
  z.object({ status: z.literal("UNASSIGNED"), userId: z.null(), organizationId: id }).strict(),
  z.object({ status: z.literal("PROPOSED"), userId: id, organizationId: id }).strict(),
]);
export const omnixTaskPreparationActions = ["REVIEW_FINDING", "PREPARE_CHANGE_PLAN", "PREPARE_REPORT_FOLLOWUP"] as const;

/** Candidate preparation data only. Parsing neither assigns a person, persists
 * a task, grants a scope, verifies SQL relationships nor approves an action. */
export const omnixTaskProposalSchema = z.object({
  version: z.literal("gx050-task-proposal-v1"), implementationStatus: z.literal("PLANNED"),
  id, organizationId: id, caseId: id,
  finding: z.object({ id, organizationId: id, caseId: id, evidenceIds: z.array(id).length(1) }).strict(),
  responsible,
  proposedAction: z.object({ kind: z.enum(omnixTaskPreparationActions), description: z.string().trim().min(10).max(1000),
    interpretation: z.literal("INERT_PROPOSAL_TEXT") }).strict(),
  requiredPermissions: z.array(z.enum(omnixReadScopes)).min(2).max(5),
  state: z.enum(["DRAFT_PROPOSAL", "AWAITING_HUMAN_REVIEW"]),
  approval: z.object({ required: z.literal(true), status: z.enum(["NOT_REQUESTED", "PENDING"]),
    humanApproved: z.literal(false), reviewerId: z.null(), approvedAt: z.null() }).strict(),
  result: z.object({ status: z.literal("NOT_EXECUTED"), evidenceIds: z.array(id).length(0) }).strict(),
  evidence: z.array(reference).length(1),
  relationshipVerification: z.literal("DECLARED_REFERENCES_ONLY"),
  testData: z.literal(true), executionAllowed: z.literal(false), writesAllowed: z.literal(false),
}).strict().superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (value.finding.organizationId !== value.organizationId || value.responsible.organizationId !== value.organizationId ||
      value.evidence.some(e => e.organizationId !== value.organizationId)) issue("All task references must belong to the declared organization.");
  if (value.finding.caseId !== value.caseId || value.evidence.some(e => e.caseId !== value.caseId)) issue("Finding and evidence must reference the declared case.");
  if (value.finding.evidenceIds[0] !== value.evidence[0]!.id) issue("The finding must cite the supplied evidence reference.");
  if (new Set([value.id, value.caseId, value.finding.id, value.evidence[0]!.id]).size !== 4) issue("Task, case, finding and evidence identifiers must be distinct.");
  if (new Set(value.requiredPermissions).size !== value.requiredPermissions.length ||
      !["omnix:audits:read", "omnix:evidence:read"].every(scope => (value.requiredPermissions as readonly string[]).includes(scope)) ||
      (value.proposedAction.kind === "PREPARE_REPORT_FOLLOWUP" && !value.requiredPermissions.includes("omnix:reports:read")))
    issue("Declare the distinct read scopes needed to prepare the proposed action.");
  if ((value.state === "DRAFT_PROPOSAL" && value.approval.status !== "NOT_REQUESTED") ||
      (value.state === "AWAITING_HUMAN_REVIEW" && value.approval.status !== "PENDING")) issue("Proposal state and pending approval must agree.");
});
export type OmnixTaskProposal = z.infer<typeof omnixTaskProposalSchema>;

// An integration must obtain this context from a fresh authorized canonical
// read. A matching string literal is not authentication and must never be
// accepted as authority from an HTTP body, prompt or tool argument.
export const omnixTaskPreparationContextSchema = z.object({
  source: z.literal("CANONICAL_SERVER_READ"), organizationId: id, caseId: id,
  findingId: id, evidenceId: id, evidenceSha256: digest,
  grantedReadScopes: z.array(z.enum(omnixReadScopes)).max(5),
}).strict();
export type OmnixTaskPreparationContext = z.infer<typeof omnixTaskPreparationContextSchema>;

export function parseOmnixTaskProposalForContext(input: unknown, context: OmnixTaskPreparationContext): OmnixTaskProposal {
  let serialized: string | undefined;
  try { serialized = JSON.stringify(input); } catch { throw new Error("TASK_PROPOSAL_BOUNDED_JSON_REQUIRED"); }
  if (!serialized || serialized.length > 8192) throw new Error("TASK_PROPOSAL_BOUNDED_JSON_REQUIRED");
  const proposal = omnixTaskProposalSchema.parse(input), expected = omnixTaskPreparationContextSchema.parse(context);
  if (proposal.organizationId !== expected.organizationId || proposal.caseId !== expected.caseId ||
      proposal.finding.id !== expected.findingId || proposal.evidence[0]!.id !== expected.evidenceId ||
      proposal.evidence[0]!.sha256 !== expected.evidenceSha256) throw new Error("TASK_PROPOSAL_CONTEXT_MISMATCH");
  if (!proposal.requiredPermissions.every(scope => expected.grantedReadScopes.includes(scope))) throw new Error("TASK_PROPOSAL_READ_SCOPE_REQUIRED");
  return proposal;
}
