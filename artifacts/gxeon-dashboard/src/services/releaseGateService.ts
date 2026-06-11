import { apiUrl } from "./apiBase";
import type { DeliveryValidationPreviewRecord } from "./deliveryValidationService";

export type ReleaseMode = "PREVIEW_ONLY";
export type ReleaseStatus = "PENDING_REVIEW" | "READY_FOR_MANUAL_RELEASE_REVIEW" | "BLOCKED" | "REVISION_REQUIRED" | "CANCELLED";
export type FinancialReadinessState = "NOT_READY" | "NEEDS_REVIEW" | "READY_MANUAL" | "BLOCKED";
export type EvidenceCompleteness = "INCOMPLETE" | "PARTIAL" | "COMPLETE" | "MANUALLY_VERIFIED";
export type OperatorApprovalStatus = "NOT_REQUESTED" | "PENDING_OPERATOR" | "MANUAL_APPROVAL_REQUIRED" | "BLOCKED";

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

export type ReleaseGateStateUpdateInput = Partial<Pick<ReleaseGatePreviewRecord, "release_status" | "financial_readiness_state" | "evidence_completeness" | "authorization_status" | "blocker" | "next_manual_action" | "manualNotes">>;

export type ReleaseGateStatusSummary = ReleaseGateSafetyBoundary & {
  status: "RELEASE_GATE_P0_READY";
  recordsInMemory: number;
  allowedReleaseStatuses: ReleaseStatus[];
  allowedFinancialReadinessStates: FinancialReadinessState[];
  allowedEvidenceCompleteness: EvidenceCompleteness[];
  allowedOperatorApprovalStatuses: OperatorApprovalStatus[];
  boundaries: string[];
};

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string; message?: string };

function safeBoundary(): ReleaseGateSafetyBoundary {
  return {
    mode: "PREVIEW_ONLY",
    releaseDisabled: true,
    paymentDisabled: true,
    ledgerWriteDisabled: true,
    approvalRequired: true,
    evidenceRequired: true,
    revenueClaimed: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    autonomousExecution: false,
  };
}

async function readJson<T>(response: Response, endpoint: string): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.message ?? payload?.error ?? `${endpoint} failed`);
  return payload.data;
}

export function fallbackReleaseGateStatus(_error?: unknown): ReleaseGateStatusSummary {
  return {
    status: "RELEASE_GATE_P0_READY",
    recordsInMemory: 0,
    allowedReleaseStatuses: ["PENDING_REVIEW", "READY_FOR_MANUAL_RELEASE_REVIEW", "BLOCKED", "REVISION_REQUIRED", "CANCELLED"],
    allowedFinancialReadinessStates: ["NOT_READY", "NEEDS_REVIEW", "READY_MANUAL", "BLOCKED"],
    allowedEvidenceCompleteness: ["INCOMPLETE", "PARTIAL", "COMPLETE", "MANUALLY_VERIFIED"],
    allowedOperatorApprovalStatuses: ["NOT_REQUESTED", "PENDING_OPERATOR", "MANUAL_APPROVAL_REQUIRED", "BLOCKED"],
    boundaries: ["Backend unavailable: dashboard is showing safe fallback with no release, invoice, payment, ledger write, GitHub write or revenue claim."],
    ...safeBoundary(),
  };
}

