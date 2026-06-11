import { buildReleaseGatePreview, releaseGateSafetyBoundary } from "./releaseGateBuilder";
import type { EvidenceCompleteness, FinancialReadinessState, OperatorApprovalStatus, ReleaseGateCreateInput, ReleaseGatePreviewRecord, ReleaseGateStateUpdateInput, ReleaseGateStatusSummary, ReleaseStatus } from "./releaseGateTypes";

export const allowedReleaseStatuses: ReleaseStatus[] = ["PENDING_REVIEW", "READY_FOR_MANUAL_RELEASE_REVIEW", "BLOCKED", "REVISION_REQUIRED", "CANCELLED"];
export const allowedFinancialReadinessStates: FinancialReadinessState[] = ["NOT_READY", "NEEDS_REVIEW", "READY_MANUAL", "BLOCKED"];
export const allowedEvidenceCompleteness: EvidenceCompleteness[] = ["INCOMPLETE", "PARTIAL", "COMPLETE", "MANUALLY_VERIFIED"];
export const allowedOperatorApprovalStatuses: OperatorApprovalStatus[] = ["NOT_REQUESTED", "PENDING_OPERATOR", "MANUAL_APPROVAL_REQUIRED", "BLOCKED"];

const forbiddenRuntimeStates = ["RELEASED_REAL", "REAL_RELEASED", "INVOICED_REAL", "PAID_REAL", "AUTHORIZED_REAL"];
const previews: ReleaseGatePreviewRecord[] = [];
let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `release_preview_${String(sequence).padStart(6, "0")}`;
}

function clone(record: ReleaseGatePreviewRecord): ReleaseGatePreviewRecord {
  return {
    ...record,
    readinessChecklist: [...record.readinessChecklist],
    blockedReleaseReasons: [...record.blockedReleaseReasons],
    checklist: { ...record.checklist },
    approval_chain: record.approval_chain.map((step) => ({ ...step })),
  };
}

function assertNoForbidden(value: unknown): void {
  if (typeof value === "string" && forbiddenRuntimeStates.includes(value.toUpperCase())) {
    throw new Error("REAL_RELEASE_STATES_NOT_ALLOWED_FOR_RELEASE_GATE_P0");
  }
}

function assertAllowed<T extends string>(value: T | undefined, allowed: readonly T[], message: string): void {
  assertNoForbidden(value);
  if (value !== undefined && !allowed.includes(value)) throw new Error(message);
}

export function createReleasePreview(input: ReleaseGateCreateInput): ReleaseGatePreviewRecord {
  const now = new Date().toISOString();
  const record = buildReleaseGatePreview(input, nextId(), now);
  previews.unshift(record);
  return clone(record);
}

export function listReleasePreviews(): ReleaseGatePreviewRecord[] {
  return previews.map(clone);
}

export function getReleasePreviewById(id: string): ReleaseGatePreviewRecord | null {
  const record = previews.find((preview) => preview.id === id);
  return record ? clone(record) : null;
}

export function updateReleasePreviewState(id: string, input: ReleaseGateStateUpdateInput): ReleaseGatePreviewRecord | null {
  Object.values(input).forEach(assertNoForbidden);
  assertAllowed(input.release_status, allowedReleaseStatuses, "RELEASE_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.financial_readiness_state, allowedFinancialReadinessStates, "FINANCIAL_STATE_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.evidence_completeness, allowedEvidenceCompleteness, "EVIDENCE_COMPLETENESS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  assertAllowed(input.authorization_status, allowedOperatorApprovalStatuses, "AUTHORIZATION_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");

  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;
  if (input.release_status) record.release_status = input.release_status;
  if (input.financial_readiness_state) record.financial_readiness_state = input.financial_readiness_state;
  if (input.evidence_completeness) record.evidence_completeness = input.evidence_completeness;
  if (input.authorization_status) record.authorization_status = input.authorization_status;
  if (typeof input.blocker === "string") record.blocker = input.blocker.trim() || undefined;
  if (typeof input.next_manual_action === "string" && input.next_manual_action.trim()) {
    record.next_manual_action = input.next_manual_action.trim();
    record.nextManualAction = record.next_manual_action;
  }
  if (typeof input.manualNotes === "string" && input.manualNotes.trim()) record.manualNotes = input.manualNotes.trim();
  record.readinessScore = record.readiness_score;
  record.updatedAt = new Date().toISOString();
  record.updated_at = record.updatedAt;
  Object.assign(record, releaseGateSafetyBoundary);
  return clone(record);
}

export function clearReleasePreviewsForTests(): void {
  previews.splice(0, previews.length);
  sequence = 0;
}

export function getReleaseGateStatus(): ReleaseGateStatusSummary {
  return {
    status: "RELEASE_GATE_P0_READY",
    recordsInMemory: previews.length,
    allowedReleaseStatuses: [...allowedReleaseStatuses],
    allowedFinancialReadinessStates: [...allowedFinancialReadinessStates],
    allowedEvidenceCompleteness: [...allowedEvidenceCompleteness],
    allowedOperatorApprovalStatuses: [...allowedOperatorApprovalStatuses],
    boundaries: [
      "Release Gate P0 creates internal in-memory preview records only.",
      "Release, payment, ledger write, GitHub write, external contact and autonomous execution are disabled.",
      "Operator approval and evidence review remain manual-first gates.",
      "No invoices, receipts, checkout sessions, payment captures, database persistence, workers or schedulers are implemented.",
    ],
    ...releaseGateSafetyBoundary,
  };
}
