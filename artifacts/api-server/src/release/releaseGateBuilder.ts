import type { EvidenceCompleteness, FinancialReadinessState, OperatorApprovalStatus, ReleaseApprovalStep, ReleaseGateCreateInput, ReleaseGatePreviewRecord, ReleaseStatus } from "./releaseGateTypes";

export const releaseGateSafetyBoundary = {
  mode: "PREVIEW_ONLY" as const,
  releaseDisabled: true as const,
  paymentDisabled: true as const,
  ledgerWriteDisabled: true as const,
  approvalRequired: true as const,
  evidenceRequired: true as const,
  revenueClaimed: false as const,
  externalContact: false as const,
  githubWrites: false as const,
  paymentAction: false as const,
  autonomousExecution: false as const,
};

const defaultChecklist = [
  "Delivery validation reviewed",
  "Evidence completeness reviewed",
  "Scope confirmed manually",
  "Release authorization remains manual",
  "Financial readiness remains preview-only",
  "Ledger write remains disabled",
];

export const defaultNextManualAction = "Review validation evidence and financial readiness manually. Do not release, invoice or claim revenue automatically.";

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function mapEvidenceCompleteness(input: ReleaseGateCreateInput): EvidenceCompleteness {
  const state = (input.evidenceState ?? "").toUpperCase();
  const criteria = cleanStrings(input.acceptanceCriteria);
  const evidence = cleanStrings(input.evidenceChecklist);
  if (state === "MANUALLY_VERIFIED") return "MANUALLY_VERIFIED";
  if (state === "READY_FOR_REVIEW" || state === "MANUAL_ATTACHED") return criteria.length >= 2 || evidence.length >= 2 ? "COMPLETE" : "PARTIAL";
  if (state === "NEEDS_REVISION") return "PARTIAL";
  return "INCOMPLETE";
}

function hasUnsafeBlockedAction(input: ReleaseGateCreateInput): boolean {
  const blockedActions = cleanStrings(input.blockedActions).map((action) => action.toLowerCase());
  return ["external_contact", "payment_action", "github_write"].some((required) => !blockedActions.includes(required));
}

function financialState(evidence: EvidenceCompleteness, unsafe: boolean): FinancialReadinessState {
  if (unsafe || evidence === "INCOMPLETE") return "NOT_READY";
  if (evidence === "MANUALLY_VERIFIED") return "READY_MANUAL";
  return "NEEDS_REVIEW";
}

function authorizationStatus(input: ReleaseGateCreateInput, unsafe: boolean): OperatorApprovalStatus {
  if (unsafe) return "BLOCKED";
  if (input.approvalState === "APPROVED_MANUAL") return "MANUAL_APPROVAL_REQUIRED";
  return "PENDING_OPERATOR";
}

function releaseStatus(evidence: EvidenceCompleteness, financial: FinancialReadinessState, auth: OperatorApprovalStatus, unsafe: boolean): ReleaseStatus {
  if (unsafe || financial === "BLOCKED" || auth === "BLOCKED") return "BLOCKED";
  if (evidence === "INCOMPLETE" || financial === "NOT_READY") return "PENDING_REVIEW";
  if (evidence === "PARTIAL") return "REVISION_REQUIRED";
  return "READY_FOR_MANUAL_RELEASE_REVIEW";
}

function readinessScore(evidence: EvidenceCompleteness, financial: FinancialReadinessState, auth: OperatorApprovalStatus, unsafe: boolean): number {
  let score = 20;
  score += ({ INCOMPLETE: 0, PARTIAL: 15, COMPLETE: 30, MANUALLY_VERIFIED: 35 } satisfies Record<EvidenceCompleteness, number>)[evidence];
  score += ({ NOT_READY: 0, NEEDS_REVIEW: 15, READY_MANUAL: 25, BLOCKED: 0 } satisfies Record<FinancialReadinessState, number>)[financial];
  score += ({ NOT_REQUESTED: 0, PENDING_OPERATOR: 10, MANUAL_APPROVAL_REQUIRED: 15, BLOCKED: 0 } satisfies Record<OperatorApprovalStatus, number>)[auth];
  score += unsafe ? 0 : 15;
  return Math.max(0, Math.min(95, score));
}

