import { Router, type IRouter, type Response } from "express";
import { createDeliveryValidationPreview, getDeliveryValidationPreviewById, getDeliveryValidationStatus, listDeliveryValidationPreviews, updateDeliveryValidationState } from "../validation/deliveryValidationStore";
import type { DeliveryValidationCreateInput, DeliveryValidationStateUpdateInput } from "../validation/deliveryValidationTypes";

const router: IRouter = Router();

const safetyData = {
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

router.use("/validation", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "DELIVERY_VALIDATION_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: safetyData, error: message, message });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function parseStringOrObjectArray(value: unknown): DeliveryValidationCreateInput["evidenceRequirements"] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" || (item && typeof item === "object")) as DeliveryValidationCreateInput["evidenceRequirements"];
}

function parseCreateInput(body: unknown): DeliveryValidationCreateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    executionPreviewId: typeof payload.executionPreviewId === "string" ? payload.executionPreviewId : typeof payload.id === "string" ? payload.id : undefined,
    brokerDecisionId: typeof payload.brokerDecisionId === "string" ? payload.brokerDecisionId : undefined,
    taskId: typeof payload.taskId === "string" || payload.taskId === null ? payload.taskId : undefined,
    title: typeof payload.title === "string" ? payload.title : undefined,
    riskEnergy: typeof payload.riskEnergy === "number" ? payload.riskEnergy : undefined,
    blockedActions: stringArray(payload.blockedActions),
    evidenceRequirements: parseStringOrObjectArray(payload.evidenceRequirements),
    checklist: parseStringOrObjectArray(payload.checklist),
    rollbackPlan: stringArray(payload.rollbackPlan),
    operatorNextAction: typeof payload.operatorNextAction === "string" ? payload.operatorNextAction : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
    attachedEvidenceLabels: stringArray(payload.attachedEvidenceLabels),
  };
}

function parseStateUpdate(body: unknown): DeliveryValidationStateUpdateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    validationStatus: typeof payload.validationStatus === "string" ? payload.validationStatus as DeliveryValidationStateUpdateInput["validationStatus"] : undefined,
    approvalState: typeof payload.approvalState === "string" ? payload.approvalState as DeliveryValidationStateUpdateInput["approvalState"] : undefined,
    evidenceState: typeof payload.evidenceState === "string" ? payload.evidenceState as DeliveryValidationStateUpdateInput["evidenceState"] : undefined,
    rejectionState: typeof payload.rejectionState === "string" ? payload.rejectionState as DeliveryValidationStateUpdateInput["rejectionState"] : undefined,
    revisionState: typeof payload.revisionState === "string" ? payload.revisionState as DeliveryValidationStateUpdateInput["revisionState"] : undefined,
    rejectionReason: typeof payload.rejectionReason === "string" ? payload.rejectionReason : undefined,
    revisionReason: typeof payload.revisionReason === "string" ? payload.revisionReason : undefined,
    nextManualGate: typeof payload.nextManualGate === "string" ? payload.nextManualGate : undefined,
    manualNotes: typeof payload.manualNotes === "string" ? payload.manualNotes : undefined,
    evidenceUpdates: Array.isArray(payload.evidenceUpdates) ? payload.evidenceUpdates as DeliveryValidationStateUpdateInput["evidenceUpdates"] : undefined,
  };
}

router.get("/validation/status", (_req, res) => {
  try {
    res.json({ success: true, data: getDeliveryValidationStatus() });
  } catch (error) {
    safeError(res, error, "DELIVERY_VALIDATION_STATUS_FAILED");
  }
});

router.get("/validation/previews", (_req, res) => {
  try {
    res.json({ success: true, data: { ...safetyData, validationPreviews: listDeliveryValidationPreviews() } });
  } catch (error) {
    safeError(res, error, "DELIVERY_VALIDATION_LIST_FAILED");
  }
});

router.get("/validation/previews/:id", (req, res) => {
  try {
    const validationPreview = getDeliveryValidationPreviewById(req.params.id);
    if (!validationPreview) {
      res.status(404).json({ success: false, data: safetyData, error: "VALIDATION_PREVIEW_NOT_FOUND", message: "VALIDATION_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...safetyData, validationPreview } });
  } catch (error) {
    safeError(res, error, "DELIVERY_VALIDATION_GET_FAILED");
  }
});

router.post("/validation/previews", (req, res) => {
  try {
    const validationPreview = createDeliveryValidationPreview(parseCreateInput(req.body));
    res.status(201).json({ success: true, data: { ...safetyData, validationPreview } });
  } catch (error) {
    safeError(res, error, "DELIVERY_VALIDATION_CREATE_FAILED");
  }
});

router.patch("/validation/previews/:id/state", (req, res) => {
  try {
    const validationPreview = updateDeliveryValidationState(req.params.id, parseStateUpdate(req.body));
    if (!validationPreview) {
      res.status(404).json({ success: false, data: safetyData, error: "VALIDATION_PREVIEW_NOT_FOUND", message: "VALIDATION_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...safetyData, validationPreview } });
  } catch (error) {
    safeError(res, error, "DELIVERY_VALIDATION_STATE_UPDATE_FAILED");
  }
});

export default router;
