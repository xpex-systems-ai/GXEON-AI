import { buildLedgerPreview, ledgerSafetyBoundary } from "./ledgerBuilder";
import type { LedgerCreateInput, LedgerPreviewRecord, LedgerStateUpdateInput, LedgerStatus, LedgerStatusSummary } from "./ledgerTypes";

export const allowedLedgerStatuses: LedgerStatus[] = ["FORECAST", "APPROVED_MANUAL", "PENDING_PAYMENT_REVIEW", "LOST", "CANCELLED", "ARCHIVED"];
const forbiddenRuntimeStates = ["RECEIVED_REAL", "PAID_REAL", "PAYMENT_RECEIVED", "MARKED_PAID", "CAPTURED_REAL"];
const previews: LedgerPreviewRecord[] = [];
let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `ledger_preview_${String(sequence).padStart(6, "0")}`;
}

function clone(record: LedgerPreviewRecord): LedgerPreviewRecord {
  return { ...record, trace: { ...record.trace }, ...ledgerSafetyBoundary };
}

function assertNoForbidden(value: unknown): void {
  if (typeof value === "string" && forbiddenRuntimeStates.includes(value.toUpperCase())) {
    throw new Error("REAL_PAYMENT_OR_RECEIPT_STATES_NOT_ALLOWED_FOR_LEDGER_P0");
  }
}

export function createLedgerPreview(input: LedgerCreateInput): LedgerPreviewRecord {
  Object.values(input).forEach(assertNoForbidden);
  const record = buildLedgerPreview(input, nextId(), new Date().toISOString());
  previews.unshift(record);
  return clone(record);
}

export function listLedgerPreviews(): LedgerPreviewRecord[] {
  return previews.map(clone);
}

export function getLedgerPreviewById(id: string): LedgerPreviewRecord | null {
  const record = previews.find((preview) => preview.id === id);
  return record ? clone(record) : null;
}

export function updateLedgerPreviewState(id: string, input: LedgerStateUpdateInput): LedgerPreviewRecord | null {
  Object.values(input).forEach(assertNoForbidden);
  if (input.status && !allowedLedgerStatuses.includes(input.status)) throw new Error("LEDGER_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;
  if (input.status) {
    record.status = input.status;
    record.revenue_class = input.status === "APPROVED_MANUAL" ? "APPROVED_REVENUE" : input.status === "PENDING_PAYMENT_REVIEW" ? "PENDING_REVENUE" : ["LOST", "CANCELLED"].includes(input.status) ? "LOST_REVENUE" : "EXPECTED_REVENUE";
    record.approved_revenue_brl = input.status === "APPROVED_MANUAL" ? record.expected_revenue_brl : 0;
    record.pending_revenue_brl = input.status === "PENDING_PAYMENT_REVIEW" || input.status === "FORECAST" ? record.expected_revenue_brl : 0;
    record.lost_revenue_brl = ["LOST", "CANCELLED"].includes(input.status) ? record.expected_revenue_brl : 0;
    record.received_revenue_brl = 0;
  }
  const nextManualAction = input.next_manual_action ?? input.nextManualAction;
  if (typeof nextManualAction === "string" && nextManualAction.trim()) record.next_manual_action = nextManualAction.trim();
  if (typeof input.manualNotes === "string" && input.manualNotes.trim()) record.manualNotes = input.manualNotes.trim();
  record.updatedAt = new Date().toISOString();
  record.updated_at = record.updatedAt;
  Object.assign(record, ledgerSafetyBoundary);
  return clone(record);
}

function sum(field: keyof Pick<LedgerPreviewRecord, "expected_revenue_brl" | "approved_revenue_brl" | "pending_revenue_brl" | "lost_revenue_brl">): number {
  return previews.filter((record) => record.status !== "ARCHIVED").reduce((total, record) => total + record[field], 0);
}

export function getLedgerStatusSummary(): LedgerStatusSummary {
  const active = previews.filter((record) => record.status !== "ARCHIVED");
  const estimated = sum("expected_revenue_brl");
  const approved = sum("approved_revenue_brl");
  const pending = sum("pending_revenue_brl");
  const lost = sum("lost_revenue_brl");
  return {
    status: "LEDGER_P0_READY",
    recordsInMemory: previews.length,
    total_records: previews.length,
    estimated_revenue_brl: estimated,
    approved_revenue_brl: approved,
    pending_revenue_brl: pending,
    received_revenue_brl: 0,
    lost_revenue_brl: lost,
    active_pipeline_brl: approved + pending,
    approval_conversion_rate: estimated === 0 ? 0 : Math.round((approved / estimated) * 100),
    receipt_conversion_rate: 0,
    loss_rate: estimated === 0 ? 0 : Math.round((lost / estimated) * 100),
    average_accounting_readiness: active.length === 0 ? 0 : Math.round(active.reduce((total, record) => total + record.accounting_readiness_score, 0) / active.length),
    allowedStatuses: [...allowedLedgerStatuses],
    allowedRevenueClasses: ["EXPECTED_REVENUE", "APPROVED_REVENUE", "PENDING_REVENUE", "LOST_REVENUE"],
    boundaries: [
      "Ledger P0 creates in-memory preview records only.",
      "Payment, invoice, receipt, real revenue claim and accounting database writes are disabled.",
      "Release Gate P0 previews can be transformed into manual-first ledger forecasts.",
      "No workers, schedulers, provider calls, checkout sessions or external contacts are implemented.",
    ],
    ...ledgerSafetyBoundary,
  };
}

export function clearLedgerPreviewsForTests(): void {
  previews.splice(0, previews.length);
  sequence = 0;
}
