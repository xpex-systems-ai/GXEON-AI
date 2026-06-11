import { apiUrl, getApiBaseDiagnostic } from "./apiBase";
import type { ExecutionPreviewRecord } from "./executionCenterService";

export type ValidationMode = "PREVIEW_ONLY";
export type DeliveryValidationStatus = "AWAITING_EVIDENCE" | "EVIDENCE_ATTACHED" | "MANUAL_REVIEW" | "VALIDATION_BLOCKED" | "READY_FOR_RELEASE_REVIEW" | "CANCELLED";
export type ApprovalState = "PENDING_REVIEW" | "APPROVED_MANUAL" | "REVISION_REQUESTED" | "REJECTED" | "ARCHIVED";
export type EvidenceState = "MISSING" | "MANUAL_ATTACHED" | "READY_FOR_REVIEW" | "MANUALLY_VERIFIED" | "NEEDS_REVISION";
export type RejectionState = "NONE" | "SCOPE_MISMATCH" | "INSUFFICIENT_EVIDENCE" | "QUALITY_RISK" | "OPERATOR_REJECTED";
export type RevisionState = "NONE" | "COPY_REVISION" | "VISUAL_REVISION" | "TECHNICAL_REVISION" | "EVIDENCE_REVISION" | "ROLLBACK_REVISION";

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

export type DeliveryValidationPreviewRecord = {
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
  mode: ValidationMode;
  approvalRequired: true;
  evidenceRequired: true;
  releaseDisabled: true;
  executionDisabled: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryValidationStatusSummary = {
  status: "DELIVERY_VALIDATION_P0_READY" | "DELIVERY_VALIDATION_P0_FALLBACK";
  mode: ValidationMode;
  approvalRequired: true;
  evidenceRequired: true;
  releaseDisabled: true;
  executionDisabled: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  recordsInMemory: number;
  allowedStatuses: DeliveryValidationStatus[];
  allowedApprovalStates: ApprovalState[];
  allowedEvidenceStates: EvidenceState[];
  boundaries: string[];
  diagnostics?: {
    apiBase: string;
    attemptedRoute: string;
    failureType: "network_error" | "non_json" | "non_2xx" | "invalid_json" | "misconfigured_backend_url" | "unknown";
    message: string;
  };
};

export type DeliveryValidationCreateInput = {
  executionPreviewId?: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title?: string;
  riskEnergy?: number;
  blockedActions?: string[];
  evidenceRequirements?: string[];
  checklist?: string[];
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

async function readJson<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();
  if (!bodyText.trim()) throw new Error(`REQUEST_FAILED_${response.status}: Empty response body from ${route}`);
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`BACKEND_NON_JSON_RESPONSE: ${route} returned ${response.status} - ${bodyText.trim().slice(0, 160)}`);
  }
  let payload: { success?: boolean; data?: T; error?: string; message?: string };
  try {
    payload = JSON.parse(bodyText) as { success?: boolean; data?: T; error?: string; message?: string };
  } catch {
    throw new Error(`BACKEND_INVALID_JSON_RESPONSE: ${route} returned ${response.status}`);
  }
  if (!response.ok || !payload.success) throw new Error(`REQUEST_FAILED_${response.status}: ${payload.message ?? payload.error ?? "Delivery Validation request failed"}`);
  return payload.data as T;
}

function classifyFailure(error: unknown): NonNullable<DeliveryValidationStatusSummary["diagnostics"]>["failureType"] {
  if (!(error instanceof Error)) return "unknown";
  if (error.message.startsWith("BACKEND_URL_MISCONFIGURED")) return "misconfigured_backend_url";
  if (error.message.startsWith("BACKEND_NON_JSON_RESPONSE")) return "non_json";
  if (error.message.startsWith("BACKEND_INVALID_JSON_RESPONSE")) return "invalid_json";
  if (error.message.startsWith("REQUEST_FAILED_")) return "non_2xx";
  return "network_error";
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "DELIVERY_VALIDATION_BACKEND_UNAVAILABLE";
}

export function fallbackDeliveryValidationStatus(error?: unknown, attemptedRoute = "/api/validation/status"): DeliveryValidationStatusSummary {
  return {
    status: "DELIVERY_VALIDATION_P0_FALLBACK",
    mode: "PREVIEW_ONLY",
    approvalRequired: true,
    evidenceRequired: true,
    releaseDisabled: true,
    executionDisabled: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    recordsInMemory: 0,
    allowedStatuses: ["AWAITING_EVIDENCE", "EVIDENCE_ATTACHED", "MANUAL_REVIEW", "VALIDATION_BLOCKED", "READY_FOR_RELEASE_REVIEW", "CANCELLED"],
    allowedApprovalStates: ["PENDING_REVIEW", "APPROVED_MANUAL", "REVISION_REQUESTED", "REJECTED", "ARCHIVED"],
    allowedEvidenceStates: ["MISSING", "MANUAL_ATTACHED", "READY_FOR_REVIEW", "MANUALLY_VERIFIED", "NEEDS_REVISION"],
    boundaries: [
      "Backend unavailable; dashboard is showing safe preview-only fallback state.",
      "No release, approve-real, upload, payment, external-contact or GitHub-write control is enabled.",
    ],
    diagnostics: { apiBase: getApiBaseDiagnostic(), attemptedRoute, failureType: classifyFailure(error), message: failureMessage(error) },
  };
}

