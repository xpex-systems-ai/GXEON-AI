export type ValidationStatus = "AWAITING_EVIDENCE" | "EVIDENCE_ATTACHED" | "MANUAL_REVIEW" | "VALIDATED" | "VALIDATION_BLOCKED" | "CLOSED_REAL";
export type ApprovalState = "PENDING_REVIEW" | "APPROVED" | "REVISION_REQUESTED" | "REJECTED" | "ARCHIVED";
export type RejectionState = "NONE" | "SCOPE_MISMATCH" | "INSUFFICIENT_EVIDENCE" | "QUALITY_RISK" | "CLIENT_NOT_ACCEPTED";
export type RevisionState = "NONE" | "COPY_REVISION" | "VISUAL_REVISION" | "TECHNICAL_REVISION" | "EVIDENCE_REVISION";
export type EvidenceType = "GitHub PR" | "Vercel Preview" | "Screenshot" | "Document" | "Manual Validation";
export type EvidenceState = "MISSING" | "REAL_ATTACHED" | "READY_FOR_REVIEW" | "MANUALLY_VERIFIED" | "NEEDS_REVISION";
export type DeliveryRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DeliveryEvidence = {
  type: EvidenceType;
  label: string;
  state: EvidenceState;
  note: string;
};

export type DeliveryValidationRecord = {
  id: string;
  opportunity_id?: string;
  task_id: string;
  execution_id: string;
  title: string;
  client_label: string;
  validation_status: ValidationStatus;
  approval_state: ApprovalState;
  rejection_state: RejectionState;
  revision_state: RevisionState;
  risk: DeliveryRisk;
  delivery_value_brl: number;
  validator: "Junior Sena" | "GXEON Operator" | "Manual Review" | "Codex";
  outcome_summary: string;
  acceptance_criteria: string[];
  evidence: DeliveryEvidence[];
  p0_p1_p2_relationship: string;
  next_manual_gate: string;
  created_at: string;
  updated_at: string;
  data_mode: "real";
};

export type DeliveryValidationSummary = {
  total_validations: number;
  pending_review: number;
  approved: number;
  revision_requested: number;
  rejected: number;
  archived: number;
  manually_validated: number;
  blocked: number;
  missing_evidence: number;
  delivery_value_under_validation_brl: number;
};

export const validationStatuses: ValidationStatus[] = ["AWAITING_EVIDENCE", "EVIDENCE_ATTACHED", "MANUAL_REVIEW", "VALIDATED", "VALIDATION_BLOCKED", "CLOSED_REAL"];
export const approvalStates: ApprovalState[] = ["PENDING_REVIEW", "APPROVED", "REVISION_REQUESTED", "REJECTED", "ARCHIVED"];
export const rejectionStates: RejectionState[] = ["NONE", "SCOPE_MISMATCH", "INSUFFICIENT_EVIDENCE", "QUALITY_RISK", "CLIENT_NOT_ACCEPTED"];
export const revisionStates: RevisionState[] = ["NONE", "COPY_REVISION", "VISUAL_REVISION", "TECHNICAL_REVISION", "EVIDENCE_REVISION"];
export const evidenceTypes: EvidenceType[] = ["GitHub PR", "Vercel Preview", "Screenshot", "Document", "Manual Validation"];
export const evidenceStates: EvidenceState[] = ["MISSING", "REAL_ATTACHED", "READY_FOR_REVIEW", "MANUALLY_VERIFIED", "NEEDS_REVISION"];

export const realDeliveryValidations: DeliveryValidationRecord[] = [];

export const activeOperationalValidations: DeliveryValidationRecord[] = [];

export function getDeliveryValidationSummary(validations: DeliveryValidationRecord[] = activeOperationalValidations): DeliveryValidationSummary {
  const pendingReview = validations.filter((validation) => validation.approval_state === "PENDING_REVIEW").length;
  const approved = validations.filter((validation) => validation.approval_state === "APPROVED").length;
  const revisionRequested = validations.filter((validation) => validation.approval_state === "REVISION_REQUESTED").length;
  const rejected = validations.filter((validation) => validation.approval_state === "REJECTED").length;
  const archived = validations.filter((validation) => validation.approval_state === "ARCHIVED").length;

  return {
    total_validations: validations.length,
    pending_review: pendingReview,
    approved,
    revision_requested: revisionRequested,
    rejected,
    archived,
    manually_validated: validations.filter((validation) => validation.validation_status === "VALIDATED" || validation.evidence.some((evidence) => evidence.state === "MANUALLY_VERIFIED")).length,
    blocked: validations.filter((validation) => validation.validation_status === "VALIDATION_BLOCKED").length,
    missing_evidence: validations.filter((validation) => validation.evidence.some((evidence) => evidence.state === "MISSING")).length,
    delivery_value_under_validation_brl: validations
      .filter((validation) => validation.approval_state !== "ARCHIVED")
      .reduce((total, validation) => total + validation.delivery_value_brl, 0),
  };
}

export function getApprovalStateCounts(validations: DeliveryValidationRecord[] = activeOperationalValidations) {
  return approvalStates.map((state) => ({
    state,
    count: validations.filter((validation) => validation.approval_state === state).length,
  }));
}

export function getEvidenceTypeCounts(validations: DeliveryValidationRecord[] = activeOperationalValidations) {
  return evidenceTypes.map((type) => ({
    type,
    count: validations.reduce((total, validation) => total + validation.evidence.filter((evidence) => evidence.type === type).length, 0),
  }));
}

export function getValidationsByApprovalState(state: ApprovalState, validations: DeliveryValidationRecord[] = activeOperationalValidations) {
  return validations.filter((validation) => validation.approval_state === state);
}

export function getValidationsWithRevision(validations: DeliveryValidationRecord[] = activeOperationalValidations) {
  return validations.filter((validation) => validation.revision_state !== "NONE");
}

export function getValidationsWithRejection(validations: DeliveryValidationRecord[] = activeOperationalValidations) {
  return validations.filter((validation) => validation.rejection_state !== "NONE");
}
