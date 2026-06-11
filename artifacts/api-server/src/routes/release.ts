import { Router, type IRouter, type Response } from "express";
import { createReleasePreview, getReleaseGateStatus, getReleasePreviewById, listReleasePreviews, updateReleasePreviewState } from "../release/releaseGateStore";
import { releaseGateSafetyBoundary } from "../release/releaseGateBuilder";
import type { ReleaseGateCreateInput, ReleaseGateStateUpdateInput } from "../release/releaseGateTypes";

const router: IRouter = Router();

router.use("/release", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "RELEASE_GATE_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: releaseGateSafetyBoundary, error: message, message });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function parseCreateInput(body: unknown): ReleaseGateCreateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    validationPreviewId: typeof payload.validationPreviewId === "string" ? payload.validationPreviewId : typeof payload.id === "string" ? payload.id : undefined,
    executionPreviewId: typeof payload.executionPreviewId === "string" ? payload.executionPreviewId : undefined,
    brokerDecisionId: typeof payload.brokerDecisionId === "string" ? payload.brokerDecisionId : undefined,
    taskId: typeof payload.taskId === "string" || payload.taskId === null ? payload.taskId : undefined,
    title: typeof payload.title === "string" ? payload.title : undefined,
    approvalState: typeof payload.approvalState === "string" ? payload.approvalState : undefined,
    evidenceState: typeof payload.evidenceState === "string" ? payload.evidenceState : undefined,
    validationStatus: typeof payload.validationStatus === "string" ? payload.validationStatus : undefined,
    blockedActions: stringArray(payload.blockedActions),
    acceptanceCriteria: stringArray(payload.acceptanceCriteria),
    evidenceChecklist: stringArray(payload.evidenceChecklist),
    estimatedRevenueBrl: typeof payload.estimatedRevenueBrl === "number" ? payload.estimatedRevenueBrl : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
    nextManualAction: typeof payload.nextManualAction === "string" ? payload.nextManualAction : undefined,
  };
}

function parseStateUpdate(body: unknown): ReleaseGateStateUpdateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    release_status: typeof payload.release_status === "string" ? payload.release_status as ReleaseGateStateUpdateInput["release_status"] : undefined,
    financial_readiness_state: typeof payload.financial_readiness_state === "string" ? payload.financial_readiness_state as ReleaseGateStateUpdateInput["financial_readiness_state"] : undefined,
    evidence_completeness: typeof payload.evidence_completeness === "string" ? payload.evidence_completeness as ReleaseGateStateUpdateInput["evidence_completeness"] : undefined,
    authorization_status: typeof payload.authorization_status === "string" ? payload.authorization_status as ReleaseGateStateUpdateInput["authorization_status"] : undefined,
    blocker: typeof payload.blocker === "string" ? payload.blocker : undefined,
    next_manual_action: typeof payload.next_manual_action === "string" ? payload.next_manual_action : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
  };
}

router.get("/release/status", (_req, res) => {
  try {
    res.json({ success: true, data: getReleaseGateStatus() });
  } catch (error) {
    safeError(res, error, "RELEASE_GATE_STATUS_FAILED");
  }
});

router.get("/release/previews", (_req, res) => {
  try {
    res.json({ success: true, data: { ...releaseGateSafetyBoundary, releasePreviews: listReleasePreviews() } });
  } catch (error) {
    safeError(res, error, "RELEASE_GATE_LIST_FAILED");
  }
});

router.get("/release/previews/:id", (req, res) => {
  try {
    const releasePreview = getReleasePreviewById(req.params.id);
    if (!releasePreview) {
      res.status(404).json({ success: false, data: releaseGateSafetyBoundary, error: "RELEASE_PREVIEW_NOT_FOUND", message: "RELEASE_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...releaseGateSafetyBoundary, releasePreview } });
  } catch (error) {
    safeError(res, error, "RELEASE_GATE_GET_FAILED");
  }
});

router.post("/release/previews", (req, res) => {
  try {
    const releasePreview = createReleasePreview(parseCreateInput(req.body));
    res.status(201).json({ success: true, data: { ...releaseGateSafetyBoundary, releasePreview } });
  } catch (error) {
    safeError(res, error, "RELEASE_GATE_CREATE_FAILED");
  }
});

router.patch("/release/previews/:id/state", (req, res) => {
  try {
    const releasePreview = updateReleasePreviewState(req.params.id, parseStateUpdate(req.body));
    if (!releasePreview) {
      res.status(404).json({ success: false, data: releaseGateSafetyBoundary, error: "RELEASE_PREVIEW_NOT_FOUND", message: "RELEASE_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...releaseGateSafetyBoundary, releasePreview } });
  } catch (error) {
    safeError(res, error, "RELEASE_GATE_STATE_UPDATE_FAILED");
  }
});

export default router;