function fallbackValidationPreview(input: DeliveryValidationCreateInput, reason: string): DeliveryValidationPreviewRecord {
  const now = new Date().toISOString();
  const evidenceRequirements = input.evidenceRequirements?.length ? input.evidenceRequirements : ["Screenshot or report of manual result", "Before/after notes", "Operator confirmation", "Rollback notes"];
  return {
    id: `validation_fallback_${Date.now()}`,
    executionPreviewId: input.executionPreviewId,
    brokerDecisionId: input.brokerDecisionId,
    taskId: input.taskId,
    title: input.title ?? "Fallback delivery validation preview",
    validationStatus: "AWAITING_EVIDENCE",
    approvalState: "PENDING_REVIEW",
    evidenceState: "MISSING",
    rejectionState: "NONE",
    revisionState: "NONE",
    riskEnergy: input.riskEnergy ?? 0,
    blockedActions: input.blockedActions ?? ["external_contact", "payment_action", "github_write", "autonomous_execution"],
    acceptanceCriteria: ["Operator reviewed execution preview", "All required evidence labels are accounted for", "Blocked actions remained blocked", "Release Gate remains disabled until operator review"],
    evidenceChecklist: evidenceRequirements,
    evidence: evidenceRequirements.map((label, index) => ({ id: `fallback_evidence_${index + 1}`, label, state: "MISSING" as const, required: true as const, source: "VALIDATION_P0" as const, note: reason })),
    manualNotes: "Fallback preview only. Backend creation did not persist in memory.",
    nextManualGate: "Restore backend availability, then create a validation preview. Do not release automatically.",
    outcomeSummary: "Safe fallback validation preview; no real approval or release occurred.",
    mode: "PREVIEW_ONLY",
    approvalRequired: true,
    evidenceRequired: true,
    releaseDisabled: true,
    executionDisabled: true,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    autonomousExecution: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validationInputFromExecutionPreview(preview: ExecutionPreviewRecord): DeliveryValidationCreateInput {
  return {
    executionPreviewId: preview.id,
    brokerDecisionId: preview.brokerDecisionId,
    taskId: preview.taskId,
    title: preview.title,
    riskEnergy: preview.riskEnergy,
    blockedActions: preview.blockedActions,
    evidenceRequirements: preview.evidenceRequirements.map((item) => item.label),
    checklist: preview.checklist.map((item) => item.label),
    rollbackPlan: preview.rollbackPlan,
    operatorNextAction: "Attach or describe evidence manually, then move to Manual Review. Do not release automatically.",
    manualNotes: `Created from Execution Center preview ${preview.id}; release remains disabled.`,
  };
}

export async function fetchDeliveryValidationStatus(signal?: AbortSignal): Promise<DeliveryValidationStatusSummary> {
  try {
    return await readJson<DeliveryValidationStatusSummary>(await fetch(apiUrl("/api/validation/status"), { headers: { Accept: "application/json" }, signal }), "/api/validation/status");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackDeliveryValidationStatus(error);
  }
}

export async function fetchDeliveryValidationPreviews(signal?: AbortSignal): Promise<DeliveryValidationPreviewRecord[]> {
  try {
    const data = await readJson<{ validationPreviews: DeliveryValidationPreviewRecord[] }>(await fetch(apiUrl("/api/validation/previews"), { headers: { Accept: "application/json" }, signal }), "/api/validation/previews");
    return data.validationPreviews;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}

export async function fetchDeliveryValidationPreviewById(id: string, signal?: AbortSignal): Promise<DeliveryValidationPreviewRecord | null> {
  try {
    const data = await readJson<{ validationPreview: DeliveryValidationPreviewRecord }>(await fetch(apiUrl(`/api/validation/previews/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/validation/previews/${id}`);
    return data.validationPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function createDeliveryValidationPreview(input: DeliveryValidationCreateInput): Promise<DeliveryValidationPreviewRecord> {
  try {
    const data = await readJson<{ validationPreview: DeliveryValidationPreviewRecord }>(await fetch(apiUrl("/api/validation/previews"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/validation/previews");
    return data.validationPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackValidationPreview(input, failureMessage(error));
  }
}

export async function updateDeliveryValidationState(id: string, input: DeliveryValidationStateUpdateInput): Promise<DeliveryValidationPreviewRecord | null> {
  try {
    const data = await readJson<{ validationPreview: DeliveryValidationPreviewRecord }>(await fetch(apiUrl(`/api/validation/previews/${id}/state`), { method: "PATCH", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), `/api/validation/previews/${id}/state`);
    return data.validationPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}
