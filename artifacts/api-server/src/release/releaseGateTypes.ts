export type ReleaseMode = "PREVIEW_ONLY";

export type ReleaseStatus = "PENDING_REVIEW" | "READY_FOR_MANUAL_RELEASE_REVIEW" | "BLOCKED" | "REVISION_REQUIRED" | "CANCELLED";
export type FinancialReadinessState = "NOT_READY" | "NEEDS_REVIEW" | "READY_MANUAL" | "BLOCKED";
export type EvidenceCompleteness = "INCOMPLETE" | "PARTIAL" | "COMPLETE" | "MANUALLY_VERIFIED";
export type OperatorApprovalStatus = "NOT_REQUESTED" | "PENDING_OPERATOR" | "MANUAL_APPROVAL_REQUIRED" | "BLOCKED";

export type ReleaseApprovalStep = {
  role: "Operator" | "Validator" | "Financial Reviewer" | "Founder";
  owner: "Junior Sena" | "GXEON Operator" | "Manual Review" | "Codex";
  status: "WAITING" | "NEEDS_ACTION" | "MANUAL_REVIEW_REQUIRED" | "BLOCKED";
  note: string;
};

export type FinancialReadinessChecklist = {
  delivery_approved: boolean;
  evidence_complete: boolean;
  scope_confirmed: boolean;
  release_authorized: boolean;
  financial_ready: boolean;
  ledger_write_disabled: true;
};

export type ReleaseGateSafetyBoundary = {
  mode: ReleaseMode;
  releaseDisabled: true;
  paymentDisabled: true;
  ledgerWriteDisabled: true;
  approvalRequired: true;
  evidenceRequired: true;
  revenueClaimed: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
};

export type ReleaseGateCreateInput = {
  validationPreviewId?: string;
  executionPreviewId?: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title?: string;
  approvalState?: string;
  evidenceState?: string;
  validationStatus?: string;
  blockedActions?: string[];
  acceptanceCriteria?: string[];
  evidenceChecklist?: string[];
  estimatedRevenueBrl?: number;
  manualNotes?: string;
  nextManualAction?: string;
};

export type ReleaseGateStateUpdateInput = {
  release_status?: ReleaseStatus;
  financial_readiness_state?: FinancialReadinessState;
  evidence_completeness?: EvidenceCompleteness;
  authorization_status?: OperatorApprovalStatus;
  blocker?: string;
  next_manual_action?: string;
  manualNotes?: string;
};

export type ReleaseGatePreviewRecord = ReleaseGateSafetyBoundary & {
  id: string;
  validationPreviewId?: string;
  executionPreviewId?: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title: string;
  release_status: ReleaseStatus;
  financial_readiness_state: FinancialReadinessState;
  evidence_completeness: EvidenceCompleteness;
  authorization_status: OperatorApprovalStatus;
  estimatedRevenueBrl: number;
  estimated_revenue_brl: number;
  releasable_revenue_brl: 0;
  readinessScore: number;
  readiness_score: number;
  checklist: FinancialReadinessChecklist;
  readinessChecklist: string[];
  approval_chain: ReleaseApprovalStep[];
  blockedReleaseReasons: string[];
  release_summary: string;
  blocker?: string;
  nextManualAction: string;
  next_manual_action: string;
  manualNotes: string;
  p0_p1_p2_p3_p4_trace: string;
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
};

export type ReleaseGateStatusSummary = ReleaseGateSafetyBoundary & {
  status: "RELEASE_GATE_P0_READY";
  recordsInMemory: number;
  allowedReleaseStatuses: ReleaseStatus[];
  allowedFinancialReadinessStates: FinancialReadinessState[];
  allowedEvidenceCompleteness: EvidenceCompleteness[];
  allowedOperatorApprovalStatuses: OperatorApprovalStatus[];
  boundaries: string[];
};
