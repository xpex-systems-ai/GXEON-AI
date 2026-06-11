import { Router, type IRouter, type Response } from "express";
import { getOpportunityById } from "../opportunities/opportunityInbox";
import { createTaskFromOpportunity, getTaskById, getTaskQueueCounts, getTaskQueueReadinessStatus, listTasks, updateTaskStatus } from "../tasks/taskQueueStore";
import type { CreateTaskFromOpportunityRequest } from "../tasks/taskQueueTypes";

const router: IRouter = Router();

router.use("/tasks", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "TASK_QUEUE_REQUEST_FAILED", statusCode?: number) {
  const message = error instanceof Error ? error.message : fallback;
  const status = statusCode ?? (message === "TASK_NOT_FOUND" || message === "OPPORTUNITY_NOT_FOUND" ? 404 : message === "TASK_ALREADY_EXISTS_FOR_OPPORTUNITY" ? 409 : 400);
  res.status(status).json({ success: false, error: message, message });
}

function requireOperatorConfirmed(body: unknown) {
  if ((body as { operatorConfirmed?: boolean } | undefined)?.operatorConfirmed !== true) throw new Error("OPERATOR_CONFIRMATION_REQUIRED");
}

router.get("/tasks/status", (_req, res) => {
  try {
    res.json({ success: true, data: getTaskQueueReadinessStatus() });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_STATUS_FAILED", 500);
  }
});

router.get("/tasks", (_req, res) => {
  try {
    res.json({ success: true, data: { tasks: listTasks(), counts: getTaskQueueCounts() } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_LIST_FAILED", 500);
  }
});

router.get("/tasks/:id", (req, res) => {
  try {
    const task = getTaskById(req.params.id);
    if (!task) throw new Error("TASK_NOT_FOUND");
    res.json({ success: true, data: { task } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_GET_FAILED");
  }
});

router.post("/tasks/from-opportunity/:opportunityId", (req, res) => {
  try {
    const opportunity = getOpportunityById(req.params.opportunityId);
    if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
    const task = createTaskFromOpportunity(opportunity, (req.body ?? {}) as CreateTaskFromOpportunityRequest);
    res.json({ success: true, data: { task } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_CREATE_FAILED");
  }
});

router.post("/tasks/:id/approve-manual-execution", (req, res) => {
  try {
    requireOperatorConfirmed(req.body);
    const task = updateTaskStatus(req.params.id, "APPROVED_FOR_MANUAL_EXECUTION");
    res.json({ success: true, data: { task, note: "Manual execution approved internally; no autonomous execution occurred." } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_APPROVE_FAILED");
  }
});

router.post("/tasks/:id/block", (req, res) => {
  try {
    const task = updateTaskStatus(req.params.id, "BLOCKED");
    res.json({ success: true, data: { task, note: "Task blocked internally; no external action occurred." } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_BLOCK_FAILED");
  }
});

router.post("/tasks/:id/cancel", (req, res) => {
  try {
    const task = updateTaskStatus(req.params.id, "CANCELLED");
    res.json({ success: true, data: { task, note: "Task cancelled internally; no external action occurred." } });
  } catch (error) {
    safeError(res, error, "TASK_QUEUE_CANCEL_FAILED");
  }
});

router.use("/tasks", (_req, res) => {
  res.status(404).json({ success: false, error: "TASK_QUEUE_ROUTE_NOT_FOUND", message: "TASK_QUEUE_ROUTE_NOT_FOUND" });
});

export default router;
