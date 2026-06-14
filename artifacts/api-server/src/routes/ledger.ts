import { Router, type IRouter, type Response } from "express";
import { createLedgerPreview, getLedgerPreviewById, getLedgerStatusSummary, listLedgerPreviews, updateLedgerPreviewState } from "../ledger/ledgerStore";
import { ledgerSafetyBoundary } from "../ledger/ledgerBuilder";
import type { LedgerCreateInput, LedgerStateUpdateInput } from "../ledger/ledgerTypes";
import { buildManualPaymentBrainSummary } from "../manualPayment/manualPaymentBrainSummary";
import { buildClientOfferBrainSummary } from "../clientOffer/clientOfferBrainSummary";

const router: IRouter = Router();

router.use("/ledger", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "LEDGER_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: ledgerSafetyBoundary, error: message, message });
}

function parseCreateInput(body: unknown): LedgerCreateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    id: typeof payload.id === "string" ? payload.id : undefined,
    title: typeof payload.title === "string" ? payload.title : undefined,
    clientLabel: typeof payload.clientLabel === "string" ? payload.clientLabel : undefined,
    opportunityId: typeof payload.opportunityId === "string" ? payload.opportunityId : typeof payload.opportunity_id === "string" ? payload.opportunity_id : undefined,
    taskId: typeof payload.taskId === "string" || payload.taskId === null ? payload.taskId : typeof payload.task_id === "string" || payload.task_id === null ? payload.task_id : undefined,
    executionPreviewId: typeof payload.executionPreviewId === "string" ? payload.executionPreviewId : typeof payload.execution_id === "string" ? payload.execution_id : undefined,
    validationPreviewId: typeof payload.validationPreviewId === "string" ? payload.validationPreviewId : typeof payload.validation_id === "string" ? payload.validation_id : undefined,
    releasePreviewId: typeof payload.releasePreviewId === "string" ? payload.releasePreviewId : typeof payload.release_id === "string" ? payload.release_id : typeof payload.id === "string" ? payload.id : undefined,
    estimatedRevenueBrl: typeof payload.estimatedRevenueBrl === "number" ? payload.estimatedRevenueBrl : typeof payload.estimated_revenue_brl === "number" ? payload.estimated_revenue_brl : undefined,
    readinessScore: typeof payload.readinessScore === "number" ? payload.readinessScore : typeof payload.readiness_score === "number" ? payload.readiness_score : undefined,
    releaseStatus: typeof payload.releaseStatus === "string" ? payload.releaseStatus : typeof payload.release_status === "string" ? payload.release_status : undefined,
    financialReadinessState: typeof payload.financialReadinessState === "string" ? payload.financialReadinessState : typeof payload.financial_readiness_state === "string" ? payload.financial_readiness_state : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
    nextManualAction: typeof payload.nextManualAction === "string" ? payload.nextManualAction : typeof payload.next_manual_action === "string" ? payload.next_manual_action : undefined,
  };
}

function parseStateUpdate(body: unknown): LedgerStateUpdateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    status: typeof payload.status === "string" ? payload.status as LedgerStateUpdateInput["status"] : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
    next_manual_action: typeof payload.next_manual_action === "string" ? payload.next_manual_action : undefined,
    nextManualAction: typeof payload.nextManualAction === "string" ? payload.nextManualAction : undefined,
  };
}

router.get("/ledger/status", (_req, res) => {
  try {
    res.json({ success: true, data: { ...getLedgerStatusSummary(), manualPayment: buildManualPaymentBrainSummary(), clientOfferSend: buildClientOfferBrainSummary(), realRevenueClaimed: false, providerVerified: false } });
  } catch (error) {
    safeError(res, error, "LEDGER_STATUS_FAILED");
  }
});

router.get("/ledger/previews", (_req, res) => {
  try {
    res.json({ success: true, data: { ...getLedgerStatusSummary(), ledgerPreviews: listLedgerPreviews() } });
  } catch (error) {
    safeError(res, error, "LEDGER_LIST_FAILED");
  }
});

router.get("/ledger/previews/:id", (req, res) => {
  try {
    const ledgerPreview = getLedgerPreviewById(req.params.id);
    if (!ledgerPreview) {
      res.status(404).json({ success: false, data: ledgerSafetyBoundary, error: "LEDGER_PREVIEW_NOT_FOUND", message: "LEDGER_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...ledgerSafetyBoundary, ledgerPreview } });
  } catch (error) {
    safeError(res, error, "LEDGER_GET_FAILED");
  }
});

router.post("/ledger/previews", (req, res) => {
  try {
    const ledgerPreview = createLedgerPreview(parseCreateInput(req.body));
    res.status(201).json({ success: true, data: { ...ledgerSafetyBoundary, ledgerPreview } });
  } catch (error) {
    safeError(res, error, "LEDGER_CREATE_FAILED");
  }
});

router.patch("/ledger/previews/:id/state", (req, res) => {
  try {
    const ledgerPreview = updateLedgerPreviewState(req.params.id, parseStateUpdate(req.body));
    if (!ledgerPreview) {
      res.status(404).json({ success: false, data: ledgerSafetyBoundary, error: "LEDGER_PREVIEW_NOT_FOUND", message: "LEDGER_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...ledgerSafetyBoundary, ledgerPreview } });
  } catch (error) {
    safeError(res, error, "LEDGER_STATE_UPDATE_FAILED");
  }
});

export default router;
