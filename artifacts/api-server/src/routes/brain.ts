import { Router, type IRouter, type Response } from "express";
import { buildRevenueOfferPacks } from "../brain/minimumRevenueSprintPlanner";
import {
  createMinimumRevenueSprint,
  getMinimumRevenueSprintById,
  listMinimumRevenueSprints,
  updateMinimumRevenueSprintStatus,
} from "../brain/minimumRevenueSprintStore";
import {
  RevenueSprintStatus,
  previewSafetyFlags,
} from "../brain/commandBrainTypes";
import { buildConnectorBrainSummary } from "../connectors/connectorBrainSummary";
import { buildGitHubDemandBrainSummary } from "../radar/githubDemandBrainSummary";
import { buildGitHubDemandConversionBrainSummary } from "../radar/githubDemandConversionBrainSummary";
import { getGitHubDemandExecutionBrainSummary } from "../radar/githubDemandExecutionBrainSummary";
import { buildOperatorDeliveryWorkspaceBrainSummary } from "../deliveryWorkspace/operatorDeliveryWorkspaceBrainSummary";
import { buildManualPaymentBrainSummary } from "../manualPayment/manualPaymentBrainSummary";
import { buildClientOfferBrainSummary } from "../clientOffer/clientOfferBrainSummary";
import { buildManualProspectBrainSummary } from "../prospect/manualProspectBrainSummary";
import { buildCloseLoopSummary } from "../revenueCloseLoop/revenueCloseLoopBuilder";
import { getLedgerStatusSummary } from "../ledger/ledgerStore";

const router: IRouter = Router();
const boundaries = [
  "PREVIEW_ONLY",
  "manualExecutionRequired",
  "paymentProviderApiDisabled",
  "externalContactAutomationDisabled",
  "realRevenueNotGuaranteed",
  "operatorApprovalRequired",
  "inMemoryOnly",
];

router.use("/brain", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
function safeError(res: Response, error: unknown, statusCode = 400) {
  const message =
    error instanceof Error ? error.message : "COMMAND_BRAIN_REQUEST_FAILED";
  res
    .status(statusCode)
    .json({
      success: false,
      data: { ...previewSafetyFlags, boundaries },
      error: message,
      message,
    });
}
const summary = () => {
  const sprints = listMinimumRevenueSprints();
  return {
    ...previewSafetyFlags,
    status: "COMMAND_BRAIN_REVENUE_SPRINT_P0_PREVIEW_READY" as const,
    sprintCount: sprints.length,
    activeSprintCount: sprints.filter((s) =>
      [
        "PLANNED",
        "ACTIVE_MANUAL",
        "WAITING_PAYMENT_MANUAL",
        "SUBMISSION_PREPARED",
      ].includes(s.status),
    ).length,
    targetAmountBrl: 100,
    fastestRoute: "DIRECT_PIX_OFFER" as const,
    routes: ["DIRECT_PIX_OFFER", "WEB3_TASK_ATTEMPT", "AGENT_ECONOMY_AUDIT"],
    boundaries,
  };
};

router.get("/brain/status", (_req, res) =>
  res.json({
    success: true,
    data: {
      ...summary(),
      layer: "GXEON Command Brain P0",
      route: "/ops/brain",
      secondaryRoute: "/ops/revenue-sprint",
      connectorReadiness: buildConnectorBrainSummary(),
      githubDemand: buildGitHubDemandBrainSummary(),
      githubDemandConversion: buildGitHubDemandConversionBrainSummary(),
      githubDemandExecution: getGitHubDemandExecutionBrainSummary(),
      deliveryWorkspace: buildOperatorDeliveryWorkspaceBrainSummary(),
      manualPayment: buildManualPaymentBrainSummary(),
      clientOfferSend: buildClientOfferBrainSummary(),
      manualProspects: buildManualProspectBrainSummary(),
      revenueCloseLoop: buildCloseLoopSummary(),
      ledger: getLedgerStatusSummary(),
      operatorConfirmedRevenueBrl:
        buildCloseLoopSummary().operatorConfirmedRevenueBrl,
      ledgerPreviewCount: getLedgerStatusSummary().ledgerPreviewCount,
      providerVerifiedRevenueBrl: 0,
      realRevenueClaimed: false,
    },
  }),
);
router.get("/brain/revenue-sprint/status", (_req, res) =>
  res.json({ success: true, data: summary() }),
);
router.get("/brain/revenue-sprint/offer-packs", (_req, res) =>
  res.json({
    success: true,
    data: {
      ...previewSafetyFlags,
      offerPacks: buildRevenueOfferPacks(),
      count: buildRevenueOfferPacks().length,
      boundaries,
    },
  }),
);
router.get("/brain/revenue-sprint/sprints", (_req, res) =>
  res.json({
    success: true,
    data: {
      ...previewSafetyFlags,
      sprints: listMinimumRevenueSprints(),
      count: listMinimumRevenueSprints().length,
      boundaries,
    },
  }),
);
router.get("/brain/revenue-sprint/sprints/:id", (req, res) => {
  const sprint = getMinimumRevenueSprintById(req.params.id);
  if (!sprint)
    return safeError(res, new Error("MINIMUM_REVENUE_SPRINT_NOT_FOUND"), 404);
  return res.json({
    success: true,
    data: { ...previewSafetyFlags, sprint, boundaries },
  });
});
router.post("/brain/revenue-sprint/start", (req, res) => {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: {
          ...previewSafetyFlags,
          sprint: createMinimumRevenueSprint(req.body ?? {}),
          boundaries,
        },
      });
  } catch (error) {
    safeError(res, error);
  }
});
router.patch("/brain/revenue-sprint/sprints/:id/status", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ...previewSafetyFlags,
        sprint: updateMinimumRevenueSprintStatus(
          req.params.id,
          req.body?.status as RevenueSprintStatus,
        ),
        providerVerified: false,
        boundaries,
      },
    });
  } catch (error) {
    safeError(
      res,
      error,
      error instanceof Error && error.message.includes("NOT_FOUND") ? 404 : 400,
    );
  }
});
export default router;
