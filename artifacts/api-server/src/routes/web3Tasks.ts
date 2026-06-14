import { Router, type IRouter, type Response } from "express";
import { web3TaskSources } from "../web3Tasks/web3TaskSources";
import { createWeb3TaskPreview, getWeb3TaskPreviewById, listWeb3TaskPreviews } from "../web3Tasks/web3TaskStore";
import { prepareWeb3TaskBrokerPreview } from "../web3Tasks/web3TaskBrokerPreparation";
import { createPipelineLinkFromWeb3Preview, getPipelineLinkById, listPipelineLinks, updatePipelineLinkState } from "../web3Tasks/web3TaskPipelineStore";

const router: IRouter = Router();
const mode = "PREVIEW_ONLY" as const;

router.use("/web3-tasks", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "WEB3_TASK_RADAR_REQUEST_FAILED", statusCode = 400) {
  const message = error instanceof Error ? error.message : fallback;
  res.status(statusCode).json({ success: false, data: { mode }, error: message, message });
}

function getStatus() {
  return {
    mode,
    status: "WEB3_TASK_RADAR_P0_PREVIEW_READY" as const,
    manualFirst: true,
    walletConnectionRequired: false,
    externalSubmissionDisabled: true,
    rewardNotGuaranteed: true,
    operatorApprovalRequired: true,
    persistence: "IN_MEMORY_ONLY" as const,
    sourceCount: web3TaskSources.length,
    previewCount: listWeb3TaskPreviews().length,
    pipelineLinkCount: listPipelineLinks().length,
    boundaries: ["No wallet routes", "No external platform submission", "No reward claim", "No payment provider call", "No database persistence", "No workers or schedulers"],
  };
}

router.get("/web3-tasks/status", (_req, res) => res.json({ success: true, data: getStatus() }));
router.get("/web3-tasks/sources", (_req, res) => res.json({ success: true, data: { mode, sources: web3TaskSources } }));
router.get("/web3-tasks/previews", (_req, res) => res.json({ success: true, data: { mode, previews: listWeb3TaskPreviews(), count: listWeb3TaskPreviews().length } }));
router.get("/web3-tasks/pipeline-links", (_req, res) => res.json({ success: true, data: { mode, links: listPipelineLinks(), count: listPipelineLinks().length, manualExecutionRequired: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true } }));
router.get("/web3-tasks/pipeline-links/:id", (req, res) => {
  const link = getPipelineLinkById(req.params.id);
  if (!link) return safeError(res, new Error("WEB3_PIPELINE_LINK_NOT_FOUND"), "WEB3_PIPELINE_LINK_NOT_FOUND", 404);
  return res.json({ success: true, data: { mode, link, manualExecutionRequired: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true } });
});
router.post("/web3-tasks/pipeline-links/:id/prepare-broker-preview", (req, res) => {
  try {
    const link = getPipelineLinkById(req.params.id);
    if (!link) return safeError(res, new Error("WEB3_PIPELINE_LINK_NOT_FOUND"), "WEB3_PIPELINE_LINK_NOT_FOUND", 404);
    const brokerPreparation = prepareWeb3TaskBrokerPreview(link);
    const updated = updatePipelineLinkState(link.id, link.status, { brokerPreparation });
    res.json({ success: true, data: { mode, link: updated, brokerPreparation, manualExecutionRequired: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true } });
  } catch (error) {
    safeError(res, error, "WEB3_BROKER_PREPARATION_FAILED");
  }
});
router.get("/web3-tasks/previews/:id", (req, res) => {
  const preview = getWeb3TaskPreviewById(req.params.id);
  if (!preview) return safeError(res, new Error("WEB3_TASK_PREVIEW_NOT_FOUND"), "WEB3_TASK_PREVIEW_NOT_FOUND", 404);
  return res.json({ success: true, data: { mode, preview } });
});
router.post("/web3-tasks/manual-import", (req, res) => {
  try {
    const preview = createWeb3TaskPreview(req.body ?? {});
    res.json({ success: true, data: { mode, preview } });
  } catch (error) {
    safeError(res, error, "WEB3_TASK_MANUAL_IMPORT_FAILED");
  }
});
router.post("/web3-tasks/previews/:id/create-internal-task-preview", (req, res) => {
  try {
    const preview = getWeb3TaskPreviewById(req.params.id);
    if (!preview) return safeError(res, new Error("WEB3_TASK_PREVIEW_NOT_FOUND"), "WEB3_TASK_PREVIEW_NOT_FOUND", 404);
    const link = createPipelineLinkFromWeb3Preview(preview);
    res.status(201).json({ success: true, data: { mode, previewId: preview.id, internalTaskPreviewCreated: link.status === "QUALIFIED_FOR_TASK_QUEUE", link, opportunityPreview: link.opportunityPreview, taskPreview: link.taskPreview, manualExecutionRequired: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true } });
  } catch (error) {
    safeError(res, error, "WEB3_TASK_PIPELINE_LINK_FAILED");
  }
});

export default router;