function fallbackReleasePreview(input: ReleaseGateCreateInput, reason: string): ReleaseGatePreviewRecord {
  const now = new Date().toISOString();
  return {
    id: `release_preview_fallback_${Date.now()}`,
    validationPreviewId: input.validationPreviewId,
    executionPreviewId: input.executionPreviewId,
    brokerDecisionId: input.brokerDecisionId,
    taskId: input.taskId,
    title: input.title ?? "Fallback Release Gate P0 preview",
    release_status: "PENDING_REVIEW",
    financial_readiness_state: "NOT_READY",
    evidence_completeness: "INCOMPLETE",
    authorization_status: "PENDING_OPERATOR",
    estimatedRevenueBrl: input.estimatedRevenueBrl ?? 0,
    estimated_revenue_brl: input.estimatedRevenueBrl ?? 0,
    releasable_revenue_brl: 0,
    readinessScore: 20,
    readiness_score: 20,
    checklist: { delivery_approved: false, evidence_complete: false, scope_confirmed: false, release_authorized: false, financial_ready: false, ledger_write_disabled: true },
    readinessChecklist: ["Delivery validation reviewed", "Evidence completeness reviewed", "Scope confirmed manually", "Release authorization remains manual", "Financial readiness remains preview-only", "Ledger write remains disabled"],
    approval_chain: [{ role: "Operator", owner: "Junior Sena", status: "WAITING", note: "Fallback preview only; backend did not create a persistent in-memory record." }],
    blockedReleaseReasons: [reason, "Release, invoice, payment, ledger write and revenue claim remain disabled."],
    release_summary: "Safe fallback Release Gate P0 preview. No real action occurred.",
    blocker: reason,
    nextManualAction: "Restore backend availability, then recreate the release preview manually. Do not release automatically.",
    next_manual_action: "Restore backend availability, then recreate the release preview manually. Do not release automatically.",
    manualNotes: "Fallback preview only. No runtime persistence occurred.",
    p0_p1_p2_p3_p4_trace: `Validation ${input.validationPreviewId ?? "manual-preview"} → fallback Release Gate P0`,
    createdAt: now,
    updatedAt: now,
    created_at: now,
    updated_at: now,
    ...safeBoundary(),
  };
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Release Gate backend unavailable";
}

export function releaseInputFromValidationPreview(preview: DeliveryValidationPreviewRecord): ReleaseGateCreateInput {
  return {
    validationPreviewId: preview.id,
    executionPreviewId: preview.executionPreviewId,
    brokerDecisionId: preview.brokerDecisionId,
    taskId: preview.taskId,
    title: preview.title,
    approvalState: preview.approvalState,
    evidenceState: preview.evidenceState,
    validationStatus: preview.validationStatus,
    blockedActions: preview.blockedActions,
    acceptanceCriteria: preview.acceptanceCriteria,
    evidenceChecklist: preview.evidenceChecklist,
    estimatedRevenueBrl: 0,
    manualNotes: `Created from Delivery Validation P0 preview ${preview.id}; release remains disabled.`,
    nextManualAction: "Review validation evidence and financial readiness manually. Do not release, invoice or claim revenue automatically.",
  };
}

export async function fetchReleaseGateStatus(signal?: AbortSignal): Promise<ReleaseGateStatusSummary> {
  try {
    return await readJson<ReleaseGateStatusSummary>(await fetch(apiUrl("/api/release/status"), { headers: { Accept: "application/json" }, signal }), "/api/release/status");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackReleaseGateStatus(error);
  }
}

export async function fetchReleasePreviews(signal?: AbortSignal): Promise<ReleaseGatePreviewRecord[]> {
  try {
    const data = await readJson<{ releasePreviews: ReleaseGatePreviewRecord[] }>(await fetch(apiUrl("/api/release/previews"), { headers: { Accept: "application/json" }, signal }), "/api/release/previews");
    return data.releasePreviews;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}

export async function fetchReleasePreviewById(id: string, signal?: AbortSignal): Promise<ReleaseGatePreviewRecord | null> {
  try {
    const data = await readJson<{ releasePreview: ReleaseGatePreviewRecord }>(await fetch(apiUrl(`/api/release/previews/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/release/previews/${id}`);
    return data.releasePreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function createReleasePreview(input: ReleaseGateCreateInput): Promise<ReleaseGatePreviewRecord> {
  try {
    const data = await readJson<{ releasePreview: ReleaseGatePreviewRecord }>(await fetch(apiUrl("/api/release/previews"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/release/previews");
    return data.releasePreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackReleasePreview(input, failureMessage(error));
  }
}

export async function updateReleasePreviewState(id: string, input: ReleaseGateStateUpdateInput): Promise<ReleaseGatePreviewRecord | null> {
  try {
    const data = await readJson<{ releasePreview: ReleaseGatePreviewRecord }>(await fetch(apiUrl(`/api/release/previews/${id}/state`), { method: "PATCH", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), `/api/release/previews/${id}/state`);
    return data.releasePreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}
