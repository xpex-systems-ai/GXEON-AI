import { Router, type IRouter, type Response } from "express";
import { getGrokBuilderPreparationStatus, getHomeCenterAgentPermissions, getHomeCenterAgentReadinessStatus, getHomeCenterAgentRegistry } from "../agents/homeCenterAgentRegistry";

const router: IRouter = Router();

router.use("/agents/home-center", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "HOME_CENTER_AGENTS_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, error: message, message });
}

router.get("/agents/home-center/status", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentReadinessStatus() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_STATUS_FAILED");
  }
});

router.get("/agents/home-center/registry", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentRegistry() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_REGISTRY_FAILED");
  }
});

router.get("/agents/home-center/permissions", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentPermissions() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_PERMISSIONS_FAILED");
  }
});

router.get("/agents/home-center/grok-readiness", (_req, res) => {
  try {
    res.json({ success: true, data: getGrokBuilderPreparationStatus() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_GROK_READINESS_FAILED");
  }
});

router.use("/agents/home-center", (_req, res) => {
  res.status(404).json({ success: false, error: "HOME_CENTER_AGENTS_ROUTE_NOT_FOUND", message: "HOME_CENTER_AGENTS_ROUTE_NOT_FOUND" });
});

export default router;
