import { Router, type IRouter, type Response } from "express";
import { generateEvidencePlan } from "../opportunities/evidencePlanEngine";
import { createOpportunityFromGitHubPreview, createOpportunityFromManualPreview, getOpportunityById, getOpportunityInboxStatus, listOpportunities, updateOpportunityStatus } from "../opportunities/opportunityInbox";
import type { OpportunityStatus } from "../opportunities/opportunityTypes";
import { generateProposalPreview } from "../opportunities/proposalPreviewEngine";
import { generateTaskPreview } from "../opportunities/taskPreviewEngine";

const router: IRouter = Router();

router.use("/opportunities", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function requireOpportunity(id: string, res: Response) {
  const opportunity = getOpportunityById(id);
  if (!opportunity) {
    res.status(404).json({ success: false, error: "OPPORTUNITY_NOT_FOUND", message: "OPPORTUNITY_NOT_FOUND" });
    return null;
  }
  return opportunity;
}

function requireQualifiedForPreview(status: OpportunityStatus) {
  if (!["QUALIFIED", "PROPOSAL_DRAFTED", "TASK_READY", "EVIDENCE_READY"].includes(status)) throw new Error("OPPORTUNITY_QUALIFICATION_REQUIRED");
}

function safeError(res: Response, error: unknown, fallback = "OPPORTUNITY_REQUEST_FAILED", statusCode?: number) {
  const message = error instanceof Error ? error.message : fallback;
  const status = statusCode ?? (message === "OPPORTUNITY_NOT_FOUND" ? 404 : 400);
  res.status(status).json({ success: false, error: message, message });
}

router.get("/opportunities/status", (_req, res) => {
  try {
    res.json({ success: true, data: getOpportunityInboxStatus() });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_STATUS_FAILED", 500);
  }
});

router.get("/opportunities", (_req, res) => {
  try {
    res.json({ success: true, data: { opportunities: listOpportunities(), counts: getOpportunityInboxStatus().counts } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_LIST_FAILED", 500);
  }
});

router.get("/opportunities/:id", (req, res) => {
  try {
    const opportunity = requireOpportunity(req.params.id, res);
    if (!opportunity) return;
    res.json({ success: true, data: { opportunity } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_GET_FAILED", 500);
  }
});

router.post("/opportunities/from-radar-manual-preview", (req, res) => {
  try {
    const opportunity = createOpportunityFromManualPreview(req.body ?? {});
    res.json({ success: true, data: { opportunity } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_MANUAL_CREATE_FAILED");
  }
});

router.post("/opportunities/from-radar-github-preview", (req, res) => {
  try {
    const opportunity = createOpportunityFromGitHubPreview(req.body ?? {});
    res.json({ success: true, data: { opportunity } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_GITHUB_CREATE_FAILED");
  }
});

router.post("/opportunities/:id/qualify", (req, res) => {
  try {
    const opportunity = updateOpportunityStatus(req.params.id, "QUALIFIED");
    res.json({ success: true, data: { opportunity } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_QUALIFY_FAILED");
  }
});

router.post("/opportunities/:id/status", (req, res) => {
  try {
    const nextStatus = (req.body as { status?: OpportunityStatus } | undefined)?.status;
    if (!nextStatus) throw new Error("OPPORTUNITY_STATUS_REQUIRED");
    const opportunity = updateOpportunityStatus(req.params.id, nextStatus);
    res.json({ success: true, data: { opportunity } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_STATUS_UPDATE_FAILED");
  }
});

router.post("/opportunities/:id/proposal-preview", (req, res) => {
  try {
    const opportunity = requireOpportunity(req.params.id, res);
    if (!opportunity) return;
    requireQualifiedForPreview(opportunity.status);
    const proposal = generateProposalPreview(opportunity);
    const updated = opportunity.status === "QUALIFIED" ? updateOpportunityStatus(opportunity.id, "PROPOSAL_DRAFTED") : opportunity;
    res.json({ success: true, data: { proposal, opportunity: updated, mode: "DRAFT_ONLY" } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_PROPOSAL_PREVIEW_FAILED");
  }
});

router.post("/opportunities/:id/task-preview", (req, res) => {
  try {
    const opportunity = requireOpportunity(req.params.id, res);
    if (!opportunity) return;
    requireQualifiedForPreview(opportunity.status);
    const task = generateTaskPreview(opportunity);
    const updated = opportunity.status === "QUALIFIED" || opportunity.status === "PROPOSAL_DRAFTED" ? updateOpportunityStatus(opportunity.id, "TASK_READY") : opportunity;
    res.json({ success: true, data: { task, opportunity: updated, mode: "PREVIEW_ONLY", taskQueue: { convertibleToInternalTask: true, createRoute: `/api/tasks/from-opportunity/${opportunity.id}`, requiresOperatorConfirmed: true, autoCreated: false, boundaries: ["Internal task only", "No execution", "No GitHub write", "No external contact", "No payment action"] } } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_TASK_PREVIEW_FAILED");
  }
});

router.post("/opportunities/:id/evidence-plan", (req, res) => {
  try {
    const opportunity = requireOpportunity(req.params.id, res);
    if (!opportunity) return;
    requireQualifiedForPreview(opportunity.status);
    const evidencePlan = generateEvidencePlan(opportunity);
    const updated = ["QUALIFIED", "PROPOSAL_DRAFTED", "TASK_READY"].includes(opportunity.status) ? updateOpportunityStatus(opportunity.id, "EVIDENCE_READY") : opportunity;
    res.json({ success: true, data: { evidencePlan, opportunity: updated, mode: "EVIDENCE_PLAN_ONLY" } });
  } catch (error) {
    safeError(res, error, "OPPORTUNITY_EVIDENCE_PLAN_FAILED");
  }
});

router.use("/opportunities", (_req, res) => {
  res.status(404).json({ success: false, error: "OPPORTUNITY_ROUTE_NOT_FOUND", message: "OPPORTUNITY_ROUTE_NOT_FOUND" });
});

export default router;
