import type { LedgerCreateInput, LedgerPreviewRecord, LedgerRevenueClass, LedgerSafetyBoundary, LedgerStatus } from "./ledgerTypes";

export const ledgerSafetyBoundary: LedgerSafetyBoundary = {
  mode: "PREVIEW_ONLY",
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

function clean(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

function score(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isReadyManual(input: LedgerCreateInput): boolean {
  return (input.financialReadinessState ?? input.financial_readiness_state ?? "").toUpperCase() === "READY_MANUAL" ||
    (input.releaseStatus ?? input.release_status ?? "").toUpperCase() === "READY_FOR_MANUAL_RELEASE_REVIEW";
}

function isLost(input: LedgerCreateInput): boolean {
  const releaseStatus = (input.releaseStatus ?? input.release_status ?? "").toUpperCase();
  const financialState = (input.financialReadinessState ?? input.financial_readiness_state ?? "").toUpperCase();
  return ["LOST", "CANCELLED"].includes(releaseStatus) || financialState === "LOST";
}

function statusFor(input: LedgerCreateInput): LedgerStatus {
  const releaseStatus = (input.releaseStatus ?? input.release_status ?? "").toUpperCase();
  if (releaseStatus === "CANCELLED") return "CANCELLED";
  if (isLost(input)) return "LOST";
  if (isReadyManual(input)) return "APPROVED_MANUAL";
  if ((input.financialReadinessState ?? input.financial_readiness_state ?? "").toUpperCase() === "NEEDS_REVIEW") return "PENDING_PAYMENT_REVIEW";
  return "FORECAST";
}

function revenueClassFor(status: LedgerStatus): LedgerRevenueClass {
  if (status === "APPROVED_MANUAL") return "APPROVED_REVENUE";
  if (status === "PENDING_PAYMENT_REVIEW") return "PENDING_REVENUE";
  if (status === "LOST" || status === "CANCELLED") return "LOST_REVENUE";
  return "EXPECTED_REVENUE";
}

function accountingReadiness(input: LedgerCreateInput, status: LedgerStatus): number {
  const releaseReadiness = score(input.readinessScore ?? input.readiness_score);
  const safetyScore = 25;
  const traceScore = [input.releasePreviewId ?? input.release_id ?? input.id, input.validationPreviewId ?? input.validation_id, input.executionPreviewId ?? input.execution_id, input.taskId ?? input.task_id]
    .filter(Boolean).length * 5;
  const statusScore = status === "APPROVED_MANUAL" ? 20 : status === "PENDING_PAYMENT_REVIEW" ? 12 : status === "FORECAST" ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round((releaseReadiness * 0.35) + safetyScore + traceScore + statusScore)));
}

function nextManualAction(status: LedgerStatus): string {
  if (status === "APPROVED_MANUAL") return "Operator may review commercial readiness manually. Do not create an invoice, receipt, checkout session or real payment record in P0.";
  if (status === "PENDING_PAYMENT_REVIEW") return "Review financial readiness manually and keep payment, invoice and receipt actions disabled.";
  if (status === "LOST" || status === "CANCELLED") return "Confirm lost or cancelled preview state manually. Keep received revenue at zero.";
  return "Review release preview, scope and forecast manually before any future monetization stage.";
}

export function buildLedgerPreview(input: LedgerCreateInput, id: string, now: string): LedgerPreviewRecord {
  const status = statusFor(input);
  const expected = money(input.estimatedRevenueBrl ?? input.estimated_revenue_brl);
  const releaseId = clean(input.releasePreviewId ?? input.release_id ?? input.id, "release_preview_manual");
  const validationId = clean(input.validationPreviewId ?? input.validation_id, "validation_preview_manual");
  const executionId = clean(input.executionPreviewId ?? input.execution_id, "execution_preview_manual");
  const taskId = clean(input.taskId ?? input.task_id, "task_preview_manual");
  const opportunityId = clean(input.opportunityId ?? input.opportunity_id, "opportunity_preview_manual");
  const approved = status === "APPROVED_MANUAL" ? expected : 0;
  const pending = status === "PENDING_PAYMENT_REVIEW" || status === "FORECAST" ? expected : 0;
  const lost = status === "LOST" || status === "CANCELLED" ? expected : 0;
  const releaseReadiness = score(input.readinessScore ?? input.readiness_score);
  const accountingScore = accountingReadiness(input, status);
  const revenueClass = revenueClassFor(status);
  const trace = {
    opportunity_id: opportunityId,
    task_id: taskId,
    execution_id: executionId,
    validation_id: validationId,
    release_id: releaseId,
    ledger_id: id,
  };

  return {
    id,
    releasePreviewId: releaseId,
    validationPreviewId: validationId,
    executionPreviewId: executionId,
    taskId,
    opportunityId,
    release_id: releaseId,
    validation_id: validationId,
    execution_id: executionId,
    task_id: taskId,
    opportunity_id: opportunityId,
    title: clean(input.title, "Manual Ledger P0 preview"),
    client_label: clean(input.clientLabel, "Manual commercial review"),
    status,
    revenue_class: revenueClass,
    expected_revenue_brl: expected,
    approved_revenue_brl: approved,
    pending_revenue_brl: pending,
    received_revenue_brl: 0,
    lost_revenue_brl: lost,
    conversion_probability: status === "APPROVED_MANUAL" ? 75 : status === "PENDING_PAYMENT_REVIEW" ? 45 : status === "FORECAST" ? 25 : 0,
    accounting_readiness_score: accountingScore,
    release_readiness_score: releaseReadiness,
    ledger_summary: `Ledger P0 preview for ${releaseId}: ${revenueClass.toLowerCase()} tracked safely with no real revenue claimed.`,
    accounting_note: "Preview-only/manual-first Ledger P0 record. No invoice, receipt, payment capture, database accounting write or real revenue claim is permitted.",
    next_manual_action: clean(input.nextManualAction ?? input.next_manual_action, nextManualAction(status)),
    trace,
    full_trace_label: `${opportunityId} → ${taskId} → ${executionId} → ${validationId} → ${releaseId} → ${id}`,
    manualNotes: clean(input.manualNotes, "Created from Release Gate P0 preview-like input for internal forecasting only."),
    createdAt: now,
    updatedAt: now,
    created_at: now,
    updated_at: now,
    ...ledgerSafetyBoundary,
  };
}
