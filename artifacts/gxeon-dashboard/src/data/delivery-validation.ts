export type ValidationStatus = "AWAITING_EVIDENCE" | "EVIDENCE_ATTACHED" | "MANUAL_REVIEW" | "VALIDATED" | "VALIDATION_BLOCKED" | "CLOSED_SAMPLE";
export type ApprovalState = "PENDING_REVIEW" | "APPROVED" | "REVISION_REQUESTED" | "REJECTED" | "ARCHIVED";
export type RejectionState = "NONE" | "SCOPE_MISMATCH" | "INSUFFICIENT_EVIDENCE" | "QUALITY_RISK" | "CLIENT_NOT_ACCEPTED";
export type RevisionState = "NONE" | "COPY_REVISION" | "VISUAL_REVISION" | "TECHNICAL_REVISION" | "EVIDENCE_REVISION";
export type EvidenceType = "GitHub PR" | "Vercel Preview" | "Screenshot" | "Document" | "Manual Validation";
export type EvidenceState = "MISSING" | "SAMPLE_ATTACHED" | "READY_FOR_REVIEW" | "MANUALLY_VERIFIED" | "NEEDS_REVISION";
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
  data_mode: "sample_manual_first";
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

export const validationStatuses: ValidationStatus[] = ["AWAITING_EVIDENCE", "EVIDENCE_ATTACHED", "MANUAL_REVIEW", "VALIDATED", "VALIDATION_BLOCKED", "CLOSED_SAMPLE"];
export const approvalStates: ApprovalState[] = ["PENDING_REVIEW", "APPROVED", "REVISION_REQUESTED", "REJECTED", "ARCHIVED"];
export const rejectionStates: RejectionState[] = ["NONE", "SCOPE_MISMATCH", "INSUFFICIENT_EVIDENCE", "QUALITY_RISK", "CLIENT_NOT_ACCEPTED"];
export const revisionStates: RevisionState[] = ["NONE", "COPY_REVISION", "VISUAL_REVISION", "TECHNICAL_REVISION", "EVIDENCE_REVISION"];
export const evidenceTypes: EvidenceType[] = ["GitHub PR", "Vercel Preview", "Screenshot", "Document", "Manual Validation"];
export const evidenceStates: EvidenceState[] = ["MISSING", "SAMPLE_ATTACHED", "READY_FOR_REVIEW", "MANUALLY_VERIFIED", "NEEDS_REVISION"];

