import { buildLedgerPreview, ledgerSafetyBoundary } from "./ledgerBuilder";
import type {
  LedgerCreateInput,
  LedgerPreviewRecord,
  LedgerPreviewStatus,
  LedgerStateUpdateInput,
  LedgerStatus,
  LedgerStatusSummary,
} from "./ledgerTypes";
import {
  getOperatorConfirmedRevenueById,
  getRevenueCloseLoopById,
} from "../revenueCloseLoop/revenueCloseLoopStore";
import type { RevenueCloseLoop } from "../revenueCloseLoop/revenueCloseLoopTypes";
import { r100DurableStateRegistry } from "../durableState/r100DurableStateRegistry";

export const allowedLedgerStatuses: LedgerStatus[] = [
  "FORECAST",
  "APPROVED_MANUAL",
  "PENDING_PAYMENT_REVIEW",
  "LOST",
  "CANCELLED",
  "ARCHIVED",
];
const forbiddenRuntimeStates = [
  "RECEIVED_REAL",
  "PAID_REAL",
  "PAYMENT_RECEIVED",
  "MARKED_PAID",
  "CAPTURED_REAL",
];
const manualPreviewStatuses: LedgerPreviewStatus[] = [
  "PREVIEW_ONLY",
  "OPERATOR_CONFIRMED_MANUAL",
  "NEEDS_MANUAL_PROOF",
  "ARCHIVED_MANUAL",
];
const previews: LedgerPreviewRecord[] = [];
let sequence = 0;
export function hydrateLedgerPreviewsFromDurableState(): void {
  previews.splice(0, previews.length, ...r100DurableStateRegistry.loadCollection<LedgerPreviewRecord>("ledgerPreviews"));
  sequence = previews.reduce((max, preview) => Math.max(max, Number(preview.id.match(/(\d+)$/)?.[1] ?? 0)), 0);
}
hydrateLedgerPreviewsFromDurableState();
function persistLedgerPreviews(): void { r100DurableStateRegistry.saveCollection("ledgerPreviews", previews.map(clone)); }

function nextId(): string {
  sequence += 1;
  return `ledger_preview_${String(sequence).padStart(6, "0")}`;
}

function clone(record: LedgerPreviewRecord): LedgerPreviewRecord {
  return {
    ...record,
    trace: { ...record.trace },
    timeline: record.timeline
      ? record.timeline.map((event) => ({
          ...event,
          metadata: event.metadata ? { ...event.metadata } : undefined,
        }))
      : undefined,
    ...ledgerSafetyBoundary,
    providerVerified: false,
    paymentGuaranteed: false,
    realRevenueClaimed: false,
    providerVerifiedRevenueBrl: 0,
  };
}

