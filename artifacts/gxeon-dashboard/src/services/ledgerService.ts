import { apiUrl } from "./apiBase";
import type { ReleaseGatePreviewRecord } from "./releaseGateService";

export type LedgerMode = "PREVIEW_ONLY";
export type LedgerStatus =
  | "FORECAST"
  | "APPROVED_MANUAL"
  | "PENDING_PAYMENT_REVIEW"
  | "LOST"
  | "CANCELLED"
  | "ARCHIVED";
export type LedgerPreviewStatus =
  | "PREVIEW_ONLY"
  | "OPERATOR_CONFIRMED_MANUAL"
  | "NEEDS_MANUAL_PROOF"
  | "ARCHIVED_MANUAL";
export type LedgerRevenueClass =
  | "EXPECTED_REVENUE"
  | "APPROVED_REVENUE"
  | "PENDING_REVENUE"
  | "LOST_REVENUE";

export type LedgerSafetyBoundary = {
  mode: LedgerMode;
  manualFirst: true;
  providerApiDisabled: true;
  paymentCaptureDisabled: true;
  checkoutDisabled: true;
  webhookDisabled: true;
  externalContactDisabled: true;
  githubWriteDisabled: true;
  paymentDisabled: true;
  invoiceDisabled: true;
  receiptDisabled: true;
  realRevenueClaimed: false;
  databaseWriteDisabled: true;
  approvalRequired: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
};

export type LedgerTrace = {
  opportunity_id: string;
  task_id: string;
  execution_id: string;
  validation_id: string;
  release_id: string;
  ledger_id: string;
};

export type LedgerPreviewRecord = LedgerSafetyBoundary & {
  id: string;
  releasePreviewId: string;
  validationPreviewId: string;
  executionPreviewId: string;
  taskId: string;
  opportunityId: string;
  release_id: string;
  validation_id: string;
  execution_id: string;
  task_id: string;
  opportunity_id: string;
  title: string;
  client_label: string;
  status: LedgerStatus;
  revenue_class: LedgerRevenueClass;
  expected_revenue_brl: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: 0;
  lost_revenue_brl: number;
  conversion_probability: number;
  accounting_readiness_score: number;
  release_readiness_score: number;
  ledger_summary: string;
  accounting_note: string;
  next_manual_action: string;
  trace: LedgerTrace;
  full_trace_label: string;
  manualNotes: string;
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
  source?: "REVENUE_CLOSE_LOOP";
  closeLoopId?: string;
  manualPaymentRequestId?: string | null;
  prospectId?: string | null;
  offerId?: string | null;
  currency?: "BRL";
  forecastRevenueBrl?: number;
  operatorConfirmedRevenueBrl?: number;
  providerVerifiedRevenueBrl?: 0;
  providerVerified?: false;
  paymentGuaranteed?: false;
  previewStatus?: LedgerPreviewStatus;
  manualProofRequired?: true;
  manualProofStatus?:
    | "NOT_ATTACHED"
    | "OPERATOR_REVIEWED"
    | "OPERATOR_CONFIRMED";
  receiptType?: "NON_FISCAL_PREVIEW_ONLY";
  notes?: string;
  timeline?: Array<{
    id: string;
    timestamp: string;
    type: string;
    notes?: string;
  }>;
};

export type LedgerStatusSummary = LedgerSafetyBoundary & {
  status: "LEDGER_P0_READY";
  recordsInMemory: number;
  total_records: number;
  estimated_revenue_brl: number;
  forecastRevenueBrl: number;
  operatorConfirmedRevenueBrl: number;
  providerVerifiedRevenueBrl: 0;
  pendingRevenueBrl: number;
  lostRevenueBrl: number;
  ledgerPreviewCount: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: 0;
  lost_revenue_brl: number;
  active_pipeline_brl: number;
  approval_conversion_rate: number;
  receipt_conversion_rate: 0;
  loss_rate: number;
  average_accounting_readiness: number;
  allowedStatuses: LedgerStatus[];
  allowedRevenueClasses: LedgerRevenueClass[];
  boundaries: string[];
};

export type LedgerCreateInput = {
  title?: string;
  releasePreviewId?: string;
  validationPreviewId?: string;
  executionPreviewId?: string;
  taskId?: string | null;
  estimatedRevenueBrl?: number;
  readinessScore?: number;
  releaseStatus?: string;
  financialReadinessState?: string;
};

const safetyBoundary: LedgerSafetyBoundary = {
  mode: "PREVIEW_ONLY",
  manualFirst: true,
  providerApiDisabled: true,
  paymentCaptureDisabled: true,
  checkoutDisabled: true,
  webhookDisabled: true,
  externalContactDisabled: true,
  githubWriteDisabled: true,
  paymentDisabled: true,
  invoiceDisabled: true,
  receiptDisabled: true,
  realRevenueClaimed: false,
  databaseWriteDisabled: true,
  approvalRequired: true,
  externalContact: false,
  githubWrites: false,
  paymentAction: false,
  autonomousExecution: false,
};