export const sampleDeliveryValidations: DeliveryValidationRecord[] = [
  {
    id: "VAL-P3-001",
    opportunity_id: "OPP-P0-003",
    task_id: "TASK-P1-001",
    execution_id: "EXEC-P2-001",
    title: "Agency reporting dashboard milestone acceptance",
    client_label: "Sample agency operations team",
    validation_status: "MANUAL_REVIEW",
    approval_state: "PENDING_REVIEW",
    rejection_state: "NONE",
    revision_state: "EVIDENCE_REVISION",
    risk: "CRITICAL",
    delivery_value_brl: 9500,
    validator: "Junior Sena",
    outcome_summary: "Operator must compare the proposal milestone against sample acceptance criteria before release-gate preparation.",
    acceptance_criteria: ["Milestones are explicit", "No live data source is promised", "Manual approval question is documented"],
    evidence: [
      { type: "GitHub PR", label: "PR placeholder · not fetched", state: "READY_FOR_REVIEW", note: "Manual PR label only; no GitHub API call." },
      { type: "Document", label: "Proposal outline sample", state: "SAMPLE_ATTACHED", note: "Static document evidence summary." },
      { type: "Manual Validation", label: "Operator review checklist", state: "READY_FOR_REVIEW", note: "Human review remains the source of truth." },
    ],
    p0_p1_p2_relationship: "OPP-P0-003 → TASK-P1-001 → EXEC-P2-001 → VAL-P3-001",
    next_manual_gate: "Approve only after the operator confirms scope, evidence label, and delivery wording manually.",
    created_at: "2026-06-07T11:00:00.000Z",
    updated_at: "2026-06-07T11:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "VAL-P3-002",
    opportunity_id: "OPP-P0-001",
    task_id: "TASK-P1-002",
    execution_id: "EXEC-P2-002",
    title: "Landing page checklist delivery proof",
    client_label: "Sample local clinic",
    validation_status: "EVIDENCE_ATTACHED",
    approval_state: "REVISION_REQUESTED",
    rejection_state: "NONE",
    revision_state: "COPY_REVISION",
    risk: "HIGH",
    delivery_value_brl: 4200,
    validator: "GXEON Operator",
    outcome_summary: "Checklist evidence exists, but the conversion promise needs softer manual wording before approval.",
    acceptance_criteria: ["Sections are named", "CTA goal is visible", "Claims avoid guaranteed revenue"],
    evidence: [
      { type: "Screenshot", label: "Checklist screenshot placeholder", state: "NEEDS_REVISION", note: "Visual proof must be rechecked manually." },
      { type: "Manual Validation", label: "Acceptance criteria pass/fail", state: "READY_FOR_REVIEW", note: "No persistence or client portal write." },
    ],
    p0_p1_p2_relationship: "OPP-P0-001 → TASK-P1-002 → EXEC-P2-002 → VAL-P3-002",
    next_manual_gate: "Revise copy, attach a safer sample screenshot label, then return to pending review.",
    created_at: "2026-06-07T11:05:00.000Z",
    updated_at: "2026-06-07T11:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "VAL-P3-003",
    opportunity_id: "OPP-P0-007",
    task_id: "TASK-P1-005",
    execution_id: "EXEC-P2-005",
    title: "Safe AI workflow boundary review acceptance",
    client_label: "Sample startup team",
    validation_status: "VALIDATED",
    approval_state: "APPROVED",
    rejection_state: "NONE",
    revision_state: "NONE",
    risk: "MEDIUM",
    delivery_value_brl: 7800,
    validator: "Codex",
    outcome_summary: "Static evidence supports a sample approved state because boundaries, risks and human review are explicit.",
    acceptance_criteria: ["Boundaries are visible", "Automation is not activated", "Human approval remains required"],
    evidence: [
      { type: "Document", label: "Boundary report sample", state: "MANUALLY_VERIFIED", note: "Report is static and visual-only." },
      { type: "Manual Validation", label: "Approval checklist sample", state: "MANUALLY_VERIFIED", note: "Approved sample without database mutation." },
    ],
    p0_p1_p2_relationship: "OPP-P0-007 → TASK-P1-005 → EXEC-P2-005 → VAL-P3-003",
    next_manual_gate: "Keep approved as sample evidence and wait for P4 release-gate design before revenue release.",
    created_at: "2026-06-07T11:10:00.000Z",
    updated_at: "2026-06-07T11:40:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "VAL-P3-004",
    opportunity_id: "OPP-P0-002",
    task_id: "TASK-P1-004",
    execution_id: "EXEC-P2-004",
    title: "Founder CRM discovery packet validation block",
    client_label: "Sample founder pipeline",
    validation_status: "VALIDATION_BLOCKED",
    approval_state: "REJECTED",
    rejection_state: "INSUFFICIENT_EVIDENCE",
    revision_state: "EVIDENCE_REVISION",
    risk: "HIGH",
    delivery_value_brl: 6800,
    validator: "Manual Review",
    outcome_summary: "Discovery cannot pass validation until manually supplied notes exist; no CRM, LinkedIn or database fetch is allowed.",
    acceptance_criteria: ["Manual notes are consented", "CRM export handling is described", "No scraped source is referenced"],
    evidence: [
      { type: "Document", label: "Pending manual discovery note", state: "MISSING", note: "Evidence absent by design." },
      { type: "Manual Validation", label: "Rejection reason", state: "MANUALLY_VERIFIED", note: "Rejected in sample mode due to missing proof." },
    ],
    p0_p1_p2_relationship: "OPP-P0-002 → TASK-P1-004 → EXEC-P2-004 → VAL-P3-004",
    next_manual_gate: "Collect consented manual notes, then change from rejected sample to pending review in a future persistence-safe workflow.",
    created_at: "2026-06-07T11:15:00.000Z",
    updated_at: "2026-06-07T11:45:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "VAL-P3-005",
    opportunity_id: "OPP-P0-010",
    task_id: "TASK-P1-009",
    execution_id: "EXEC-P2-009",
    title: "Closed consulting validation archive",
    client_label: "Sample closed-state record",
    validation_status: "CLOSED_SAMPLE",
    approval_state: "ARCHIVED",
    rejection_state: "NONE",
    revision_state: "NONE",
    risk: "LOW",
    delivery_value_brl: 900,
    validator: "Manual Review",
    outcome_summary: "Delivered sample record is archived to demonstrate lifecycle closure without payment, storage or customer activation.",
    acceptance_criteria: ["Archive reason is visible", "Payment is not implied", "No user account is created"],
    evidence: [
      { type: "Vercel Preview", label: "Preview placeholder · not fetched", state: "SAMPLE_ATTACHED", note: "Static label only; no Vercel API call." },
      { type: "Manual Validation", label: "Archive confirmation", state: "MANUALLY_VERIFIED", note: "Manual archive state only." },
    ],
    p0_p1_p2_relationship: "OPP-P0-010 → TASK-P1-009 → EXEC-P2-009 → VAL-P3-005",
    next_manual_gate: "Remain archived until P4 defines release gates and financial boundary checks.",
    created_at: "2026-06-07T11:18:00.000Z",
    updated_at: "2026-06-07T11:50:00.000Z",
    data_mode: "sample_manual_first",
  },
];

export function getDeliveryValidationSummary(validations: DeliveryValidationRecord[] = sampleDeliveryValidations): DeliveryValidationSummary {
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

export function getApprovalStateCounts(validations: DeliveryValidationRecord[] = sampleDeliveryValidations) {
  return approvalStates.map((state) => ({
    state,
    count: validations.filter((validation) => validation.approval_state === state).length,
  }));
}

export function getEvidenceTypeCounts(validations: DeliveryValidationRecord[] = sampleDeliveryValidations) {
  return evidenceTypes.map((type) => ({
    type,
    count: validations.reduce((total, validation) => total + validation.evidence.filter((evidence) => evidence.type === type).length, 0),
  }));
}

export function getValidationsByApprovalState(state: ApprovalState, validations: DeliveryValidationRecord[] = sampleDeliveryValidations) {
  return validations.filter((validation) => validation.approval_state === state);
}

export function getValidationsWithRevision(validations: DeliveryValidationRecord[] = sampleDeliveryValidations) {
  return validations.filter((validation) => validation.revision_state !== "NONE");
}

export function getValidationsWithRejection(validations: DeliveryValidationRecord[] = sampleDeliveryValidations) {
  return validations.filter((validation) => validation.rejection_state !== "NONE");
}