function event(
  type: string,
  notes?: string,
  metadata: Record<string, unknown> = {},
) {
  return {
    id: `ledger_event_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type,
    notes,
    metadata,
  };
}

function decorateCloseLoopPreview(
  record: LedgerPreviewRecord,
  loop: RevenueCloseLoop,
): LedgerPreviewRecord {
  const revenue = loop.operatorConfirmedRevenueId
    ? getOperatorConfirmedRevenueById(loop.operatorConfirmedRevenueId)
    : undefined;
  const operatorConfirmedRevenueBrl = revenue?.amountBrl ?? 0;
  const forecastRevenueBrl = loop.targetAmountBrl;
  const previewStatus: LedgerPreviewStatus =
    operatorConfirmedRevenueBrl > 0
      ? "OPERATOR_CONFIRMED_MANUAL"
      : loop.proofChecklist
        ? "NEEDS_MANUAL_PROOF"
        : "PREVIEW_ONLY";
  const timelineType =
    operatorConfirmedRevenueBrl > 0
      ? "OPERATOR_CONFIRMED_REVENUE_SYNCED_TO_LEDGER_PREVIEW"
      : "REVENUE_CLOSE_LOOP_SYNCED_TO_LEDGER_PREVIEW";
  const existingTimeline = record.timeline ?? [];
  return {
    ...record,
    source: "REVENUE_CLOSE_LOOP",
    closeLoopId: loop.id,
    manualPaymentRequestId: loop.paymentRequestId ?? null,
    prospectId: loop.prospectId ?? null,
    offerId: loop.offerId ?? null,
    currency: "BRL",
    forecastRevenueBrl,
    operatorConfirmedRevenueBrl,
    providerVerifiedRevenueBrl: 0,
    providerVerified: false,
    paymentGuaranteed: false,
    previewStatus,
    manualProofRequired: true,
    manualProofStatus:
      operatorConfirmedRevenueBrl > 0
        ? "OPERATOR_CONFIRMED"
        : loop.proofChecklist
          ? "OPERATOR_REVIEWED"
          : "NOT_ATTACHED",
    receiptType: "NON_FISCAL_PREVIEW_ONLY",
    notes:
      operatorConfirmedRevenueBrl > 0
        ? "Operator confirmed manually after external proof review. Preview-only ledger; no provider settlement."
        : "Revenue close loop forecast preview. Manual proof still required.",
    status: operatorConfirmedRevenueBrl > 0 ? "APPROVED_MANUAL" : "FORECAST",
    revenue_class:
      operatorConfirmedRevenueBrl > 0 ? "APPROVED_REVENUE" : "EXPECTED_REVENUE",
    expected_revenue_brl: forecastRevenueBrl,
    approved_revenue_brl: operatorConfirmedRevenueBrl,
    pending_revenue_brl:
      operatorConfirmedRevenueBrl > 0 ? 0 : forecastRevenueBrl,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    ledger_summary: `Revenue Close Loop ${loop.id} synced to preview-only ledger. Operator confirmed BRL ${operatorConfirmedRevenueBrl}; provider verified BRL 0.`,
    accounting_note:
      "Internal non-fiscal preview only. Not invoice, not receipt, not settlement, not real provider-verified revenue.",
    next_manual_action:
      operatorConfirmedRevenueBrl > 0
        ? "Review ledger preview, keep provider verified at R$0, then archive manually if appropriate."
        : "Collect/review manual proof outside GXEON before operator confirmation.",
    manualNotes: loop.notes ?? record.manualNotes,
    timeline: existingTimeline.some((item) => item.type === timelineType)
      ? existingTimeline
      : [
          ...existingTimeline,
          event(timelineType, loop.notes, {
            closeLoopId: loop.id,
            operatorConfirmedRevenueBrl,
            providerVerified: false,
            paymentGuaranteed: false,
            realRevenueClaimed: false,
          }),
        ],
    updatedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...ledgerSafetyBoundary,
  };
}

function assertNoForbidden(value: unknown): void {
  if (
    typeof value === "string" &&
    forbiddenRuntimeStates.includes(value.toUpperCase())
  ) {
    throw new Error("REAL_PAYMENT_OR_RECEIPT_STATES_NOT_ALLOWED_FOR_LEDGER_P0");
  }
}

export function createLedgerPreview(
  input: LedgerCreateInput,
): LedgerPreviewRecord {
  Object.values(input).forEach(assertNoForbidden);
  const record = buildLedgerPreview(input, nextId(), new Date().toISOString());
  previews.unshift(record);
  persistLedgerPreviews();
  return clone(record);
}

export function listLedgerPreviews(): LedgerPreviewRecord[] {
  return previews.map(clone);
}

export function getLedgerPreviewById(id: string): LedgerPreviewRecord | null {
  const record = previews.find((preview) => preview.id === id);
  return record ? clone(record) : null;
}

export function updateLedgerPreviewState(
  id: string,
  input: LedgerStateUpdateInput,
): LedgerPreviewRecord | null {
  Object.values(input).forEach(assertNoForbidden);
  if (input.status && !allowedLedgerStatuses.includes(input.status))
    throw new Error("LEDGER_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;
  if (input.status) {
    record.status = input.status;
    record.revenue_class =
      input.status === "APPROVED_MANUAL"
        ? "APPROVED_REVENUE"
        : input.status === "PENDING_PAYMENT_REVIEW"
          ? "PENDING_REVENUE"
          : ["LOST", "CANCELLED"].includes(input.status)
            ? "LOST_REVENUE"
            : "EXPECTED_REVENUE";
    record.approved_revenue_brl =
      input.status === "APPROVED_MANUAL" ? record.expected_revenue_brl : 0;
    record.pending_revenue_brl =
      input.status === "PENDING_PAYMENT_REVIEW" || input.status === "FORECAST"
        ? record.expected_revenue_brl
        : 0;
    record.lost_revenue_brl = ["LOST", "CANCELLED"].includes(input.status)
      ? record.expected_revenue_brl
      : 0;
    record.received_revenue_brl = 0;
  }
  const nextManualAction = input.next_manual_action ?? input.nextManualAction;
  if (typeof nextManualAction === "string" && nextManualAction.trim())
    record.next_manual_action = nextManualAction.trim();
  if (typeof input.manualNotes === "string" && input.manualNotes.trim())
    record.manualNotes = input.manualNotes.trim();
  record.updatedAt = new Date().toISOString();
  record.updated_at = record.updatedAt;
  Object.assign(record, ledgerSafetyBoundary);
  persistLedgerPreviews();
  return clone(record);
}

export function createOrUpdateLedgerPreviewFromCloseLoop(
  closeLoopId: string,
): LedgerPreviewRecord | null {
  const loop = getRevenueCloseLoopById(closeLoopId);
  if (!loop) return null;
  const existing = previews.find(
    (preview) =>
      preview.source === "REVENUE_CLOSE_LOOP" &&
      preview.closeLoopId === closeLoopId,
  );
  if (existing) {
    const updated = decorateCloseLoopPreview(existing, loop);
    Object.assign(existing, updated);
    persistLedgerPreviews();
    return clone(existing);
  }
  const base = buildLedgerPreview(
    {
      title: `Fechamento R$100 · ${loop.id}`,
      clientLabel:
        loop.prospectId ??
        loop.offerId ??
        loop.paymentRequestId ??
        "Revenue Close Loop",
      opportunityId:
        loop.prospectId ?? loop.offerId ?? loop.paymentRequestId ?? loop.id,
      taskId: loop.paymentRequestId ?? null,
      releasePreviewId: `revenue_close_loop_${loop.id}`,
      estimatedRevenueBrl: loop.targetAmountBrl,
      readinessScore: loop.operatorConfirmedRevenueId ? 80 : 35,
      financialReadinessState: loop.operatorConfirmedRevenueId
        ? "READY_MANUAL"
        : "NEEDS_REVIEW",
      manualNotes: loop.notes,
    },
    nextId(),
    new Date().toISOString(),
  );
  const record = decorateCloseLoopPreview(base, loop);
  record.createdAt = base.createdAt;
  record.created_at = base.created_at;
  previews.unshift(record);
  persistLedgerPreviews();
  return clone(record);
}

export function updateLedgerPreviewManualStatus(
  id: string,
  status: LedgerPreviewStatus,
  notes?: string,
): LedgerPreviewRecord | null {
  if (!manualPreviewStatuses.includes(status))
    throw new Error("LEDGER_PREVIEW_STATUS_NOT_ALLOWED");
  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;
  record.previewStatus = status;
  record.status =
    status === "ARCHIVED_MANUAL"
      ? "ARCHIVED"
      : status === "OPERATOR_CONFIRMED_MANUAL"
        ? "APPROVED_MANUAL"
        : status === "NEEDS_MANUAL_PROOF"
          ? "PENDING_PAYMENT_REVIEW"
          : "FORECAST";
  record.manualProofStatus =
    status === "OPERATOR_CONFIRMED_MANUAL"
      ? "OPERATOR_CONFIRMED"
      : status === "NEEDS_MANUAL_PROOF"
        ? "OPERATOR_REVIEWED"
        : (record.manualProofStatus ?? "NOT_ATTACHED");
  record.notes = notes ?? record.notes;
  record.timeline = [
    ...(record.timeline ?? []),
    event("LEDGER_PREVIEW_STATUS_UPDATED_MANUALLY", notes, { status }),
  ];
  record.updatedAt = new Date().toISOString();
  record.updated_at = record.updatedAt;
  Object.assign(record, ledgerSafetyBoundary, {
    providerVerified: false,
    paymentGuaranteed: false,
    realRevenueClaimed: false,
    providerVerifiedRevenueBrl: 0,
  });
  persistLedgerPreviews();
  return clone(record);
}

function sum(
  field: keyof Pick<
    LedgerPreviewRecord,
    | "expected_revenue_brl"
    | "approved_revenue_brl"
    | "pending_revenue_brl"
    | "lost_revenue_brl"
  >,
): number {
  return previews
    .filter((record) => record.status !== "ARCHIVED")
    .reduce((total, record) => total + record[field], 0);
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
    forecastRevenueBrl: estimated,
    operatorConfirmedRevenueBrl: approved,
    providerVerifiedRevenueBrl: 0,
    pendingRevenueBrl: pending,
    lostRevenueBrl: lost,
    ledgerPreviewCount: previews.length,
    approved_revenue_brl: approved,
    pending_revenue_brl: pending,
    received_revenue_brl: 0,
    lost_revenue_brl: lost,
    active_pipeline_brl: approved + pending,
    approval_conversion_rate:
      estimated === 0 ? 0 : Math.round((approved / estimated) * 100),
    receipt_conversion_rate: 0,
    loss_rate: estimated === 0 ? 0 : Math.round((lost / estimated) * 100),
    average_accounting_readiness:
      active.length === 0
        ? 0
        : Math.round(
            active.reduce(
              (total, record) => total + record.accounting_readiness_score,
              0,
            ) / active.length,
          ),
    allowedStatuses: [...allowedLedgerStatuses],
    allowedRevenueClasses: [
      "EXPECTED_REVENUE",
      "APPROVED_REVENUE",
      "PENDING_REVENUE",
      "LOST_REVENUE",
    ],
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
  persistLedgerPreviews();
}
