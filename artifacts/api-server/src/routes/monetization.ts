import { Router, type IRouter } from "express";
import { getMonetizationOffersResponse, getMonetizationRuntimeStatus } from "../monetization/monetizationRuntime";
import { buildConnectorBrainSummary } from "../connectors/connectorBrainSummary";

const router: IRouter = Router();

router.use("/monetization", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/monetization/status", (_req, res) => {
  res.json({ success: true, data: { ...getMonetizationRuntimeStatus(), connectorReadiness: buildConnectorBrainSummary() } });
});

router.get("/monetization/offers", (_req, res) => {
  res.json({ success: true, data: getMonetizationOffersResponse() });
});

export default router;