export function fallbackLedgerStatus(): LedgerStatusSummary {
  return {
    status: "LEDGER_P0_READY",
    recordsInMemory: 0,
    total_records: 0,
    estimated_revenue_brl: 0,
    forecastRevenueBrl: 0,
    operatorConfirmedRevenueBrl: 0,
    providerVerifiedRevenueBrl: 0,
    pendingRevenueBrl: 0,
    lostRevenueBrl: 0,
    ledgerPreviewCount: 0,
    approved_revenue_brl: 0,
    pending_revenue_brl: 0,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    active_pipeline_brl: 0,
    approval_conversion_rate: 0,
    receipt_conversion_rate: 0,
    loss_rate: 0,
    average_accounting_readiness: 0,
    allowedStatuses: [
      "FORECAST",
      "APPROVED_MANUAL",
      "PENDING_PAYMENT_REVIEW",
      "LOST",
      "CANCELLED",
      "ARCHIVED",
    ],
    allowedRevenueClasses: [
      "EXPECTED_REVENUE",
      "APPROVED_REVENUE",
      "PENDING_REVENUE",
      "LOST_REVENUE",
    ],
    boundaries: [
      "Backend unavailable: showing safe empty preview/manual state only.",
    ],
    ...safetyBoundary,
  };
}

async function jsonRequest<T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    signal,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };
  if (!response.ok || !payload.success || !payload.data)
    throw new Error(
      payload.error ?? payload.message ?? "LEDGER_API_REQUEST_FAILED",
    );
  return payload.data;
}

export async function fetchLedgerStatus(
  signal?: AbortSignal,
): Promise<LedgerStatusSummary> {
  try {
    return await jsonRequest<LedgerStatusSummary>(
      "/api/ledger/status",
      undefined,
      signal,
    );
  } catch {
    return fallbackLedgerStatus();
  }
}

export async function fetchLedgerPreviews(
  signal?: AbortSignal,
): Promise<LedgerPreviewRecord[]> {
  try {
    const data = await jsonRequest<
      LedgerStatusSummary & { ledgerPreviews: LedgerPreviewRecord[] }
    >("/api/ledger/previews", undefined, signal);
    return data.ledgerPreviews ?? [];
  } catch {
    return [];
  }
}

export async function fetchLedgerPreviewById(
  id: string,
  signal?: AbortSignal,
): Promise<LedgerPreviewRecord | null> {
  try {
    const data = await jsonRequest<{ ledgerPreview: LedgerPreviewRecord }>(
      `/api/ledger/previews/${id}`,
      undefined,
      signal,
    );
    return data.ledgerPreview;
  } catch {
    return null;
  }
}

export async function createLedgerPreview(
  input: LedgerCreateInput | ReleaseGatePreviewRecord,
): Promise<LedgerPreviewRecord | null> {
  try {
    const data = await jsonRequest<{ ledgerPreview: LedgerPreviewRecord }>(
      "/api/ledger/previews",
      { method: "POST", body: JSON.stringify(input) },
    );
    return data.ledgerPreview;
  } catch {
    return null;
  }
}

export async function createLedgerPreviewFromRelease(
  release: ReleaseGatePreviewRecord,
): Promise<LedgerPreviewRecord | null> {
  return createLedgerPreview({
    title: release.title,
    releasePreviewId: release.id,
    validationPreviewId: release.validationPreviewId,
    executionPreviewId: release.executionPreviewId,
    taskId: release.taskId,
    estimatedRevenueBrl: release.estimated_revenue_brl,
    readinessScore: release.readiness_score,
    releaseStatus: release.release_status,
    financialReadinessState: release.financial_readiness_state,
    manualNotes: release.manualNotes,
    nextManualAction: release.next_manual_action,
  });
}

export async function syncLedgerPreviewFromCloseLoop(
  closeLoopId: string,
): Promise<LedgerPreviewRecord | null> {
  try {
    const data = await jsonRequest<{ ledgerPreview: LedgerPreviewRecord }>(
      `/api/ledger/from-close-loop/${closeLoopId}`,
      { method: "POST" },
    );
    return data.ledgerPreview;
  } catch {
    return null;
  }
}

export async function updateLedgerPreviewManualStatus(
  id: string,
  status: LedgerPreviewStatus,
  notes?: string,
): Promise<LedgerPreviewRecord | null> {
  try {
    const data = await jsonRequest<{ ledgerPreview: LedgerPreviewRecord }>(
      `/api/ledger/previews/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status, notes }) },
    );
    return data.ledgerPreview;
  } catch {
    return null;
  }
}

export async function updateLedgerPreviewState(
  id: string,
  status: LedgerStatus,
  nextManualAction?: string,
): Promise<LedgerPreviewRecord | null> {
  try {
    const data = await jsonRequest<{ ledgerPreview: LedgerPreviewRecord }>(
      `/api/ledger/previews/${id}/state`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, next_manual_action: nextManualAction }),
      },
    );
    return data.ledgerPreview;
  } catch {
    return null;
  }
}
