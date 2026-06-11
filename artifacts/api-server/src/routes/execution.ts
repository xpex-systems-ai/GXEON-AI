import { Router, type IRouter, type Response } from "express";
import { createExecutionPreview, getExecutionCenterStatus, getExecutionPreviewById, listExecutionPreviews, updateExecutionPreviewStatus } from "../execution/executionStore";
import type { ExecutionPreviewCreateInput, ExecutionPreviewStatus } from "../execution/executionTypes";

const router: IRouter = Router();

const safetyData = {
  mode: "PREVIEW_ONLY" as const,
  approvalRequired: true as const,
  executionDisabled: true as const,
  evidenceRequired: true as const,
  autonomousExecution: false as const,
  externalContact: false as const,
  githubWrites: false as const,
  paymentAction: false as const,
};

router.use("/execution", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "EXECUTION_CENTER_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: safetyData, error: message, message });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function parseCreateInput(body: unknown): ExecutionPreviewCreateInput {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    brokerDecisionId: typeof payload.brokerDecisionId === "string" ? payload.brokerDecisionId : undefined,
    brokerDecision: payload.brokerDecision && typeof payload.brokerDecision === "object" ? payload.brokerDecision as ExecutionPreviewCreateInput["brokerDecision"] : undefined,
    title: typeof payload.title === "string" ? payload.title : undefined,
    taskId: typeof payload.taskId === "string" || payload.taskId === null ? payload.taskId : undefined,
    recommendedAgentIds: stringArray(payload.recommendedAgentIds),
    riskEnergy: typeof payload.riskEnergy === "number" ? payload.riskEnergy : undefined,
    blockedActions: stringArray(payload.blockedActions),
    approvalGates: stringArray(payload.approvalGates),
    operatorNextAction: typeof payload.operatorNextAction === "string" ? payload.operatorNextAction : undefined,
  };
}

router.get("/execution/status", (_req, res) => {
  try {
    res.json({ success: true, data: getExecutionCenterStatus() });
  } catch (error) {
    safeError(res, error, "EXECUTION_CENTER_STATUS_FAILED");
  }
});

router.get("/execution/previews", (_req, res) => {
  try {
    res.json({ success: true, data: { ...safetyData, executionPreviews: listExecutionPreviews() } });
  } catch (error) {
    safeError(res, error, "EXECUTION_CENTER_LIST_FAILED");
  }
});

router.get("/execution/previews/:id", (req, res) => {
  try {
    const executionPreview = getExecutionPreviewById(req.params.id);
    if (!executionPreview) {
      res.status(404).json({ success: false, data: safetyData, error: "EXECUTION_PREVIEW_NOT_FOUND", message: "EXECUTION_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...safetyData, executionPreview } });
  } catch (error) {
    safeError(res, error, "EXECUTION_CENTER_GET_FAILED");
  }
});

router.post("/execution/previews", (req, res) => {
  try {
    const executionPreview = createExecutionPreview(parseCreateInput(req.body));
    res.status(201).json({ success: true, data: { ...safetyData, executionPreview } });
  } catch (error) {
    safeError(res, error, "EXECUTION_CENTER_CREATE_FAILED");
  }
});

router.patch("/execution/previews/:id/status", (req, res) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    if (typeof payload.status !== "string") {
      res.status(400).json({ success: false, data: safetyData, error: "EXECUTION_STATUS_REQUIRED", message: "EXECUTION_STATUS_REQUIRED" });
      return;
    }
    const executionPreview = updateExecutionPreviewStatus(req.params.id, payload.status as ExecutionPreviewStatus);
    if (!executionPreview) {
      res.status(404).json({ success: false, data: safetyData, error: "EXECUTION_PREVIEW_NOT_FOUND", message: "EXECUTION_PREVIEW_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { ...safetyData, executionPreview } });
  } catch (error) {
    safeError(res, error, "EXECUTION_CENTER_STATUS_UPDATE_FAILED");
  }
});

export default router;
