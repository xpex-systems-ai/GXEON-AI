export type ValidationMode = "PREVIEW_ONLY";

export type DeliveryValidationStatus =
  | "AWAITING_EVIDENCE"
  | "EVIDENCE_ATTACHED"
  | "MANUAL_REVIEW"
  | "VALIDATION_BLOCKED"
  | "READY_FOR_RELEASE_REVIEW"
  | "CANCELLED";

export type ApprovalState = "PENDING_REVIEW" | "APPROVED_MANUAL" | "REVISION_REQUESTED" | "REJECTED" | "ARCHIVED";
export type EvidenceState = "MISSING" | "MANUAL_ATTACHED" | "READY_FOR_REVIEW" | "MANUALLY_VERIFIED" | "NEEDS_REVISION";
export type RejectionState = "NONE" | "SCOPE_MISMATCH" | "INSUFFICIENT_EVIDENCE" | "QUALITY_RISK" | "OPERATOR_REJECTED";
export type RevisionState = "NONE" | "COPY_REVISION" | "VISUAL_REVISION" | "TECHNICAL_REVISION" | "EVIDENCE_REVISION" | "ROLLBACK_REVISION";

export type DeliveryValidationSafetyBoundary = {
  mode: ValidationMode;
  approvalRequired: true;
  evidenceRequired: true;
  releaseDisabled: true;
  executionDisabled: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
};

export type DeliveryEvidencePreview = {
  id: string;
  label: string;
  state: EvidenceState;
  required: true;
  source: "EXECUTION_PREVIEW" | "OPERATOR_MANUAL" | "VALIDATION_P0";
  note: string;
  attachedAt?: string;
  verifiedAt?: string;
};

export type DeliveryValidationCreateInput = {
  executionPreviewId?: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title?: string;
  riskEnergy?: number;
  blockedActions?: string[];
  evidenceRequirements?: string[] | { id?: string; label?: string; reason?: string }[];
  checklist?: string[] | { id?: string; label?: string }[];
  rollbackPlan?: string[];
  operatorNextAction?: string;
  manualNotes?: string;
  attachedEvidenceLabels?: string[];
};

export type DeliveryValidationStateUpdateInput = {
  validationStatus?: DeliveryValidationStatus;
  approvalState?: ApprovalState;
  evidenceState?: EvidenceState;
  rejectionState?: RejectionState;
  revisionState?: RevisionState;
  rejectionReason?: string;
  revisionReason?: string;
  nextManualGate?: string;
  manualNotes?: string;
  evidenceUpdates?: { id: string; state: EvidenceState; note?: string }[];
};

export type DeliveryValidationPreviewRecord = DeliveryValidationSafetyBoundary & {
  id: string;
  executionPreviewId?: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title: string;
  validationStatus: DeliveryValidationStatus;
  approvalState: ApprovalState;
  evidenceState: EvidenceState;
  rejectionState: RejectionState;
  revisionState: RevisionState;
  rejectionReason?: string;
  revisionReason?: string;
  riskEnergy: number;
  blockedActions: string[];
  acceptanceCriteria: string[];
  evidenceChecklist: string[];
  evidence: DeliveryEvidencePreview[];
  manualNotes: string;
  nextManualGate: string;
  outcomeSummary: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryValidationStatusSummary = DeliveryValidationSafetyBoundary & {
  status: "DELIVERY_VALIDATION_P0_READY";
  recordsInMemory: number;
  allowedStatuses: DeliveryValidationStatus[];
  allowedApprovalStates: ApprovalState[];
  allowedEvidenceStates: EvidenceState[];
  boundaries: string[];
};
