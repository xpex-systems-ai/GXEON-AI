import { Router, type IRouter } from "express";
import { getMonetizationOffersResponse, getMonetizationRuntimeStatus } from "../monetization/monetizationRuntime";
import { buildConnectorBrainSummary } from "../connectors/connectorBrainSummary";
import { buildGitHubDemandBrainSummary } from "../radar/githubDemandBrainSummary";
import { buildGitHubDemandConversionBrainSummary } from "../radar/githubDemandConversionBrainSummary";
import { getGitHubDemandExecutionBrainSummary } from "../radar/githubDemandExecutionBrainSummary";
import { buildOperatorDeliveryWorkspaceBrainSummary } from "../deliveryWorkspace/operatorDeliveryWorkspaceBrainSummary";
import { buildManualPaymentBrainSummary } from "../manualPayment/manualPaymentBrainSummary";
import { buildClientOfferBrainSummary } from "../clientOffer/clientOfferBrainSummary";
import { buildManualProspectBrainSummary } from "../prospect/manualProspectBrainSummary";

const router: IRouter = Router();

router.use("/monetization", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/monetization/status", (_req, res) => {
  res.json({ success: true, data: { ...getMonetizationRuntimeStatus(), connectorReadiness: buildConnectorBrainSummary(), githubDemand: buildGitHubDemandBrainSummary(), githubDemandConversion: buildGitHubDemandConversionBrainSummary(), githubDemandExecution: getGitHubDemandExecutionBrainSummary(), deliveryWorkspace: buildOperatorDeliveryWorkspaceBrainSummary(), manualPayment: buildManualPaymentBrainSummary(), clientOfferSend: buildClientOfferBrainSummary(), manualProspects: buildManualProspectBrainSummary() } });
});

router.get("/monetization/offers", (_req, res) => {
  res.json({ success: true, data: getMonetizationOffersResponse() });
});

export default router;
