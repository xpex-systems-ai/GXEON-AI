import { Router, type IRouter } from "express";
import { getCheckoutReadiness, getMonetizationRuntimeStatus, listLedgerPreviewEvents, listOfferTemplates, listRegisteredOffers } from "../monetization/offerRegistry";

const router: IRouter = Router();

router.get("/monetization/status", (_req, res) => {
  res.json({ success: true, data: getMonetizationRuntimeStatus() });
});

router.get("/monetization/offers", (_req, res) => {
  res.json({
    success: true,
    data: {
      registeredOffers: listRegisteredOffers(),
      templates: listOfferTemplates(),
      checkoutReadiness: getCheckoutReadiness(),
    },
  });
});

router.get("/monetization/ledger-preview", (_req, res) => {
  res.json({
    success: true,
    data: {
      events: listLedgerPreviewEvents(),
      readiness: getCheckoutReadiness(),
      boundary: "Preview endpoint only. Payment capture and ledger posting are disabled in P0.",
    },
  });
});

export default router;
