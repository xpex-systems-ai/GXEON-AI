import { Router, type IRouter, type Response } from "express";
import { createBrokerDecisionPreview, getBrokerDecisionById, listBrokerDecisions } from "../broker/brokerDecisionStore";
import { getBrokerStatus } from "../broker/brokerRoutingEngine";
import type { BrokerInputTask } from "../broker/brokerTypes";

const router: IRouter = Router();

router.use("/broker", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "BROKER_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: { mode: "PREVIEW_ONLY", approvalRequired: true, executionDisabled: true, autonomousExecution: false, externalContact: false, githubWrites: false, paymentAction: false }, error: message, message });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function parseBrokerInput(body: unknown): BrokerInputTask {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "Untitled broker route preview";
  return {
    taskId: typeof payload.taskId === "string" ? payload.taskId : null,
    title,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    category: typeof payload.category === "string" ? payload.category : undefined,
    requiredConnectors: stringArray(payload.requiredConnectors),
    forbiddenActions: stringArray(payload.forbiddenActions),
    approvalGates: stringArray(payload.approvalGates),
    riskFlags: stringArray(payload.riskFlags),
  };
}

router.get("/broker/status", (_req, res) => {
  try {
    res.json({ success: true, data: getBrokerStatus() });
  } catch (error) {
    safeError(res, error, "BROKER_STATUS_FAILED");
  }
});

router.get("/broker/decisions", (_req, res) => {
  try {
    res.json({ success: true, data: { mode: "PREVIEW_ONLY", decisions: listBrokerDecisions(), approvalRequired: true, executionDisabled: true, autonomousExecution: false, externalContact: false, githubWrites: false, paymentAction: false } });
  } catch (error) {
    safeError(res, error, "BROKER_LIST_DECISIONS_FAILED");
  }
});

router.get("/broker/decisions/:id", (req, res) => {
  try {
    const decision = getBrokerDecisionById(req.params.id);
    if (!decision) {
      res.status(404).json({ success: false, data: { mode: "PREVIEW_ONLY", approvalRequired: true, executionDisabled: true, autonomousExecution: false, externalContact: false, githubWrites: false, paymentAction: false }, error: "BROKER_DECISION_NOT_FOUND", message: "BROKER_DECISION_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: { mode: "PREVIEW_ONLY", decision, approvalRequired: true, executionDisabled: true, autonomousExecution: false, externalContact: false, githubWrites: false, paymentAction: false } });
  } catch (error) {
    safeError(res, error, "BROKER_GET_DECISION_FAILED");
  }
});

router.post("/broker/preview-route", (req, res) => {
  try {
    const decision = createBrokerDecisionPreview(parseBrokerInput(req.body));
    res.status(201).json({
      success: true,
      data: {
        decisionId: decision.id,
        mode: decision.mode,
        recommendedAgents: decision.recommendedAgents,
        riskEnergy: decision.riskEnergy,
        safetyGrade: decision.safetyGrade,
        blockedActions: decision.blockedActions,
        approvalGates: decision.approvalGates,
        executionDisabled: decision.executionDisabled,
        approvalRequired: decision.approvalRequired,
        autonomousExecution: decision.autonomousExecution,
        externalContact: decision.externalContact,
        githubWrites: decision.githubWrites,
        paymentAction: decision.paymentAction,
        decision,
      },
    });
  } catch (error) {
    safeError(res, error, "BROKER_PREVIEW_ROUTE_FAILED");
  }
});

export default router;
