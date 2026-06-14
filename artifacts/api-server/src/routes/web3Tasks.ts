import { Router, type IRouter, type Response } from "express";
import { web3TaskSources } from "../web3Tasks/web3TaskSources";
import { createWeb3TaskPreview, getWeb3TaskPreviewById, listWeb3TaskPreviews } from "../web3Tasks/web3TaskStore";

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
    boundaries: ["No wallet routes", "No external platform submission", "No reward claim", "No payment provider call", "No database persistence", "No workers or schedulers"],
  };
}

router.get("/web3-tasks/status", (_req, res) => res.json({ success: true, data: getStatus() }));
router.get("/web3-tasks/sources", (_req, res) => res.json({ success: true, data: { mode, sources: web3TaskSources } }));
router.get("/web3-tasks/previews", (_req, res) => res.json({ success: true, data: { mode, previews: listWeb3TaskPreviews(), count: listWeb3TaskPreviews().length } }));
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
  const preview = getWeb3TaskPreviewById(req.params.id);
  if (!preview) return safeError(res, new Error("WEB3_TASK_PREVIEW_NOT_FOUND"), "WEB3_TASK_PREVIEW_NOT_FOUND", 404);
  res.status(202).json({ success: true, data: { mode, previewId: preview.id, internalTaskPreviewCreated: false, todo: "Task Queue requires an Opportunity Inbox record; Web3 Radar P0 keeps entries internal until the safe intake mapping is approved.", manualExecutionRequired: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true } });
});

export default router;