function approvalChain(auth: OperatorApprovalStatus, financial: FinancialReadinessState): ReleaseApprovalStep[] {
  return [
    { role: "Validator", owner: "Manual Review", status: "NEEDS_ACTION", note: "Review Delivery Validation P0 evidence before any future release decision." },
    { role: "Operator", owner: "Junior Sena", status: auth === "BLOCKED" ? "BLOCKED" : "WAITING", note: "Operator approval is required and cannot be automated in P0." },
    { role: "Financial Reviewer", owner: "GXEON Operator", status: financial === "READY_MANUAL" ? "MANUAL_REVIEW_REQUIRED" : "NEEDS_ACTION", note: "Financial readiness is a preview only; no invoice, payment or ledger write is created." },
    { role: "Founder", owner: "Junior Sena", status: "WAITING", note: "Final release remains a manual future gate outside Release Gate P0." },
  ];
}

export function buildReleaseGatePreview(input: ReleaseGateCreateInput, id: string, now: string): ReleaseGatePreviewRecord {
  const evidence = mapEvidenceCompleteness(input);
  const unsafe = hasUnsafeBlockedAction(input);
  const financial = financialState(evidence, unsafe);
  const auth = authorizationStatus(input, unsafe);
  const status = releaseStatus(evidence, financial, auth, unsafe);
  const acceptanceCriteria = cleanStrings(input.acceptanceCriteria);
  const blockedActions = cleanStrings(input.blockedActions);
  const readinessChecklist = [...defaultChecklist, ...acceptanceCriteria.map((item) => `Acceptance criteria: ${item}`)];
  const blockedReleaseReasons = [
    ...(unsafe ? ["Required blocked actions were not all declared as blocked for preview safety."] : []),
    ...(evidence === "INCOMPLETE" ? ["Evidence completeness is incomplete and requires manual review."] : []),
    ...(blockedActions.length ? blockedActions.map((action) => `Action remains blocked in P0: ${action}`) : ["External contact, payment action, GitHub write and autonomous execution remain blocked."]),
  ];
  const estimatedRevenueBrl = Math.max(0, Number.isFinite(input.estimatedRevenueBrl ?? 0) ? Math.round((input.estimatedRevenueBrl ?? 0) * 100) / 100 : 0);
  const score = readinessScore(evidence, financial, auth, unsafe);
  const nextManualAction = input.nextManualAction?.trim() || defaultNextManualAction;

  return {
    id,
    validationPreviewId: input.validationPreviewId,
    executionPreviewId: input.executionPreviewId,
    brokerDecisionId: input.brokerDecisionId,
    taskId: input.taskId,
    title: input.title?.trim() || "Release Gate P0 preview",
    release_status: status,
    financial_readiness_state: financial,
    evidence_completeness: evidence,
    authorization_status: auth,
    estimatedRevenueBrl,
    estimated_revenue_brl: estimatedRevenueBrl,
    releasable_revenue_brl: 0,
    readinessScore: score,
    readiness_score: score,
    checklist: {
      delivery_approved: input.validationStatus === "READY_FOR_RELEASE_REVIEW" || input.approvalState === "APPROVED_MANUAL",
      evidence_complete: evidence === "COMPLETE" || evidence === "MANUALLY_VERIFIED",
      scope_confirmed: acceptanceCriteria.length > 0,
      release_authorized: false,
      financial_ready: financial === "READY_MANUAL",
      ledger_write_disabled: true,
    },
    readinessChecklist,
    approval_chain: approvalChain(auth, financial),
    blockedReleaseReasons,
    release_summary: "Release Gate P0 preview created from validation-like input. It calculates manual readiness only and cannot release, invoice, collect payment, write a ledger, contact users or write to GitHub.",
    blocker: blockedReleaseReasons.length ? blockedReleaseReasons.join(" ") : undefined,
    nextManualAction,
    next_manual_action: nextManualAction,
    manualNotes: input.manualNotes?.trim() || "Preview-only Release Gate P0 record. No real revenue is claimed.",
    p0_p1_p2_p3_p4_trace: `Validation ${input.validationPreviewId ?? "manual-preview"} → Release Gate P0 ${id} → future manual ledger/monetization review`,
    createdAt: now,
    updatedAt: now,
    created_at: now,
    updated_at: now,
    ...releaseGateSafetyBoundary,
  };
}
