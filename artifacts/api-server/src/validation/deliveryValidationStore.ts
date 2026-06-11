import { buildDeliveryValidationPreview } from "./deliveryValidationBuilder";
import type { ApprovalState, DeliveryValidationPreviewRecord, DeliveryValidationCreateInput, DeliveryValidationStateUpdateInput, DeliveryValidationStatus, DeliveryValidationStatusSummary, EvidenceState, RejectionState, RevisionState } from "./deliveryValidationTypes";

export const allowedDeliveryValidationStatuses: DeliveryValidationStatus[] = ["AWAITING_EVIDENCE", "EVIDENCE_ATTACHED", "MANUAL_REVIEW", "VALIDATION_BLOCKED", "READY_FOR_RELEASE_REVIEW", "CANCELLED"];
export const allowedApprovalStates: ApprovalState[] = ["PENDING_REVIEW", "APPROVED_MANUAL", "REVISION_REQUESTED", "REJECTED", "ARCHIVED"];
export const allowedEvidenceStates: EvidenceState[] = ["MISSING", "MANUAL_ATTACHED", "READY_FOR_REVIEW", "MANUALLY_VERIFIED", "NEEDS_REVISION"];
export const allowedRejectionStates: RejectionState[] = ["NONE", "SCOPE_MISMATCH", "INSUFFICIENT_EVIDENCE", "QUALITY_RISK", "OPERATOR_REJECTED"];
export const allowedRevisionStates: RevisionState[] = ["NONE", "COPY_REVISION", "VISUAL_REVISION", "TECHNICAL_REVISION", "EVIDENCE_REVISION", "ROLLBACK_REVISION"];

const safetyBoundary = {
  mode: "PREVIEW_ONLY" as const,
  approvalRequired: true as const,
  evidenceRequired: true as const,
  releaseDisabled: true as const,
  executionDisabled: true as const,
  externalContact: false as const,
  githubWrites: false as const,
  paymentAction: false as const,
  autonomousExecution: false as const,
};

const previews: DeliveryValidationPreviewRecord[] = [];
let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `validation_preview_${String(sequence).padStart(6, "0")}`;
}

function clone(record: DeliveryValidationPreviewRecord): DeliveryValidationPreviewRecord {
  return {
    ...record,
    blockedActions: [...record.blockedActions],
    acceptanceCriteria: [...record.acceptanceCriteria],
    evidenceChecklist: [...record.evidenceChecklist],
    evidence: record.evidence.map((item) => ({ ...item })),
  };
}

function assertAllowed<T extends string>(value: T | undefined, allowed: readonly T[], message: string): void {
  if (value !== undefined && !allowed.includes(value)) throw new Error(message);
}

export function createDeliveryValidationPreview(input: DeliveryValidationCreateInput): DeliveryValidationPreviewRecord {
  const now = new Date().toISOString();
  const record = buildDeliveryValidationPreview(input, nextId(), now);
  previews.unshift(record);
  return clone(record);
}

export function listDeliveryValidationPreviews(): DeliveryValidationPreviewRecord[] {
  return previews.map(clone);
}

export function getDeliveryValidationPreviewById(id: string): DeliveryValidationPreviewRecord | null {
  const record = previews.find((preview) => preview.id === id);
  return record ? clone(record) : null;
}

export function updateDeliveryValidationState(id: string, input: DeliveryValidationStateUpdateInput): DeliveryValidationPreviewRecord | null {
  assertAllowed(input.validationStatus, allowedDeliveryValidationStatuses, "VALIDATION_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.approvalState, allowedApprovalStates, "APPROVAL_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.evidenceState, allowedEvidenceStates, "EVIDENCE_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.rejectionState, allowedRejectionStates, "REJECTION_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.revisionState, allowedRevisionStates, "REVISION_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");

  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;

  if (input.validationStatus) record.validationStatus = input.validationStatus;
  if (input.approvalState) record.approvalState = input.approvalState;
  if (input.evidenceState) record.evidenceState = input.evidenceState;
  if (input.rejectionState) record.rejectionState = input.rejectionState;
  if (input.revisionState) record.revisionState = input.revisionState;
  if (typeof input.rejectionReason === "string") record.rejectionReason = input.rejectionReason.trim() || undefined;
  if (typeof input.revisionReason === "string") record.revisionReason = input.revisionReason.trim() || undefined;
  if (typeof input.nextManualGate === "string" && input.nextManualGate.trim()) record.nextManualGate = input.nextManualGate.trim();
  if (typeof input.manualNotes === "string") record.manualNotes = input.manualNotes.trim() || record.manualNotes;
  if (Array.isArray(input.evidenceUpdates)) {
    input.evidenceUpdates.forEach((update) => {
      assertAllowed(update.state, allowedEvidenceStates, "EVIDENCE_UPDATE_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
      const evidence = record.evidence.find((item) => item.id === update.id);
      if (!evidence) return;
      evidence.state = update.state;
      if (typeof update.note === "string" && update.note.trim()) evidence.note = update.note.trim();
      if (update.state === "MANUAL_ATTACHED" && !evidence.attachedAt) evidence.attachedAt = new Date().toISOString();
      if (update.state === "MANUALLY_VERIFIED" && !evidence.verifiedAt) evidence.verifiedAt = new Date().toISOString();
    });
  }
  record.updatedAt = new Date().toISOString();
  return clone(record);
}

export function clearDeliveryValidationPreviewsForTests(): void {
  previews.splice(0, previews.length);
  sequence = 0;
}

export function getDeliveryValidationStatus(): DeliveryValidationStatusSummary {
  return {
    status: "DELIVERY_VALIDATION_P0_READY",
    recordsInMemory: previews.length,
    allowedStatuses: [...allowedDeliveryValidationStatuses],
    allowedApprovalStates: [...allowedApprovalStates],
    allowedEvidenceStates: [...allowedEvidenceStates],
    boundaries: [
      "Delivery Validation P0 creates internal preview records only.",
      "All delivery approvals require manual review and evidence before any future release gate.",
      "Release, real approval, GitHub writes, external contact, payments, storage, workers and schedulers are disabled.",
      "Records are in-memory only and are not persisted to a database.",
    ],
    ...safetyBoundary,
  };
}
